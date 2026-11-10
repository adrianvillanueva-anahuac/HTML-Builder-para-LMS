import {escapeHtml, normalizeTextLinkURL, sanitizeHref} from './html-sanitize';

export interface ReferenceEntry {
  text: string;
  url: string;
}

const PAGE_TEMPLATE_TYPES = new Set([
  'bienvenida',
  'referencias',
  'requerimientos',
  'indice',
  'conclusiones',
  'profesor',
  'pagina_basica',
  'ejemplo_contenido',
  'pagina_ejercicio',
  'pagina_foda',
]);

export function isPageTemplateType(type: string): boolean {
  return PAGE_TEMPLATE_TYPES.has(type);
}

function cleanMatchedUrl(rawUrl: string): {url: string; trailing: string} {
  let url = rawUrl;
  let trailing = '';
  while (url.length > 0) {
    const last = url[url.length - 1];
    if (['>', '.', ',', ';', '"', "'"].includes(last)) {
      trailing = last + trailing;
      url = url.slice(0, -1);
      continue;
    }
    if (last === ')') {
      const opens = (url.match(/\(/g) || []).length;
      const closes = (url.match(/\)/g) || []).length;
      if (closes > opens) {
        trailing = last + trailing;
        url = url.slice(0, -1);
        continue;
      }
    }
    break;
  }
  return {url: normalizeTextLinkURL(url) || '', trailing};
}

export function parseReferencesText(rawText: string): ReferenceEntry[] {
  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
  const entries: ReferenceEntry[] = [];
  const urlRegex = /(https?:\/\/[^\s<>]+)/gi;

  for (const line of lines) {
    const matches = [...line.matchAll(urlRegex)];
    if (matches.length === 0) {
      entries.push({text: line, url: ''});
      continue;
    }

    let lastIndex = 0;
    for (const match of matches) {
      const index = match.index ?? 0;
      let entryText = line.substring(lastIndex, index).trim();
      const {url} = cleanMatchedUrl(match[0]);
      let nextIndex = index + match[0].length;

      if (entryText.endsWith('<')) {
        entryText = entryText.slice(0, -1).trim();
        if (line[nextIndex] === '>') {
          nextIndex += 1;
        }
      }
      if (line[nextIndex] === '.') {
        nextIndex += 1;
      }

      if (entryText || url) {
        entries.push({text: entryText || url, url});
      }
      lastIndex = nextIndex;
    }

    const trailingText = line.substring(lastIndex).replace(/^[>.,;\s]+/, '').trim();
    if (trailingText) {
      entries.push({text: trailingText, url: ''});
    }
  }

  return entries;
}

export function buildReferenciaItemBodyHTML(text = 'Referencia', url = ''): {safeText: string; linkHTML: string} {
  let linkHTML = '';
  if (url) {
    const safeUrl = escapeHtml(sanitizeHref(url, ''));
    if (safeUrl) {
      linkHTML = `<div class="mt-1 flex items-center gap-2 reference-link-container group/link"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-anahuac-orange hover:underline font-serif font-bold reference-link" title="${safeUrl}">Link</a><button type="button" onclick="event.preventDefault(); event.stopPropagation(); window.editReferenceLink(this);" class="opacity-0 group-hover/link:opacity-100 transition-opacity bg-gray-100 hover:bg-gray-200 text-gray-500 rounded flex items-center justify-center p-0.5 cursor-pointer z-10 relative" title="Editar enlace"><span class="material-symbols-outlined text-[16px] pointer-events-none">edit</span></button></div>`;
    }
  }
  return {
    safeText: escapeHtml(text),
    linkHTML,
  };
}
