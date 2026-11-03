export interface DocCssProfile {
  classes: Set<string>;
  tags: Set<string>;
  ids: Set<string>;
  attrs: Set<string>;
  inlineVars: Set<string>;
}

const CORE_THEME_VARS = new Set([
  '--color-anahuac-orange',
  '--color-anahuac-purple',
  '--color-anahuac-light',
  '--color-anahuac-gray',
  '--color-anahuac-dark',
  '--font-sans',
  '--font-serif',
  '--font-lato',
  '--font-mono',
  '--default-font-family',
  '--default-mono-font-family',
  '--default-transition-duration',
  '--default-transition-timing-function',
  '--spacing',
]);

const STUDENT_RUNTIME_CLASSES = [
  'anahuac-builder-export',
  'exercise-block',
  'exercise-savebar',
  'exercise-status',
  'student-dialog',
  'student-rich-tools',
  'student-answer',
  'student-rich-answer',
  'student-name',
  'student-label',
  'exercise-finish',
  'exercise-instructions',
  'exercise-watermark',
  'exercise-review-watermark',
  'finish-button-row',
  'finish-button-wrap',
  'exercise-button-text',
  'material-symbols-outlined',
];

const STUDENT_RUNTIME_TAGS = [
  'html',
  'body',
  'div',
  'span',
  'p',
  'h2',
  'a',
  'button',
  'dialog',
  'footer',
  'label',
  'input',
  'select',
  'option',
  'textarea',
];

const STUDENT_RUNTIME_IDS = [
  'student-save',
  'exercise-student-state',
];

const STUDENT_RUNTIME_ATTRS = [
  'hidden',
  'disabled',
  'readonly',
  'open',
  'type',
  'role',
  'style',
  'href',
  'src',
  'contenteditable',
  'data-rich-command',
];

const EDITOR_ONLY_PATTERNS: RegExp[] = [
  /(^|[^\w-])\.dark([^\w-]|$)/,
  /\.block-toolbar\b/,
  /#rtf-toolbar\b/,
  /#image-toolbar\b/,
  /#inline-icon-toolbar\b/,
  /#text-link-tools\b/,
  /#icon-modal\b/,
  /\.text-link-dialog\b/,
  /\.element-style-actions\b/,
  /\.element-design-group\b/,
  /\.element-view-/,
  /\.builder-header\b/,
  /\.project-/,
  /\.workspace-/,
  /\.welcome-/,
  /\.shepherd-/,
  /\.lms-shepherd-/,
  /\.lms-tour-/,
  /\.fde-/,
  /\.dev-ann-/,
  /\.catalog-/,
  /#tab-elements\b/,
  /#catalog-pages\b/,
  /\.sidebar-resizer\b/,
  /\[data-tour\b/,
  /#scroll-container\b/,
  /#canvas-placeholder\b/,
  /#empty-state\b/,
  /#root\b/,
  /\.ghost-element\b/,
  /\.drag-item\b/,
  /\.is-dragging\b/,
  /\.layout-intent-active\b/,
  /\.sortable-/,
  /\.lms-drag-origin\b/,
  /\.drag-handle\b/,
  /\.drag-over\b/,
  /\.student-controls\b/,
  /\.student-control-menu\b/,
  /\.student-control-panel\b/,
  /\.student-color-swatch\b/,
  /\.student-line-sample\b/,
  /\.student-height-slider\b/,
  /\.button-text-icon-label\b/,
  /\.exercise-tools\b/,
  /\.exercise-design-note\b/,
  /\.exercise-settings\b/,
  /\.exercise-dialog-actions\b/,
  /\.exercise-editor-overlay\b/,
  /\.exercise-editor-actions\b/,
  /\.exercise-catalog-item\b/,
  /\.exercise-header\b/,
  /body\.exercise-editor\b/,
  /\.table-cell-controls\b/,
  /\.flipcard-item-controls\b/,
  /\.references-importer-container\b/,
  /\.title-image-size-control\b/,
  /\.title-image-size-panel\b/,
  /\.editable-text\b/,
  /\.editable-icon\b/,
  /\.selected-img\b/,
  /\.mod-tools\b/,
  /\.mod-cell-tools\b/,
  /\.mod-row-tools\b/,
  /\.mod-column-tools\b/,
  /\.mod-overflow-editor\b/,
  /\.mod-overflow-hover-tools\b/,
  /\.mod-overflow-edit-surface\b/,
  /\.mod-overflow-draft/,
  /\.mod-overflow-page-locked\b/,
  /\.mod-modal\b/,
  /\.mod-badge-panel\b/,
  /\.mod-badge-picker\b/,
  /\.mod-badge-align-/,
  /\.mod-text-geometry\b/,
  /\.mod-text-session-actions\b/,
  /\.mod-text-box-menu-panel\b/,
  /\.mod-resize\b/,
  /\.mod-connector-popover\b/,
  /\.mod-preview-tools\b/,
  /\.mod-prompt-tools\b/,
  /\.mod-prompt-resize\b/,
  /\.mod-prompt-icon\b/,
  /\.mod-align-text-icon\b/,
  /\.mod-add\b/,
  /\.mod-primary-hit-area\b/,
  /\.mod-draft\b/,
  /\.mod-picker\b/,
  /\.mod-pending\b/,
  /::-webkit-datetime-edit/,
  /::-webkit-date-and-time-value/,
  /::-webkit-calendar-picker-indicator/,
  /::-webkit-search-decoration/,
  /::-webkit-inner-spin-button/,
  /::-webkit-outer-spin-button/,
  /::file-selector-button/,
  /:-moz-ui-invalid/,
  /:-moz-focusring/,
];

/** Collects all CSS classes, tag names, IDs, attributes, and inline custom properties used by a document. */
export function buildDocCssProfile(root: Document | Element): DocCssProfile {
  const classes = new Set<string>(STUDENT_RUNTIME_CLASSES);
  const tags = new Set<string>(STUDENT_RUNTIME_TAGS);
  const ids = new Set<string>(STUDENT_RUNTIME_IDS);
  const attrs = new Set<string>(STUDENT_RUNTIME_ATTRS);
  const inlineVars = new Set<string>();

  const inspectElement = (el: Element) => {
    tags.add(el.tagName.toLowerCase());
    if (el.id) ids.add(el.id);
    const classAttr = el.getAttribute('class');
    if (classAttr) {
      for (const token of classAttr.split(/\s+/)) {
        if (token) classes.add(token);
      }
    }
    for (const attr of Array.from(el.attributes)) {
      attrs.add(attr.name.toLowerCase());
      if (attr.name === 'style' && attr.value) {
        for (const match of attr.value.matchAll(/--[\w-]+/g)) {
          inlineVars.add(match[0]);
        }
      }
    }
  };

  if ('documentElement' in root && root.documentElement) {
    inspectElement(root.documentElement);
  } else if ('tagName' in root) {
    inspectElement(root);
  }
  root.querySelectorAll('*').forEach(inspectElement);

  // Dynamic classes toggled at runtime by interactive components when present
  if (classes.has('lms-tab-pane') || classes.has('tab-buttons-container')) {
    for (const c of ['hidden', 'block', 'flex', 'flex-col', 'gap-4', 'active', 'border-anahuac-orange', 'text-anahuac-orange', 'border-transparent', 'text-gray-500']) {
      classes.add(c);
    }
  }
  if (classes.has('flipcard-item')) {
    classes.add('is-flipped');
    classes.add('force-flip');
  }
  if (root.querySelector('[data-type="boton_interactivo"]')) {
    for (const c of ['ib-open', 'is-open', 'active', 'hidden']) {
      classes.add(c);
    }
  }

  return { classes, tags, ids, attrs, inlineVars };
}

/** Strips CSS comments while preserving quoted strings and url() literals. */
export function stripCssComments(css: string): string {
  let out = '';
  let i = 0;
  const len = css.length;
  while (i < len) {
    const ch = css[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      out += ch;
      i++;
      while (i < len) {
        const c = css[i];
        out += c;
        i++;
        if (c === '\\' && i < len) {
          out += css[i];
          i++;
        } else if (c === quote) {
          break;
        }
      }
      continue;
    }
    if (ch === '/' && css[i + 1] === '*') {
      i += 2;
      while (i < len && !(css[i] === '*' && css[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

interface CssStatement {
  type: 'at-semi' | 'at-block' | 'rule';
  prelude: string;
  body: string;
}

/** Parses a CSS string (without comments) into top-level statements. */
function parseCssStatements(css: string): CssStatement[] {
  const statements: CssStatement[] = [];
  let i = 0;
  const len = css.length;

  while (i < len) {
    while (i < len && /\s/.test(css[i])) i++;
    if (i >= len) break;

    const start = i;
    let parenDepth = 0;
    let bracketDepth = 0;
    let terminator: ';' | '{' | '' = '';

    while (i < len) {
      const ch = css[i];
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === '"' || ch === "'") {
        const quote = ch;
        i++;
        while (i < len) {
          if (css[i] === '\\') {
            i += 2;
          } else if (css[i] === quote) {
            i++;
            break;
          } else {
            i++;
          }
        }
        continue;
      }
      if (ch === '(') parenDepth++;
      else if (ch === ')' && parenDepth > 0) parenDepth--;
      else if (ch === '[') bracketDepth++;
      else if (ch === ']' && bracketDepth > 0) bracketDepth--;
      else if (parenDepth === 0 && bracketDepth === 0) {
        if (ch === ';') {
          terminator = ';';
          break;
        }
        if (ch === '{') {
          terminator = '{';
          break;
        }
      }
      i++;
    }

    const prelude = css.slice(start, i).trim();
    if (!prelude) {
      i++;
      continue;
    }

    if (terminator === ';') {
      i++;
      if (prelude.startsWith('@')) {
        statements.push({ type: 'at-semi', prelude, body: '' });
      }
      continue;
    }

    if (terminator === '{') {
      i++; // skip '{'
      const bodyStart = i;
      let braceDepth = 1;
      while (i < len && braceDepth > 0) {
        const ch = css[i];
        if (ch === '\\') {
          i += 2;
          continue;
        }
        if (ch === '"' || ch === "'") {
          const quote = ch;
          i++;
          while (i < len) {
            if (css[i] === '\\') {
              i += 2;
            } else if (css[i] === quote) {
              i++;
              break;
            } else {
              i++;
            }
          }
          continue;
        }
        if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth--;
        i++;
      }
      const body = css.slice(bodyStart, Math.max(bodyStart, i - 1)).trim();
      statements.push({
        type: prelude.startsWith('@') ? 'at-block' : 'rule',
        prelude,
        body,
      });
    }
  }

  return statements;
}

/** Splits a comma-separated selector list at top-level commas only. */
function splitSelectorList(selectorText: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  for (let i = 0; i < selectorText.length; i++) {
    const ch = selectorText[i];
    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const q = ch;
      i++;
      while (i < selectorText.length && selectorText[i] !== q) {
        if (selectorText[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (ch === '(') parenDepth++;
    else if (ch === ')' && parenDepth > 0) parenDepth--;
    else if (ch === '[') bracketDepth++;
    else if (ch === ']' && bracketDepth > 0) bracketDepth--;
    else if (ch === ',' && parenDepth === 0 && bracketDepth === 0) {
      const s = selectorText.slice(start, i).trim();
      if (s) parts.push(s);
      start = i + 1;
    }
  }
  const tail = selectorText.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

/** Unescapes CSS identifier escapes like `.md\:grid-cols-2` -> `md:grid-cols-2`. */
function unescapeCssIdent(raw: string): string {
  return raw.replace(/\\([0-9a-fA-F]{1,6}\s?|.)/g, (_, esc: string) => {
    if (/^[0-9a-fA-F]+\s?$/.test(esc) && esc.length > 1) {
      return String.fromCodePoint(parseInt(esc.trim(), 16));
    }
    return esc;
  });
}

function isEditorOnlySelector(sel: string): boolean {
  return EDITOR_ONLY_PATTERNS.some(re => re.test(sel));
}

/** Extracts balanced functional pseudo-classes `:name(...)` from a selector. */
function extractFunctionalPseudos(sel: string): {
  stripped: string;
  isGroups: string[];
  hasGroups: string[];
} {
  let stripped = '';
  const isGroups: string[] = [];
  const hasGroups: string[] = [];
  let i = 0;
  const len = sel.length;

  while (i < len) {
    if (sel[i] === '\\') {
      stripped += sel.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (sel[i] === '[') {
      const start = i;
      i++;
      while (i < len && sel[i] !== ']') {
        if (sel[i] === '\\') i++;
        i++;
      }
      i++;
      stripped += sel.slice(start, i);
      continue;
    }
    const match = sel.slice(i).match(/^:(not|is|where|has)\(/);
    if (match) {
      const fnName = match[1];
      i += match[0].length;
      const innerStart = i;
      let depth = 1;
      while (i < len && depth > 0) {
        if (sel[i] === '\\') {
          i += 2;
          continue;
        }
        if (sel[i] === '(') depth++;
        else if (sel[i] === ')') depth--;
        i++;
      }
      const inner = sel.slice(innerStart, Math.max(innerStart, i - 1)).trim();
      if (fnName === 'is' || fnName === 'where') {
        isGroups.push(inner);
      } else if (fnName === 'has') {
        hasGroups.push(inner);
      }
      // Replace functional pseudo with a neutral placeholder so surrounding combinators stay valid
      stripped += '*';
      continue;
    }
    stripped += sel[i];
    i++;
  }

  return { stripped, isGroups, hasGroups };
}

/** Checks whether a single CSS selector can match elements in the exercise document. */
export function selectorMatchesProfile(rawSelector: string, profile: DocCssProfile): boolean {
  const sel = rawSelector.trim();
  if (!sel) return false;
  if (isEditorOnlySelector(sel)) return false;

  // Always keep :root and :host variable blocks
  if (/^(:root|:host|html|\*|::before|::after|::backdrop|::file-selector-button)$/.test(sel)) {
    return true;
  }

  const { stripped, isGroups, hasGroups } = extractFunctionalPseudos(sel);

  // Check :is(...) / :where(...) groups: at least one option in each group must match
  for (const group of isGroups) {
    const options = splitSelectorList(group);
    if (options.length > 0 && !options.some(opt => selectorMatchesProfile(opt.replace(/^[>+~]\s*/, ''), profile))) {
      return false;
    }
  }

  // Check :has(...) groups: at least one option must match
  for (const group of hasGroups) {
    const options = splitSelectorList(group);
    if (options.length > 0 && !options.some(opt => selectorMatchesProfile(opt.replace(/^[>+~]\s*/, ''), profile))) {
      return false;
    }
  }

  // Extract attribute selectors [attr...] from stripped
  let withoutAttrs = '';
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === '\\') {
      withoutAttrs += stripped.slice(i, i + 2);
      i++;
      continue;
    }
    if (stripped[i] === '[') {
      const start = i + 1;
      i++;
      while (i < stripped.length && stripped[i] !== ']') {
        if (stripped[i] === '\\') i++;
        i++;
      }
      const content = stripped.slice(start, i).trim();
      const attrName = content.match(/^([a-zA-Z0-9_-]+)/)?.[1]?.toLowerCase();
      if (attrName && !profile.attrs.has(attrName)) {
        return false;
      }
      withoutAttrs += '*';
      continue;
    }
    withoutAttrs += stripped[i];
  }

  // Remove pseudo-elements and non-functional pseudo-classes (e.g. ::before, :hover, :focus-visible, ::-webkit-...)
  // Care is taken not to strip escaped colons `\:`.
  let withoutPseudos = '';
  for (let i = 0; i < withoutAttrs.length; i++) {
    if (withoutAttrs[i] === '\\') {
      withoutPseudos += withoutAttrs.slice(i, i + 2);
      i++;
      continue;
    }
    if (withoutAttrs[i] === ':') {
      i++;
      if (withoutAttrs[i] === ':') i++;
      while (i < withoutAttrs.length && /[a-zA-Z0-9_-]/.test(withoutAttrs[i])) i++;
      if (withoutAttrs[i] === '(') {
        let depth = 1;
        i++;
        while (i < withoutAttrs.length && depth > 0) {
          if (withoutAttrs[i] === '(') depth++;
          else if (withoutAttrs[i] === ')') depth--;
          i++;
        }
      }
      i--;
      withoutPseudos += '*';
      continue;
    }
    withoutPseudos += withoutAttrs[i];
  }

  // Extract class names (.foo) and IDs (#bar)
  const tokenRegex = /([.#])((?:\\.|[a-zA-Z0-9_-])+)/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(withoutPseudos)) !== null) {
    const kind = match[1];
    const ident = unescapeCssIdent(match[2]);
    if (kind === '.') {
      if (!profile.classes.has(ident)) return false;
    } else if (kind === '#') {
      if (!profile.ids.has(ident)) return false;
    }
  }

  // Remove class and ID tokens to inspect remaining element tag names
  const tagsOnly = withoutPseudos
    .replace(/([.#])((?:\\.|[a-zA-Z0-9_-])+)/g, '*')
    .replace(/[>+~]/g, ' ');

  for (const rawToken of tagsOnly.split(/\s+/)) {
    const tag = rawToken.replace(/\*/g, '').trim().toLowerCase();
    if (!tag || tag === '&') continue;
    if (/^[a-z][a-z0-9-]*$/.test(tag) && !profile.tags.has(tag)) {
      return false;
    }
  }

  return true;
}

/** Filters declarations inside a `:root` or `--tw-*` block to keep only matching properties. */
function filterRootDeclarations(body: string, shouldKeepProp: (prop: string) => boolean): string {
  const parts: string[] = [];
  let start = 0;
  let parenDepth = 0;
  for (let i = 0; i <= body.length; i++) {
    const ch = body[i];
    if (ch === '(') parenDepth++;
    else if (ch === ')' && parenDepth > 0) parenDepth--;
    else if ((ch === ';' || i === body.length) && parenDepth === 0) {
      const decl = body.slice(start, i).trim();
      start = i + 1;
      if (!decl) continue;
      const colon = decl.indexOf(':');
      if (colon === -1) continue;
      const prop = decl.slice(0, colon).trim();
      const val = decl.slice(colon + 1).trim();
      if (prop.startsWith('--')) {
        if (shouldKeepProp(prop)) {
          parts.push(`${prop}:${val}`);
        }
      } else {
        parts.push(`${prop}:${val}`);
      }
    }
  }
  return parts.join(';');
}

function compactDeclarations(body: string): string {
  return body
    .replace(/\s+/g, ' ')
    .replace(/\s*([:;{},])\s*/g, '$1')
    .replace(/;+}/g, '}')
    .replace(/;$/, '')
    .trim();
}

/**
 * Purges a CSS stylesheet against the given exercise HTML Document/Element,
 * retaining only `:root` theme variables, base resets for present elements,
 * and CSS rules matching classes/tags/attributes actually present in the exercise.
 */
export function purgeExerciseCSS(cssText: string, doc: Document | Element): string {
  const profile = buildDocCssProfile(doc);
  const cleanCss = stripCssComments(cssText);
  const topStatements = parseCssStatements(cleanCss);

  const rootThemeBlocks: { prelude: string; body: string }[] = [];
  const propertyBlocks: { name: string; raw: string }[] = [];
  const layerPropertiesBodies: string[] = [];
  const keyframeBlocks: { name: string; raw: string }[] = [];
  const keptChunks: string[] = [];

  const filterBlockStatements = (statements: CssStatement[], inThemeLayer = false, inPropertiesLayer = false): string => {
    const out: string[] = [];
    const seenRules = new Set<string>();
    for (const stmt of statements) {
      if (stmt.type === 'at-semi') {
        if (stmt.prelude.startsWith('@layer ')) {
          out.push(`${stmt.prelude.replace(/\s+/g, ' ')};`);
        }
        continue;
      }

      if (stmt.type === 'at-block') {
        const prel = stmt.prelude.replace(/\s+/g, ' ').trim();
        if (/^@font-face\b/i.test(prel)) {
          // Skip embedded base64 fonts so <style> remains < 20KB (fonts load via Google Fonts <link>)
          if (/url\([^)]*data:/i.test(stmt.body)) continue;
          out.push(`${prel}{${compactDeclarations(stmt.body)}}`);
          continue;
        }
        if (/^@keyframes\b/i.test(prel)) {
          const kfName = prel.replace(/^@keyframes\s+/i, '').trim();
          keyframeBlocks.push({ name: kfName, raw: `${prel}{${compactDeclarations(stmt.body)}}` });
          continue;
        }
        if (/^@property\b/i.test(prel)) {
          const propName = prel.replace(/^@property\s+/i, '').trim();
          propertyBlocks.push({ name: propName, raw: `${prel}{${compactDeclarations(stmt.body)}}` });
          continue;
        }
        if (/^@layer\s+theme\b/i.test(prel)) {
          filterBlockStatements(parseCssStatements(stmt.body), true, false);
          continue;
        }
        if (/^@layer\s+properties\b/i.test(prel)) {
          layerPropertiesBodies.push(stmt.body);
          continue;
        }
        if (/^@(layer|media|supports|container)\b/i.test(prel)) {
          if (/^@container\s+element-catalog\b/i.test(prel)) continue;
          const inner = filterBlockStatements(parseCssStatements(stmt.body), inThemeLayer, inPropertiesLayer);
          if (inner) out.push(`${prel}{${inner}}`);
          continue;
        }
        continue;
      }

      if (stmt.type === 'rule') {
        const selectors = splitSelectorList(stmt.prelude);
        if (inThemeLayer || selectors.every(s => s === ':root' || s === ':host')) {
          rootThemeBlocks.push({ prelude: selectors.join(','), body: stmt.body });
          continue;
        }
        // Skip React shell layout rule (`html, body, #root { height: 100%; overflow: hidden }`)
        if (selectors.includes('#root')) {
          continue;
        }

        const matchedSelectors = selectors.filter(s => selectorMatchesProfile(s, profile));
        if (matchedSelectors.length === 0) continue;

        // Check if rule body contains nested blocks (e.g., .container { @media ... })
        const childStmts = parseCssStatements(stmt.body);
        if (childStmts.some(c => c.type === 'at-block' || c.type === 'rule')) {
          const ruleStr = `${matchedSelectors.join(',')}{${compactDeclarations(stmt.body)}}`;
          if (!seenRules.has(ruleStr)) {
            seenRules.add(ruleStr);
            out.push(ruleStr);
          }
        } else {
          const body = compactDeclarations(stmt.body);
          if (body) {
            const ruleStr = `${matchedSelectors.join(',')}{${body}}`;
            if (!seenRules.has(ruleStr)) {
              seenRules.add(ruleStr);
              out.push(ruleStr);
            }
          }
        }
      }
    }
    return out.join('');
  };

  const mainCss = filterBlockStatements(topStatements);
  if (mainCss) keptChunks.push(mainCss);

  // Collect all referenced custom properties (--*) and keyframe names from kept CSS + inline styles
  const usedVars = new Set<string>(CORE_THEME_VARS);
  for (const v of profile.inlineVars) usedVars.add(v);

  const combinedKept = keptChunks.join('\n');
  for (const match of combinedKept.matchAll(/--[\w-]+/g)) {
    usedVars.add(match[0]);
  }

  // Resolve transitive variable references inside :root blocks (e.g. --default-font-family: var(--font-sans))
  const allRootDeclarations = new Map<string, string>();
  for (const block of rootThemeBlocks) {
    for (const m of block.body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) {
      allRootDeclarations.set(m[1].trim(), m[2].trim());
    }
  }
  let addedVar = true;
  while (addedVar) {
    addedVar = false;
    for (const v of Array.from(usedVars)) {
      const val = allRootDeclarations.get(v);
      if (!val) continue;
      for (const ref of val.matchAll(/--[\w-]+/g)) {
        if (!usedVars.has(ref[0])) {
          usedVars.add(ref[0]);
          addedVar = true;
        }
      }
    }
  }

  // Build purged :root block with institutional variables + used theme variables
  const rootDecls: string[] = [];
  const emittedVars = new Set<string>();
  for (const [prop, val] of allRootDeclarations.entries()) {
    if (usedVars.has(prop) && !emittedVars.has(prop)) {
      emittedVars.add(prop);
      rootDecls.push(`${prop}:${val.replace(/\s+/g, ' ').trim()}`);
    }
  }
  // Ensure core institutional variables are always present even if input CSS lacked @layer theme
  const fallbackCore: Record<string, string> = {
    '--color-anahuac-orange': '#ff5900',
    '--color-anahuac-purple': '#5d428c',
    '--color-anahuac-light': '#f7f7f7',
    '--color-anahuac-gray': '#cdd5dc',
    '--color-anahuac-dark': '#646464',
    '--font-sans': '"Roboto",sans-serif',
    '--font-serif': '"Zilla Slab",serif',
    '--font-lato': '"Lato",sans-serif',
    '--spacing': '0.25rem',
  };
  for (const [prop, val] of Object.entries(fallbackCore)) {
    if (!emittedVars.has(prop)) {
      emittedVars.add(prop);
      rootDecls.push(`${prop}:${val}`);
    }
  }

  const finalParts: string[] = [];
  if (rootDecls.length > 0) {
    finalParts.push(`:root,:host{${rootDecls.join(';')}}`);
  }
  if (mainCss) {
    finalParts.push(mainCss);
  }

  // Keep only referenced @keyframes
  for (const kf of keyframeBlocks) {
    const escapedName = kf.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|[^\\w-])${escapedName}([^\\w-]|$)`).test(combinedKept)) {
      finalParts.push(kf.raw);
    }
  }

  // Keep only referenced @property --tw-* and their @layer properties initializers
  const keptProps = propertyBlocks.filter(p => usedVars.has(p.name));
  if (keptProps.length > 0) {
    for (const p of keptProps) finalParts.push(p.raw);
    for (const body of layerPropertiesBodies) {
      const innerMatch = body.match(/\{([^{}]*)\}\s*\}\s*$/);
      if (innerMatch) {
        const filteredDecls = filterRootDeclarations(innerMatch[1], prop => usedVars.has(prop));
        if (filteredDecls) {
          finalParts.push(`@layer properties{@supports ((-webkit-hyphens:none) and (not (margin-trim:inline))) or ((-moz-orient:inline) and (not (color:rgb(from red r g b)))){*,::before,::after,::backdrop{${filteredDecls}}}}`);
        }
      }
    }
  }

  return finalParts.join('');
}

/**
 * Ensures Google Fonts <link> stylesheets for the used font families are present in <head>
 * and strips any legacy inline base64 @font-face blocks, keeping <style> under 20KB.
 */
export function ensureExternalFontLinks(doc: Document): void {
  const usedFamilies = new Set(['Roboto']);
  if (doc.querySelector('h1,h2,h3,h4,.font-serif')) usedFamilies.add('Zilla Slab');
  if (doc.querySelector('.font-lato')) usedFamilies.add('Lato');
  doc.querySelectorAll<HTMLElement>('[style]').forEach(el => {
    for (const family of ['Roboto', 'Zilla Slab', 'Lato']) {
      if (el.style.fontFamily.includes(family)) usedFamilies.add(family);
    }
  });
  const icons =
    Array.from(doc.querySelectorAll('.material-symbols-outlined'))
      .map(el => el.textContent?.trim() || '')
      .join('') +
    (doc.querySelector('.student-rich-answer')
      ? 'format_boldformat_italicformat_underlinedformat_list_bulletedformat_list_numberedformat_align_leftformat_align_centerformat_align_rightundoredo'
      : '');
  if (icons) usedFamilies.add('Material Symbols Outlined');

  // Remove existing Google Fonts links and replace with clean, minimal links for only usedFamilies
  doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"],link[rel="preconnect"]').forEach(link => {
    if (link.href.includes('fonts.googleapis.com') || link.href.includes('fonts.gstatic.com')) {
      link.remove();
    }
  });

  const textFamilies: string[] = [];
  if (usedFamilies.has('Lato')) textFamilies.push('family=Lato:ital,wght@0,300;0,400;0,700;1,400');
  if (usedFamilies.has('Roboto')) textFamilies.push('family=Roboto:wght@300;400;500;700');
  if (usedFamilies.has('Zilla Slab')) textFamilies.push('family=Zilla+Slab:wght@400;600;700');

  if (textFamilies.length > 0) {
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${textFamilies.join('&')}&display=swap`;
    doc.head.prepend(link);
  }

  if (usedFamilies.has('Material Symbols Outlined')) {
    const iconChars = Array.from(new Set(icons)).sort().join('');
    const iconLink = doc.createElement('link');
    iconLink.rel = 'stylesheet';
    const textParam = iconChars ? `&text=${encodeURIComponent(iconChars)}` : '';
    iconLink.href = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0${textParam}`;
    doc.head.append(iconLink);
  }
}

/**
 * Optimizes all <style> blocks inside an already-built student exercise Document
 * so that even previously saved exercises on the canvas have their <style> purged below 20KB.
 */
export function optimizeStudentDocumentStyles(doc: Document): void {
  ensureExternalFontLinks(doc);
  doc.body?.removeAttribute('style');

  const modularStyleEl = doc.head.querySelector<HTMLStyleElement>('style[data-modular-styles]');
  if (modularStyleEl && modularStyleEl.textContent) {
    modularStyleEl.textContent = purgeExerciseCSS(modularStyleEl.textContent, doc);
  }

  const regularStyles = Array.from(doc.head.querySelectorAll<HTMLStyleElement>('style:not([data-modular-styles])'));
  if (regularStyles.length === 0) return;

  const combinedRaw = regularStyles
    .map(s => (s.textContent || '').replace(/html,body\{margin:0;padding:0;min-height:0\}body\{background:transparent\}/g, ''))
    .join('\n');
  const purged = purgeExerciseCSS(combinedRaw, doc);

  const primary = regularStyles[0];
  primary.textContent = purged;
  for (let i = 1; i < regularStyles.length; i++) {
    regularStyles[i].remove();
  }
}
