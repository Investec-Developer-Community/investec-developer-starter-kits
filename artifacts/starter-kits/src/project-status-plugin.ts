import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Plugin } from 'vite';
import { ProjectStatus } from './components/project-status.tsx';

const marker = '<!-- PROJECT_STATUS -->';

export function projectStatusPlugin(): Plugin {
  const markup = renderToStaticMarkup(createElement(ProjectStatus));

  return {
    name: 'launchpad-project-status',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const occurrences = html.split(marker).length - 1;
        if (occurrences !== 1) {
          throw new Error(`Expected exactly one ${marker} marker in index.html; found ${occurrences}.`);
        }
        return html.replace(marker, markup);
      },
    },
  };
}
