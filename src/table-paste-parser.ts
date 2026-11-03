import { escapeHtml, sanitizeHref } from './html-sanitize';
import { tableCellPositions } from './table-style-model';

export interface ParsedTableCell {
  text: string;
  html: string;
  colSpan: number;
  rowSpan: number;
  isHeader: boolean;
  customBg?: string;
  customColor?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
}

export interface ParsedTableRow {
  cells: ParsedTableCell[];
  isHeaderRow: boolean;
}

export interface ParsedTable {
  rows: ParsedTableRow[];
  maxCols: number;
  hasCustomFormatting: boolean;
}

/**
 * Normalizes CSS color values (hex, rgb, rgba, named colors).
 * Discards transparent, none, inherit, and rgba with 0 alpha.
 */
export function normalizeColor(val?: string | null): string | undefined {
  if (!val) return undefined;
  val = val.trim();
  if (!val || val === 'none' || val === 'transparent' || val === 'inherit' || val === 'initial' || val === 'unset') {
    return undefined;
  }
  if (/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0(?:\.0+)?\s*\)$/i.test(val)) {
    return undefined;
  }
  const hex = val.match(/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/);
  if (hex) return hex[0].toLowerCase();

  const rgb = val.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+\s*)?\)/i);
  if (rgb) return rgb[0].toLowerCase();

  const hsl = val.match(/hsla?\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?(?:\s*,\s*[\d.]+\s*)?\)/i);
  if (hsl) return hsl[0].toLowerCase();

  if (/^[a-zA-Z]+$/.test(val)) {
    return val.toLowerCase();
  }
  return undefined;
}

export function normalizeAlign(val?: string | null): 'left' | 'center' | 'right' | 'justify' | undefined {
  if (!val) return undefined;
  val = val.trim().toLowerCase();
  if (['left', 'center', 'right', 'justify'].includes(val)) {
    return val as 'left' | 'center' | 'right' | 'justify';
  }
  return undefined;
}

function getAttr(tagStr: string, attr: string): string | undefined {
  const match = tagStr.match(new RegExp(`(?:^|\\s)${attr}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? (match[1] ?? match[2] ?? match[3]) : undefined;
}

function getStyleProp(styleStr: string, prop: string): string | undefined {
  const match = styleStr.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i'));
  return match ? match[1].trim() : undefined;
}

function extractCellBgFromStrings(cellTag: string, rowTag?: string): string | undefined {
  const cellStyle = getAttr(cellTag, 'style') || '';
  const cellBgColor = getStyleProp(cellStyle, 'background-color');
  const cellBg = getStyleProp(cellStyle, 'background');
  const cellBgAttr = getAttr(cellTag, 'bgcolor');

  const color = normalizeColor(cellBgColor) || normalizeColor(cellBg) || normalizeColor(cellBgAttr);
  if (color) return color;

  if (rowTag) {
    const rowStyle = getAttr(rowTag, 'style') || '';
    const rowBgColor = getStyleProp(rowStyle, 'background-color');
    const rowBg = getStyleProp(rowStyle, 'background');
    const rowBgAttr = getAttr(rowTag, 'bgcolor');
    return normalizeColor(rowBgColor) || normalizeColor(rowBg) || normalizeColor(rowBgAttr);
  }
  return undefined;
}

function extractCellColorFromString(cellTag: string, cellInner: string): string | undefined {
  const cellStyle = getAttr(cellTag, 'style') || '';
  const cellColor = getStyleProp(cellStyle, 'color');
  const normalized = normalizeColor(cellColor);
  if (normalized) return normalized;

  const fontMatch = cellInner.match(/<font\b[^>]*color\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  if (fontMatch) {
    const c = normalizeColor(fontMatch[1] ?? fontMatch[2] ?? fontMatch[3]);
    if (c) return c;
  }

  const spanMatch = cellInner.match(/<span\b[^>]*style\s*=\s*["'][^"']*color\s*:\s*([^;"]+)/i);
  if (spanMatch) {
    const c = normalizeColor(spanMatch[1]);
    if (c) return c;
  }

  return undefined;
}

function extractCellAlignFromString(cellTag: string, cellInner: string): 'left' | 'center' | 'right' | 'justify' | undefined {
  const cellStyle = getAttr(cellTag, 'style') || '';
  const cellAlign = normalizeAlign(getStyleProp(cellStyle, 'text-align') || getAttr(cellTag, 'align'));
  if (cellAlign) return cellAlign;

  const innerMatch = cellInner.match(/<(?:p|div|h[1-6])\b[^>]*?(?:align\s*=\s*["']?([a-zA-Z]+)["']?|text-align\s*:\s*([a-zA-Z]+))/i);
  if (innerMatch) {
    return normalizeAlign(innerMatch[1] || innerMatch[2]);
  }
  return undefined;
}

export function cleanInnerMarkup(rawHtml: string): { html: string; text: string } {
  let cleaned = rawHtml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<(script|style|xml|meta|link|iframe|object|embed|applet)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<o:p\b[\s\S]*?<\/o:p>/gi, '')
    .replace(/<\/?(?:o|w|m|v):[^>]*>/gi, '');

  const text = cleaned.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // Normalize paragraph breaks
  cleaned = cleaned.replace(/<\/(?:p|div)>\s*<(?:p|div)\b[^>]*>/gi, '<br>');
  cleaned = cleaned.replace(/<\/?(?:p|div)\b[^>]*>/gi, '');

  cleaned = cleaned.replace(/<strong\b[^>]*>/gi, '<b>').replace(/<\/strong>/gi, '</b>');
  cleaned = cleaned.replace(/<em\b[^>]*>/gi, '<i>').replace(/<\/em>/gi, '</i>');
  cleaned = cleaned.replace(/<(?:strike|del)\b[^>]*>/gi, '<s>').replace(/<\/(?:strike|del)>/gi, '</s>');

  // Convert span styles (bold, italic, underline, strike, custom color) before stripping spans
  for (let pass = 0; pass < 3; pass++) {
    cleaned = cleaned.replace(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi, (_match, attrs, inner) => {
      let res = inner;
      const isBold = /font-weight\s*:\s*(?:bold|[7-9]00)/i.test(attrs);
      const isItalic = /font-style\s*:\s*italic/i.test(attrs);
      const isUnderline = /text-decoration\s*:[^;]*underline/i.test(attrs);
      const isStrike = /text-decoration\s*:[^;]*line-through/i.test(attrs);
      const colorMatch = attrs.match(/color\s*:\s*([^;"]+)/i);
      const color = colorMatch ? normalizeColor(colorMatch[1]) : undefined;

      if (color && !['#000000', '#000', 'black', 'inherit', 'initial'].includes(color)) {
        res = `<span style="color:${color}">${res}</span>`;
      }
      if (isStrike) res = `<s>${res}</s>`;
      if (isUnderline) res = `<u>${res}</u>`;
      if (isItalic) res = `<i>${res}</i>`;
      if (isBold) res = `<b>${res}</b>`;
      return res;
    });
  }

  // Remove any remaining unstyled spans
  cleaned = cleaned.replace(/<span\b(?![^>]*style\s*=\s*["'][^"']*color)[^>]*>([\s\S]*?)<\/span>/gi, '$1');

  cleaned = cleaned.replace(/<([a-z0-9]+)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (_match, tag, attrs, inner) => {
    const t = tag.toLowerCase();
    if (['b', 'i', 'u', 's', 'ul', 'ol', 'li'].includes(t)) {
      return `<${t}>${inner}</${t}>`;
    }
    if (t === 'a') {
      const hrefMatch = attrs.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const rawHref = hrefMatch ? (hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3]) : '#';
      const safe = escapeHtml(sanitizeHref(rawHref, '#'));
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="underline">${inner}</a>`;
    }
    if (t === 'span' && /color/i.test(attrs)) {
      return `<span ${attrs}>${inner}</span>`;
    }
    return inner;
  });

  cleaned = cleaned.replace(/<br\s*\/?>/gi, '<br>');
  cleaned = cleaned.replace(/<(b|i|u|s)>\s*<\/\1>/gi, '');
  cleaned = cleaned.trim();

  return { html: cleaned, text };
}

export function parseHtmlTableString(rawHtml: string): ParsedTable | null {
  const tableMatch = rawHtml.match(/<table\b([^>]*)>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return null;

  const tableInner = tableMatch[2];
  const rows: ParsedTableRow[] = [];

  const theadMatch = tableInner.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i);
  const theadInner = theadMatch ? theadMatch[1] : '';

  const trRegex = /<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  let rowIndex = 0;

  while ((trMatch = trRegex.exec(tableInner)) !== null) {
    const rowTag = trMatch[1];
    const rowInner = trMatch[2];
    const isInsideThead = theadInner ? theadInner.includes(trMatch[0]) : false;
    const isHeaderRow = isInsideThead || rowIndex === 0;

    const cells: ParsedTableCell[] = [];
    const cellRegex = /<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellRegex.exec(rowInner)) !== null) {
      const cellTag = cellMatch[2];
      const cellInner = cellMatch[3];
      const isTh = cellMatch[1].toLowerCase() === 'th';

      const colSpan = Math.max(1, parseInt(getAttr(cellTag, 'colspan') || '1', 10) || 1);
      const rowSpan = Math.max(1, parseInt(getAttr(cellTag, 'rowspan') || '1', 10) || 1);
      const customBg = extractCellBgFromStrings(cellTag, rowTag);
      const customColor = extractCellColorFromString(cellTag, cellInner);
      const textAlign = extractCellAlignFromString(cellTag, cellInner);
      const { html, text } = cleanInnerMarkup(cellInner);

      cells.push({
        text,
        html,
        colSpan,
        rowSpan,
        isHeader: isHeaderRow || isTh,
        customBg,
        customColor,
        textAlign,
      });
    }

    if (cells.length > 0) {
      rows.push({
        cells,
        isHeaderRow,
      });
      rowIndex++;
    }
  }

  if (rows.length === 0) return null;

  const layout = tableCellPositions(rows.map(r => r.cells));
  const hasCustomFormatting = rows.some(r =>
    r.cells.some(c =>
      !!c.customBg ||
      !!c.customColor ||
      !!c.textAlign ||
      c.colSpan > 1 ||
      c.rowSpan > 1 ||
      /<(?:b|i|u|s|a|br|ul|ol|li|span)\b/i.test(c.html)
    )
  );

  return {
    rows,
    maxCols: layout.columns,
    hasCustomFormatting,
  };
}

function extractCellBgFromElement(cell: HTMLElement, row?: HTMLElement): string | undefined {
  const cellBg = normalizeColor(cell.style.backgroundColor) ||
                 normalizeColor(cell.style.background) ||
                 normalizeColor(cell.getAttribute('bgcolor'));
  if (cellBg) return cellBg;

  if (row) {
    const rowBg = normalizeColor(row.style.backgroundColor) ||
                  normalizeColor(row.style.background) ||
                  normalizeColor(row.getAttribute('bgcolor'));
    if (rowBg) return rowBg;
  }
  return undefined;
}

function extractCellColorFromElement(cell: HTMLElement): string | undefined {
  const directColor = normalizeColor(cell.style.color) || normalizeColor(cell.getAttribute('color'));
  if (directColor) return directColor;

  const fontEl = cell.querySelector('font[color]');
  if (fontEl) {
    const c = normalizeColor(fontEl.getAttribute('color'));
    if (c) return c;
  }

  const spanEl = cell.querySelector('span[style*="color"]');
  if (spanEl instanceof HTMLElement) {
    const c = normalizeColor(spanEl.style.color);
    if (c) return c;
  }

  return undefined;
}

function extractCellAlignFromElement(cell: HTMLElement): 'left' | 'center' | 'right' | 'justify' | undefined {
  const directAlign = normalizeAlign(cell.style.textAlign || cell.getAttribute('align'));
  if (directAlign) return directAlign;

  const childBlock = cell.querySelector('p, div, h1, h2, h3, h4, h5, h6');
  if (childBlock instanceof HTMLElement) {
    const childAlign = normalizeAlign(childBlock.style.textAlign || childBlock.getAttribute('align'));
    if (childAlign) return childAlign;
  }
  return undefined;
}

function sanitizeCellHtmlFromElement(cell: HTMLElement): { html: string; text: string } {
  const text = (cell.textContent || '').trim();

  const cleanNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent || '');
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (['script', 'style', 'xml', 'meta', 'link', 'iframe', 'object', 'embed', 'applet'].includes(tag)) {
        return '';
      }
      if (tag === 'o:p' || tag.startsWith('o:') || tag.startsWith('w:') || tag.startsWith('m:') || tag.startsWith('v:')) {
        return '';
      }

      let content = '';
      for (const child of Array.from(el.childNodes)) {
        content += cleanNode(child);
      }

      let isBold = ['b', 'strong'].includes(tag);
      let isItalic = ['i', 'em'].includes(tag);
      let isUnderline = ['u'].includes(tag);
      let isStrike = ['s', 'strike', 'del'].includes(tag);

      if (el.style) {
        const fw = el.style.fontWeight;
        if (fw === 'bold' || fw === 'bolder' || parseInt(fw, 10) >= 700) isBold = true;
        if (el.style.fontStyle === 'italic') isItalic = true;
        const td = el.style.textDecoration || '';
        if (td.includes('underline')) isUnderline = true;
        if (td.includes('line-through')) isStrike = true;
      }

      if (isBold && content.trim()) content = `<b>${content}</b>`;
      if (isItalic && content.trim()) content = `<i>${content}</i>`;
      if (isUnderline && content.trim()) content = `<u>${content}</u>`;
      if (isStrike && content.trim()) content = `<s>${content}</s>`;

      if (tag === 'br') return '<br>';
      if (tag === 'a') {
        const href = escapeHtml(sanitizeHref(el.getAttribute('href') || '#', '#'));
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="underline">${content}</a>`;
      }
      if (tag === 'ul') return `<ul class="list-custom list-bullets pl-4 my-1">${content}</ul>`;
      if (tag === 'ol') return `<ol class="list-custom list-numbers pl-4 my-1">${content}</ol>`;
      if (tag === 'li') return `<li class="mb-0.5">${content}</li>`;
      if (tag === 'p' || tag === 'div') {
        if (!content.trim()) return '';
        return content;
      }
      if (tag === 'span') {
        const color = normalizeColor(el.style?.color);
        if (color) return `<span style="color:${color}">${content}</span>`;
        return content;
      }
      return content;
    }
    return '';
  };

  const blocks = Array.from(cell.children).filter(c => ['P', 'DIV'].includes(c.tagName));
  let html = '';
  if (blocks.length > 1) {
    html = blocks.map(b => cleanNode(b).trim()).filter(Boolean).join('<br>');
  } else {
    html = cleanNode(cell).trim();
  }

  html = html.replace(/<(b|i|u|s)>\s*<\/\1>/gi, '');

  return { html, text };
}

export function parseHtmlTableWithDOM(rawHtml: string): ParsedTable | null {
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
  const table = doc.querySelector('table');
  if (!table) return null;

  const tableRows = Array.from(table.querySelectorAll('tr')).filter(tr => tr.closest('table') === table);
  if (tableRows.length === 0) return null;

  const rows: ParsedTableRow[] = [];

  tableRows.forEach((tr, rowIndex) => {
    const isInsideThead = !!tr.closest('thead');
    const isHeaderRow = isInsideThead || rowIndex === 0;
    const cells: ParsedTableCell[] = [];
    const directCells = Array.from(tr.children).filter(el => el.tagName === 'TH' || el.tagName === 'TD') as HTMLElement[];

    directCells.forEach(cell => {
      const colSpan = Math.max(1, parseInt(cell.getAttribute('colspan') || '1', 10) || 1);
      const rowSpan = Math.max(1, parseInt(cell.getAttribute('rowspan') || '1', 10) || 1);
      const customBg = extractCellBgFromElement(cell, tr as HTMLElement);
      const customColor = extractCellColorFromElement(cell);
      const textAlign = extractCellAlignFromElement(cell);
      const { html, text } = sanitizeCellHtmlFromElement(cell);

      cells.push({
        text,
        html,
        colSpan,
        rowSpan,
        isHeader: isHeaderRow || cell.tagName === 'TH',
        customBg,
        customColor,
        textAlign,
      });
    });

    if (cells.length > 0) {
      rows.push({ cells, isHeaderRow });
    }
  });

  if (rows.length === 0) return null;

  const layout = tableCellPositions(rows.map(r => r.cells));
  const hasCustomFormatting = rows.some(r =>
    r.cells.some(c =>
      !!c.customBg ||
      !!c.customColor ||
      !!c.textAlign ||
      c.colSpan > 1 ||
      c.rowSpan > 1 ||
      /<(?:b|i|u|s|a|br|ul|ol|li|span)\b/i.test(c.html)
    )
  );

  return {
    rows,
    maxCols: layout.columns,
    hasCustomFormatting,
  };
}

export function parseHtmlTable(rawHtml: string): ParsedTable | null {
  if (!rawHtml || !/<table\b/i.test(rawHtml)) return null;

  if (typeof DOMParser !== 'undefined') {
    return parseHtmlTableWithDOM(rawHtml);
  }
  return parseHtmlTableString(rawHtml);
}

export function parseTsvTable(rawText: string): ParsedTable | null {
  if (!rawText) return null;
  const lines = rawText.split(/\r?\n/).filter(r => r.trim());
  if (lines.length === 0) return null;

  const parsedRows = lines.map(r => r.split('\t'));
  const maxCols = Math.max(...parsedRows.map(r => r.length));
  if (maxCols === 0) return null;

  const rows: ParsedTableRow[] = parsedRows.map((row, rowIndex) => {
    const isHeaderRow = rowIndex === 0;
    const cells: ParsedTableCell[] = [];
    for (let c = 0; c < maxCols; c++) {
      const rawCell = row[c] || '';
      cells.push({
        text: rawCell,
        html: escapeHtml(rawCell),
        colSpan: 1,
        rowSpan: 1,
        isHeader: isHeaderRow,
      });
    }
    return {
      cells,
      isHeaderRow,
    };
  });

  return {
    rows,
    maxCols,
    hasCustomFormatting: false,
  };
}

export function parsePastedTable(input: { html?: string; text?: string } | string): ParsedTable | null {
  let html = '';
  let text = '';
  if (typeof input === 'string') {
    if (/<table\b/i.test(input)) {
      html = input;
    } else {
      text = input;
    }
  } else if (input && typeof input === 'object') {
    html = input.html || '';
    text = input.text || '';
  }

  // 1. Try HTML Table first (Preserves Google Slides, PowerPoint, Excel formatting)
  if (html && /<table\b/i.test(html)) {
    const htmlTable = parseHtmlTable(html);
    if (htmlTable && htmlTable.rows.length > 0) {
      return htmlTable;
    }
  }

  // 2. Check if text itself has HTML table
  if (text && /<table\b/i.test(text)) {
    const htmlTable = parseHtmlTable(text);
    if (htmlTable && htmlTable.rows.length > 0) {
      return htmlTable;
    }
  }

  // 3. Fallback to TSV (Plain Excel, Sheets, Notepad, etc.)
  if (text) {
    const tsvTable = parseTsvTable(text);
    if (tsvTable && tsvTable.rows.length > 0) {
      if (tsvTable.rows.length > 1 || tsvTable.maxCols > 1) {
        return tsvTable;
      }
    }
  }

  return null;
}

export function applyParsedTable(
  parsed: ParsedTable,
  lmsElement: HTMLElement,
  applyAppearance?: (el: HTMLElement) => void
): void {
  const table = lmsElement.querySelector('table');
  if (!table) return;

  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  if (!thead || !tbody) return;

  thead.innerHTML = '';
  tbody.innerHTML = '';

  parsed.rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.className = 'group/tr relative';

    row.cells.forEach(cellData => {
      const tag = row.isHeaderRow || cellData.isHeader ? 'th' : 'td';
      const cell = document.createElement(tag);

      cell.className = tag === 'th'
        ? 'border border-gray-300 p-3 bg-gray-100 text-left font-bold text-gray-800 relative group/th'
        : 'border border-gray-300 p-3 relative group/td';

      if (cellData.colSpan > 1) {
        cell.setAttribute('colspan', String(cellData.colSpan));
      }
      if (cellData.rowSpan > 1) {
        cell.setAttribute('rowspan', String(cellData.rowSpan));
      }

      if (cellData.customBg) {
        cell.dataset.customBg = cellData.customBg;
        cell.style.backgroundColor = cellData.customBg;
      }
      if (cellData.customColor) {
        cell.dataset.customColor = cellData.customColor;
        cell.style.color = cellData.customColor;
      }
      if (cellData.textAlign) {
        cell.style.textAlign = cellData.textAlign;
      }

      const div = document.createElement('div');
      div.className = 'editable-text min-h-[1.5em]';
      if (cellData.textAlign) {
        div.style.textAlign = cellData.textAlign;
      }

      if (cellData.html && cellData.html.trim()) {
        div.innerHTML = cellData.html;
      } else {
        div.textContent = cellData.text || ' ';
      }

      cell.appendChild(div);
      tr.appendChild(cell);
    });

    if (row.isHeaderRow) {
      thead.appendChild(tr);
    } else {
      tbody.appendChild(tr);
    }
  });

  if (tbody.children.length === 0 && thead.children.length > 1) {
    const theadRows = Array.from(thead.children);
    theadRows.slice(1).forEach(r => tbody.appendChild(r));
  }

  if (typeof window !== 'undefined' && (window as any).setupTableHoverControls) {
    (window as any).setupTableHoverControls(table);
  }

  if (applyAppearance) {
    applyAppearance(lmsElement);
  } else if (typeof window !== 'undefined' && (window as any).applyTableAppearance) {
    (window as any).applyTableAppearance(lmsElement);
  }

  if (typeof document !== 'undefined') {
    const evt = new CustomEvent('lms-content-updated');
    document.dispatchEvent(evt);
  }

  if (typeof window !== 'undefined' && (window as any).showToast) {
    (window as any).showToast('Datos de tabla pegados exitosamente');
  }

  if (typeof window !== 'undefined' && (window as any).saveHistoryState) {
    (window as any).saveHistoryState(true);
  }
}
