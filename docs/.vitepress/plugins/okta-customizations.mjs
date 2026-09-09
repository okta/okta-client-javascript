// @ts-check
import { MarkdownPageEvent } from 'typedoc-plugin-markdown';
import * as fs from 'fs';
import * as path from 'path';

/**
 * TypeDoc plugin to merge class and namespace markdown files, then collapse
 * the merged class+namespace pair into a single `<Name>/` directory.
 * @param {import('typedoc-plugin-markdown').MarkdownApplication} app
 */
export function load(app) {
  const mergedPages = new Set();
  /** @type {{name: string, classPath: string, namespaceDir: string, namespaceIndexFile: string, container: string, noMerge?: boolean, overrideTargetDir?: string}[]} */
  const pendingMoves = [];
  /** @type {{from: string, target: string}[]} */
  const pendingPathOverrides = [];
  // Must be absolute: every path derived below gets compared/joined against
  // paths built from typedoc's own (always-absolute) `page.filename`, and a
  // relative `outputDir` here would silently desync `linkMap`/`reverseMap`
  // lookups (path.resolve() treats relative inputs as relative to CWD, not
  // to this value).
  const outputDir = path.resolve(app.options.getValue('out'));
  // TypeDoc already resolves `entryPoints` to absolute paths by the time
  // plugins can read them, so this is a reliable root for `@overrideContent`
  // paths - without needing reflection.sources (disabled via disableSources).
  const srcRoot = path.resolve(String(app.options.getValue('entryPoints')[0]));

  /**
   * Resolves a reflection's own `@overridePath <path>` tag (if any) to an
   * absolute target directory, relative to `outputDir`.
   * @param {any} comment
   */
  const getOverrideTargetDir = (comment) => {
    const tag = comment?.getTag('@overridePath');
    return tag ? path.resolve(outputDir, combineCommentParts(tag.content).trim()) : null;
  };

  // Listen to the END event after each page is rendered.
  // Classes are always rendered before their same-named namespace (TS
  // requires the class declaration to precede the namespace merge), so we
  // trigger on the namespace page and merge backwards into the already
  // on-disk class file.
  app.renderer.on(MarkdownPageEvent.END, (page) => {
    // TypeDoc's markdown renderer has no built-in display rule for our
    // custom tags, so it falls back to generic rendering (a modifier tag
    // becomes `**\`Title Case\`**`, a block tag becomes `## Title Case` +
    // its content) right in the page body. Strip that now - we read
    // whatever we need from the comment model directly below, not from
    // the rendered text.
    if (typeof page.contents === 'string') {
      for (const tag of ['@overrideContent', '@overridePath', '@noNamespaceMerge']) {
        page.contents = stripLeakedTagRendering(page.contents, tag);
      }
    }

    // Let any page's generated content (summary + auto-generated member
    // tables) be fully replaced by a hand-authored markdown file - modules
    // and classes included, not just the namespace+class merge pairs below.
    // The tag's content is a path relative to the package's source root
    // (e.g. `orchestrators/HostOrchestrator/doc.md`), mirroring where the
    // reflection itself lives on disk.
    const overrideTag = page.model?.comment?.getTag('@overrideContent');
    if (overrideTag) {
      const overridePath = path.resolve(srcRoot, combineCommentParts(overrideTag.content).trim());
      if (fs.existsSync(overridePath)) {
        page.contents = fs.readFileSync(overridePath, 'utf-8');
      } else {
        console.warn(`[mergeNamespace] @overrideContent path not found: ${overridePath}`);
      }
    }

    const ownOverrideTargetDir = getOverrideTargetDir(page.model?.comment);

    if (page.model?.kind !== 4) { // ReflectionKind.Namespace
      // Not part of the namespace+class merge pipeline below - @overridePath
      // just relocates this page on its own, at endRender.
      if (ownOverrideTargetDir) {
        pendingPathOverrides.push({
          from: toRealCasing(page.filename),
          target: ownOverrideTargetDir,
        });
      }
      return;
    }

    const namespaceName = page.model.name;

    // Let either the class or the namespace opt out of *content* merging -
    // e.g. when they share a name only coincidentally (both merged into the
    // same module via @mergeModuleWith) rather than via a real TS
    // declaration merge (both declared, unrenamed, in the same source
    // file). They still get co-located (see the `noMerge` branch below),
    // just without splicing their markdown content into one page.
    const classReflection = page.model.parent?.children?.find(
      (child) => child.name === namespaceName && child.kind === 128 // ReflectionKind.Class
    );
    const noMerge = Boolean(
      page.model.comment?.hasModifier('@noNamespaceMerge') ||
      classReflection?.comment?.hasModifier('@noNamespaceMerge')
    );

    // Same dual-check as `noMerge`: either the namespace or its matched
    // class may specify where the collapsed pair should actually land,
    // overriding the auto-computed <container>/<name> target directory.
    const overrideTargetDir = ownOverrideTargetDir ?? getOverrideTargetDir(classReflection?.comment);

    // `page.filename` reflects this reflection's own (possibly differently-
    // cased) name, which can collide on-disk with an unrelated sibling
    // reflection using a different casing for the same directory (e.g. an
    // explicit `@module Flows` next to a file with no `@module` tag, whose
    // name is auto-derived from the real, lowercase source folder). Canonicalize
    // against whatever already exists on disk so every path we build from here
    // stays consistent with what the final tree walk will actually see.
    const namespaceIndexFile = toRealCasing(page.filename);
    const namespaceDir = path.dirname(namespaceIndexFile);

    // Try to find the already-rendered class file for this namespace
    const classPath = findClassFile(outputDir, page.model, namespaceName, namespaceIndexFile);
    if (!classPath || mergedPages.has(classPath)) return;

    if (noMerge) {
      // Leave both pages' content untouched - just record them for the
      // later co-location pass. `page.contents` is deliberately left alone
      // so the namespace's own index page still gets written normally.
      mergedPages.add(classPath);
      pendingMoves.push({
        name: namespaceName,
        classPath,
        namespaceDir,
        namespaceIndexFile,
        container: path.dirname(path.dirname(namespaceDir)),
        noMerge: true,
        overrideTargetDir,
      });
      return;
    }

    // Read the class content straight off disk since it was already written
    const classContent = fs.readFileSync(classPath, 'utf-8');

    // The namespace's links are relative to namespaceDir; rebase them to be
    // relative to the class's directory *before* splicing, since the merged
    // result will initially live at classPath.
    const rebasedNamespaceContent = rebaseRelativeLinks(page.contents, namespaceDir, path.dirname(classPath));

    // Merge this namespace's contents into the class content and write it back
    const merged = mergeMarkdownContent(classContent, rebasedNamespaceContent, namespaceName);
    fs.writeFileSync(classPath, merged, 'utf-8');
    mergedPages.add(classPath);

    // The namespace's own index page is now redundant
    page.contents = '';

    pendingMoves.push({
      name: namespaceName,
      classPath,
      namespaceDir,
      namespaceIndexFile,
      container: path.dirname(path.dirname(namespaceDir)),
      overrideTargetDir,
    });
  });

  // Once every page has been rendered and written to disk, collapse each
  // merged class+namespace pair from `classes/<name>.md` + `namespaces/<name>/*`
  // into a single `<name>/index.md` + `<name>/*`, then fix up every relative
  // link in the output tree (including breadcrumbs) so they still resolve.
  app.renderer.on('endRender', () => {
    const linkMap = new Map();
    const reverseMap = new Map();

    for (const move of pendingMoves) {
      collapseNamespaceIntoClassDir(move, linkMap, reverseMap);
    }

    // `@overridePath` on a page outside the merge pipeline: relocate it to
    // its custom target. A target ending in `.md` is used verbatim as the
    // destination file (e.g. for a plain class page); otherwise it's a
    // directory and the page becomes `<target>/index.md`.
    for (const { from, target } of pendingPathOverrides) {
      if (!fs.existsSync(from)) continue;
      const to = target.endsWith('.md') ? target : path.join(target, 'index.md');
      linkMap.set(from, to);
      reverseMap.set(to, from);
      moveTree(from, to);
    }

    rewriteLinksInTree(outputDir, linkMap, reverseMap);
  });
}

/**
 * Find the class markdown file corresponding to a namespace
 * @param {string} outputDir
 * @param {any} namespaceModel
 * @param {string} namespaceName
 * @param {string} namespaceFile
 */
function findClassFile(outputDir, namespaceModel, namespaceName, namespaceFile) {
  // Prefer the reflection tree: the class and namespace share a parent and
  // a name, and the class reflection's `.url` is assigned during URL mapping
  // (before any page is rendered), so it's reliable regardless of render order.
  const classReflection = namespaceModel.parent?.children?.find(
    (child) => child.name === namespaceName && child.kind === 128 // ReflectionKind.Class
  );

  if (classReflection?.url) {
    const urlPath = path.join(outputDir, classReflection.url);
    if (fs.existsSync(urlPath)) {
      // `classReflection.url` reflects this reflection's own declared name,
      // which can be cased differently than an unrelated sibling reflection
      // that resolves to the same on-disk directory on a case-insensitive
      // filesystem (see the comment on `toRealCasing`). Canonicalize so this
      // stays consistent with every other path built from `page.filename`.
      return toRealCasing(urlPath);
    }
  }

  // Fall back to common on-disk layouts, walking up from the namespace file
  const namespaceDir = path.dirname(namespaceFile);
  const baseName = path.basename(namespaceFile, '.md');
  const moduleDir = path.dirname(path.dirname(namespaceDir));

  const patterns = [
    path.join(moduleDir, 'classes', `${namespaceName}.md`),
    path.join(namespaceDir, '..', `${namespaceName}.md`),
    path.join(namespaceDir, '..', `${baseName}.md`),
  ];

  for (const pattern of patterns) {
    if (fs.existsSync(pattern)) {
      const content = fs.readFileSync(pattern, 'utf-8');
      if (content.includes('Class:') || content.includes('class ')) {
        return pattern;
      }
    }
  }

  return null;
}

/**
 * Removes TypeDoc-plugin-markdown's generic fallback rendering of a custom
 * tag from already-rendered page content: a modifier tag renders as
 * `**\`Title Case\`**` on its own line, and a block tag renders as
 * `## Title Case` followed by its (single-line, for our tags) content.
 * @param {string} content
 * @param {string} tagName tag name including the leading `@`
 */
function stripLeakedTagRendering(content, tagName) {
  const title = tagName
    .replace(/^@/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return content
    .replace(new RegExp(`\\*\\*\`${title}\`\\*\\*\\n+`), '')
    .replace(new RegExp(`## ${title}\\n\\n[^\\n]*\\n+`), '');
}

/**
 * Flattens a TSDoc comment tag's content (an array of display parts - plain
 * text, code spans, and inline tags like `{@link}`) into a single string.
 * Every part kind carries a `.text` field, so this is a plain concatenation;
 * inline tags are rendered as their raw text rather than being re-resolved.
 * @param {{ text?: string }[] | undefined} parts
 */
function combineCommentParts(parts) {
  return (parts ?? []).map((part) => part.text ?? '').join('');
}

/**
 * Collapse a class+namespace pair into a single directory. Two modes:
 *
 * Normal (merged) mode:
 *   <container>/classes/<name>.md   -> <target>/index.md (spliced with the namespace's content)
 *   <container>/namespaces/<name>/* -> <target>/*
 *
 * `noMerge` mode (from `@noNamespaceMerge` - see the MarkdownPageEvent.END
 * handler): the two pages are co-located but never spliced together, so the
 * class becomes just another member of the namespace instead of claiming
 * the index page:
 *   <container>/classes/<name>.md   -> <target>/classes/<name>.md
 *   <container>/namespaces/<name>/* -> <target>/*  (this already includes
 *     the namespace's own, untouched index.md, which becomes <target>/index.md)
 *
 * `<target>` is, in order of precedence: the pair's `@overridePath` target
 * (namespace's own tag, falling back to the matched class's), or
 * `<container>` itself if the container is already named after the pair
 * (e.g. a `Token` module holding the `Token` class + namespace), or
 * otherwise a new `<container>/<name>` directory (e.g. the `APIClient`
 * class + namespace nested inside the `Networking` module).
 *
 * Records every moved file's old -> new absolute path in `linkMap`, and the
 * reverse in `reverseMap` so a moved file's *own* pre-existing links can
 * later be reinterpreted correctly (they're still relative to where the
 * file used to live, not where it lives now).
 * @param {{name: string, classPath: string, namespaceDir: string, namespaceIndexFile: string, container: string, noMerge?: boolean, overrideTargetDir?: string | null}} move
 * @param {Map<string, string>} linkMap
 * @param {Map<string, string>} reverseMap
 */
function collapseNamespaceIntoClassDir({ name, classPath, namespaceDir, namespaceIndexFile, container, noMerge, overrideTargetDir }, linkMap, reverseMap) {
  const targetDir = overrideTargetDir ?? (path.basename(container) === name ? container : path.join(container, name));
  fs.mkdirSync(targetDir, { recursive: true });

  if (noMerge) {
    // The namespace's own directory (including its untouched index.md)
    // becomes <target>/ wholesale; the class just joins it as one more
    // member, at <target>/classes/<name>.md, instead of claiming the index.
    if (fs.existsSync(namespaceDir)) {
      for (const entry of fs.readdirSync(namespaceDir, { withFileTypes: true })) {
        const from = path.join(namespaceDir, entry.name);
        const to = path.join(targetDir, entry.name);
        recordTree(from, to, linkMap, reverseMap);
        moveTree(from, to);
      }

      removeIfEmpty(namespaceDir);
      removeIfEmpty(path.dirname(namespaceDir)); // namespaces/
    }

    if (fs.existsSync(classPath)) {
      const newClassPath = path.join(targetDir, 'classes', path.basename(classPath));
      recordTree(classPath, newClassPath, linkMap, reverseMap);
      moveTree(classPath, newClassPath);
    }
    removeIfEmpty(path.dirname(classPath)); // classes/ (old, shared location)

    return;
  }

  // 1. Move the merged class+namespace file to <target>/index.md. Its
  // content's links were already rebased to be relative to classPath's
  // directory when the namespace was merged in, so classPath is the single
  // valid "old path" for reinterpreting them.
  const newIndexPath = path.join(targetDir, 'index.md');
  if (fs.existsSync(classPath)) {
    linkMap.set(classPath, newIndexPath);
    reverseMap.set(newIndexPath, classPath);
    moveTree(classPath, newIndexPath);
  }
  // Anything that still links to the old namespace index should land here too
  linkMap.set(namespaceIndexFile, newIndexPath);
  removeIfEmpty(path.dirname(classPath)); // classes/

  if (!fs.existsSync(namespaceDir)) return;

  // Drop the namespace's own (now redundant) index page
  if (fs.existsSync(namespaceIndexFile)) {
    fs.unlinkSync(namespaceIndexFile);
  }

  // 2. Move the namespace's nested member directories into <target>/,
  // merging into any same-named directory that already exists there
  for (const entry of fs.readdirSync(namespaceDir, { withFileTypes: true })) {
    const from = path.join(namespaceDir, entry.name);
    const to = path.join(targetDir, entry.name);
    recordTree(from, to, linkMap, reverseMap);
    moveTree(from, to);
  }

  removeIfEmpty(namespaceDir);
  removeIfEmpty(path.dirname(namespaceDir)); // namespaces/
}

/**
 * Record old -> new absolute path (and the reverse) for every file under
 * `from`, as if it were about to be moved to `to`. Does not touch the
 * filesystem.
 * @param {string} from
 * @param {string} to
 * @param {Map<string, string>} linkMap
 * @param {Map<string, string>} reverseMap
 */
function recordTree(from, to, linkMap, reverseMap) {
  if (fs.statSync(from).isDirectory()) {
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
      recordTree(path.join(from, entry.name), path.join(to, entry.name), linkMap, reverseMap);
    }
  } else {
    linkMap.set(from, to);
    reverseMap.set(to, from);
  }
}

/**
 * Move `from` to `to`, merging into an existing directory at `to` instead
 * of clobbering it.
 * @param {string} from
 * @param {string} to
 */
function moveTree(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.renameSync(from, to);
    return;
  }

  if (fs.statSync(from).isDirectory()) {
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
      moveTree(path.join(from, entry.name), path.join(to, entry.name));
    }
    fs.rmdirSync(from);
  } else {
    // Destination file already exists (unexpected naming collision); the
    // moved file wins since it's the more specific namespace-member doc.
    fs.rmSync(to);
    fs.renameSync(from, to);
  }
}

/** @param {string} dir */
function removeIfEmpty(dir) {
  if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
  }
}

/**
 * Resolves `p` to its real on-disk casing (and resolves symlinks). Falls
 * back gracefully for a path that doesn't exist yet: walks up to the
 * nearest existing ancestor, canonicalizes that, then re-appends the
 * not-yet-existing tail segments verbatim (there's nothing to canonicalize
 * about a path that hasn't been created yet).
 *
 * TypeDoc reflections are named independently of the real source tree (e.g.
 * an explicit `@module Flows` next to a sibling file with no `@module` tag,
 * whose name gets auto-derived from the real, differently-cased source
 * folder). Both can resolve to the *same* directory on a case-insensitive
 * filesystem (macOS/Windows), where whichever renders first "wins" the
 * on-disk casing - but `page.filename`/`.url` on every other reflection
 * keeps using its own, possibly different, casing regardless. This is a
 * no-op on case-sensitive filesystems (e.g. Linux CI), where mismatched
 * casing would just be two distinct, non-colliding directories.
 * @param {string} p
 */
function toRealCasing(p) {
  if (fs.existsSync(p)) {
    return fs.realpathSync.native(p);
  }

  const parent = path.dirname(p);
  if (parent === p) return p; // reached the filesystem root

  return path.join(toRealCasing(parent), path.basename(p));
}

const LINK_PATTERN = /(\]\()([^)\s]+\.md(?:#[^)\s]*)?)(\))/g;

/**
 * Rewrite every relative `.md` link across the *entire* output tree so it
 * still resolves correctly: targets that moved (per `linkMap`) are
 * retargeted, and links in a file that itself moved (per `reverseMap`) are
 * re-based for its new depth even when their target never moved (e.g. a
 * breadcrumb link up to `modules.md`). Also runs on every file regardless
 * of whether anything moved, to normalize breadcrumbs project-wide.
 * @param {string} outputDir
 * @param {Map<string, string>} linkMap
 * @param {Map<string, string>} reverseMap
 */
function rewriteLinksInTree(outputDir, linkMap, reverseMap) {
  /** @param {string} dir */
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.md')) {
        const oldPath = reverseMap.get(full) ?? full;
        rewriteLinksInFile(full, oldPath, linkMap);
      }
    }
  };

  walk(outputDir);
}

/**
 * @param {string} newFilePath current (post-move) location of the file
 * @param {string} oldFilePath location the file's *own* links were written relative to
 * @param {Map<string, string>} linkMap
 */
function rewriteLinksInFile(newFilePath, oldFilePath, linkMap) {
  const content = fs.readFileSync(newFilePath, 'utf-8');
  let changed = false;

  let updated = content.replace(LINK_PATTERN, (match, open, target, close) => {
    const hashIndex = target.indexOf('#');
    const rawPath = hashIndex === -1 ? target : target.slice(0, hashIndex);
    const anchor = hashIndex === -1 ? '' : target.slice(hashIndex);

    if (!rawPath || /^[a-z]+:\/\//i.test(rawPath)) {
      return match; // external link, leave untouched
    }

    // Resolve the link the way it was written (relative to the file's old
    // location), then see where that target ended up.
    const absoluteOldTarget = path.resolve(path.dirname(oldFilePath), rawPath);
    const absoluteNewTarget = linkMap.get(absoluteOldTarget) ?? absoluteOldTarget;

    const newRelative = path
      .relative(path.dirname(newFilePath), absoluteNewTarget)
      .split(path.sep)
      .join('/');

    if (newRelative === rawPath) {
      return match;
    }

    changed = true;
    return `${open}${newRelative}${anchor}${close}`;
  });

  const withFixedBreadcrumb = collapseSelfReferentialBreadcrumb(
    stripModulesLinkFromBreadcrumb(updated),
    newFilePath
  );
  if (withFixedBreadcrumb !== updated) {
    updated = withFixedBreadcrumb;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(newFilePath, updated, 'utf-8');
  }
}

/**
 * Rewrite every relative markdown link in `content` so it resolves to the
 * same absolute target once the content's home directory changes from
 * `fromDir` to `toDir` (used when splicing namespace content into a class
 * page that lives at a different depth, before anything is moved on disk).
 * @param {string} content
 * @param {string} fromDir
 * @param {string} toDir
 */
function rebaseRelativeLinks(content, fromDir, toDir) {
  return content.replace(LINK_PATTERN, (match, open, target, close) => {
    const hashIndex = target.indexOf('#');
    const rawPath = hashIndex === -1 ? target : target.slice(0, hashIndex);
    const anchor = hashIndex === -1 ? '' : target.slice(hashIndex);

    if (!rawPath || /^[a-z]+:\/\//i.test(rawPath)) {
      return match;
    }

    const absoluteTarget = path.resolve(fromDir, rawPath);
    const newRelative = path.relative(toDir, absoluteTarget).split(path.sep).join('/');

    return `${open}${newRelative}${anchor}${close}`;
  });
}

/**
 * The first breadcrumb link on every page points at the package's
 * generated `modules.md`. VitePress should land on the package `index.md`
 * instead, so drop the `modules.md` filename and leave just the directory
 * (e.g. `../../modules.md` -> `../..`).
 * @param {string} content
 */
function stripModulesLinkFromBreadcrumb(content) {
  const newlineIndex = content.indexOf('\n');
  const firstLine = newlineIndex === -1 ? content : content.slice(0, newlineIndex);
  const rest = newlineIndex === -1 ? '' : content.slice(newlineIndex);

  const fixedFirstLine = firstLine.replace(
    /\]\(((?:\.\.\/)*)modules\.md\)/,
    (_match, /** @type {string} */ upDirs) => `](${upDirs.length > 0 ? upDirs.slice(0, -1) : '.'})`
  );

  return fixedFirstLine + rest;
}

/**
 * When a class and its same-named containing module collapse into one page
 * (the `Token`/`AuthorizationCodeFlow` case), the breadcrumb's middle crumb
 * ends up linking to the page it's already on, right before the trailing
 * plain-text page title, e.g. `[X](..) / [Name](index.md) / Name`. Drop any
 * breadcrumb crumb (and its trailing separator) that links to the file it
 * appears in.
 * @param {string} content
 * @param {string} filePath
 */
function collapseSelfReferentialBreadcrumb(content, filePath) {
  const newlineIndex = content.indexOf('\n');
  const firstLine = newlineIndex === -1 ? content : content.slice(0, newlineIndex);
  const rest = newlineIndex === -1 ? '' : content.slice(newlineIndex);

  const selfAbsolute = path.resolve(filePath);
  const crumbPattern = /\[[^\]]*\]\(([^)]+)\)(?: \/ )?/g;

  const fixedFirstLine = firstLine.replace(crumbPattern, (match, target) => {
    const hashIndex = target.indexOf('#');
    const rawPath = hashIndex === -1 ? target : target.slice(0, hashIndex);

    if (!rawPath || /^[a-z]+:\/\//i.test(rawPath)) {
      return match;
    }

    const absoluteTarget = path.resolve(path.dirname(filePath), rawPath);
    return absoluteTarget === selfAbsolute ? '' : match;
  });

  return fixedFirstLine + rest;
}

/**
 * Merge namespace markdown content into class markdown
 */
function mergeMarkdownContent(classContent, namespaceContent, className) {
  // Extract namespace members (everything after the main heading)
  const namespaceLines = namespaceContent.split('\n');

  // Find where namespace content starts (skip header, metadata, etc.)
  let contentStartIndex = 0;
  for (let i = 0; i < namespaceLines.length; i++) {
    if (namespaceLines[i].startsWith('## ') && !namespaceLines[i].includes('Namespace:')) {
      contentStartIndex = i;
      break;
    }
  }

  // Extract the namespace members section
  const namespaceMembers = namespaceLines.slice(contentStartIndex).join('\n');

  // Find insertion point in class content (before "Defined in" or at the end)
  const classLines = classContent.split('\n');
  let insertIndex = classLines.length;

  for (let i = classLines.length - 1; i >= 0; i--) {
    if (classLines[i].startsWith('#### Defined in') ||
        classLines[i].startsWith('**Defined in**') ||
        classLines[i].includes('Defined in')) {
      insertIndex = i;
      break;
    }
  }

  // Insert the namespace content before the "Defined in" line or at the end
  classLines.splice(insertIndex, 0, namespaceMembers);

  return classLines.join('\n');
}

/**
 * Alternative: More aggressive content extraction
 * Use this if the default merging doesn't capture everything you need
 */
function mergeMarkdownContentAggressive(classContent, namespaceContent, className) {
  // Remove frontmatter and title from namespace content
  let cleanedNamespace = namespaceContent
    .replace(/^---[\s\S]*?---\n/m, '') // Remove frontmatter
    .replace(/^#\s+.*?\n/m, ''); // Remove main title

  // Extract sections we want (Properties, Methods, Type Aliases, Interfaces, etc.)
  const sectionsToMerge = [
    'Properties',
    'Methods',
    'Functions',
    'Type Aliases',
    'Interfaces',
    'Enumerations',
    'Variables'
  ];

  let mergedSections = '';
  for (const section of sectionsToMerge) {
    const regex = new RegExp(`##\\s+${section}[\\s\\S]*?(?=##\\s+|$)`, 'g');
    const matches = cleanedNamespace.match(regex);
    if (matches) {
      mergedSections += '\n\n' + matches.join('\n\n');
    }
  }

  if (!mergedSections) {
    // If no specific sections found, include everything
    mergedSections = cleanedNamespace;
  }

  // Create the merged output
  const namespaceSection = [
    '',
    '---',
    '',
    `## ${className} Namespace`,
    '',
    'Static members and associated types:',
    '',
    mergedSections.trim()
  ].join('\n');

  // Append to class content
  return classContent + '\n\n' + namespaceSection;
}
