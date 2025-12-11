import { MarkdownPageEvent } from 'typedoc-plugin-markdown';
import path from 'node:path';


export function load (app) {
  app.renderer.on(MarkdownPageEvent.BEGIN, (page) => {
    if (page.filename.includes('namespace')) {
      // console.log('page', page)
      const { children, childrenIncludingDocuments, ...model } = page.model;
      console.log(model)
      // console.log(model?.typeHierarchy?.types)
      console.log('filename', page.filename);
    }
  });
}
