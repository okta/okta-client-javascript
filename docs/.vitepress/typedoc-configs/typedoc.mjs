import { OptionDefaults } from 'typedoc';

export default {
  tsconfig: "../../tsconfig.json",
  plugin: [
    "typedoc-plugin-mdn-links",
    "typedoc-plugin-no-inherit",
    "typedoc-plugin-markdown",
    "typedoc-vitepress-theme"
    , "../plugins/okta-customizations.mjs"
  ],
  // `@overrideContent <path>` lets a namespace's generated page be fully
  // replaced by a hand-authored markdown file, in place of the
  // auto-generated summary + member tables. `<path>` is relative to the
  // package's source root, e.g. `orchestrators/HostOrchestrator/README.md`.
  //
  // `@overridePath <path>` relocates a reflection's page to a custom output
  // location, instead of wherever TypeDoc would otherwise place it. `<path>`
  // is relative to the output directory. If `<path>` ends in `.md` it's used
  // verbatim as the destination file (e.g. for a plain class page); otherwise
  // it's treated as a directory and the page becomes `<path>/index.md` (e.g.
  // for a namespace, matching the merge pipeline's own `index.md` convention).
  // Any links elsewhere in the docs that pointed at the old location are
  // rewritten to follow it.
  blockTags: [...OptionDefaults.blockTags, '@noInheritDoc', '@overrideContent', '@overridePath'],
  // Opts a class+namespace pair out of the mergeNamespace.mjs plugin's collapsing behavior.
  // Can be placed on either the class or the namespace declaration.
  modifierTags: [...OptionDefaults.modifierTags, '@noNamespaceMerge'],
  groupOrder: [
    "Host",
    "SubApp",
    "ProxyHost",
    "Initializer",
    "Constructors",
    "Configurations",
    "Factory Methods",
    "Static Accessors",
    "Static Methods",
    "Events",
    "Properties",
    "Accessors",
    "Methods",
    "OAuth2 Methods",
    "Helper Methods",
    "*"
  ],
  sort: ["static-first", "source-order"],
  excludeInternal: true,
  disableSources: true,
  useTsLinkResolution: false,
  useCodeBlocks: false,
  indexFormat: "table",
  parametersFormat: "table",
  typeAliasPropertiesFormat: "table",
  propertyMembersFormat: "table",
  sidebar: {
    autoConfiguration: false
  }
}