import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { purgeExerciseCSS, selectorMatchesProfile, buildDocCssProfile } from './exercise-css-purge';

function createMockDoc(opts: {
  classes?: string[];
  tags?: string[];
  ids?: string[];
  attrs?: Array<{ name: string; value: string }>;
  hasInteractiveButton?: boolean;
}) {
  const elements = [
    {
      tagName: 'DIV',
      id: opts.ids?.[0] || '',
      getAttribute: (name: string) => (name === 'class' ? (opts.classes || []).join(' ') : null),
      attributes: [
        { name: 'class', value: (opts.classes || []).join(' ') },
        ...(opts.attrs || []),
      ],
    },
    ...(opts.tags || []).map(tag => ({
      tagName: tag.toUpperCase(),
      id: '',
      getAttribute: () => null,
      attributes: [],
    })),
  ];

  return {
    tagName: 'HTML',
    id: '',
    getAttribute: () => null,
    attributes: [],
    querySelector: (sel: string) => {
      if (sel === '[data-type="boton_interactivo"]') return opts.hasInteractiveButton ? {} : null;
      return null;
    },
    querySelectorAll: () => elements,
  } as any;
}

test('purgeExerciseCSS keeps :root institutional variables and only used classes', () => {
  const sampleCss = `
    @layer theme {
      :root, :host {
        --color-anahuac-orange: #ff5900;
        --color-anahuac-purple: #5d428c;
        --color-gray-700: #374151;
        --color-unused-pink: #ff00ff;
        --spacing: 0.25rem;
      }
    }
    @layer utilities {
      .flex { display: flex; }
      .gap-4 { gap: calc(var(--spacing) * 4); }
      .text-anahuac-orange { color: var(--color-anahuac-orange); }
      .text-gray-700 { color: var(--color-gray-700); }
      .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .text-\\[15px\\] { font-size: 15px; }
      .w-1\\/2 { width: 50%; }
      .unused-utility-class { color: var(--color-unused-pink); }
      .dark\\:bg-gray-900:is(.dark *) { background: #111; }
    }
    .block-toolbar { opacity: 0; }
    .project-header { display: grid; }
    .shepherd-element { z-index: 10002; }
    .list-custom { padding-left: 2rem; }
  `;

  const doc = createMockDoc({
    classes: ['flex', 'gap-4', 'text-anahuac-orange', 'text-gray-700', 'md:grid-cols-2', 'text-[15px]', 'w-1/2', 'list-custom'],
    tags: ['div', 'p', 'ul', 'li'],
  });

  const purged = purgeExerciseCSS(sampleCss, doc);

  // Keeps institutional variables and referenced variables
  assert.ok(purged.includes('--color-anahuac-orange:#ff5900'));
  assert.ok(purged.includes('--color-anahuac-purple:#5d428c'));
  assert.ok(purged.includes('--color-gray-700:#374151'));
  // Drops unreferenced non-core variables
  assert.ok(!purged.includes('--color-unused-pink'));

  // Keeps used utility and component classes
  assert.ok(purged.includes('.flex{display:flex}'));
  assert.ok(purged.includes('.gap-4{'));
  assert.ok(purged.includes('.text-anahuac-orange{'));
  assert.ok(purged.includes('.md\\:grid-cols-2{'));
  assert.ok(purged.includes('.text-\\[15px\\]{'));
  assert.ok(purged.includes('.w-1\\/2{'));
  assert.ok(purged.includes('.list-custom{'));

  // Drops unused utilities and editor-only styles
  assert.ok(!purged.includes('unused-utility-class'));
  assert.ok(!purged.includes('dark\\:bg-gray-900'));
  assert.ok(!purged.includes('.block-toolbar'));
  assert.ok(!purged.includes('.project-header'));
  assert.ok(!purged.includes('.shepherd-element'));
});

test('purgeExerciseCSS strips embedded base64 @font-face rules and deduplicates rules', () => {
  const cssWithBase64Font = `
    @font-face {
      font-family: 'Roboto';
      src: url("data:font/woff2;base64,${'A'.repeat(40000)}") format('woff2');
    }
    .student-answer { box-sizing: border-box; }
    .student-answer { box-sizing: border-box; }
  `;
  const doc = createMockDoc({ classes: ['student-answer'], tags: ['textarea'] });
  const purged = purgeExerciseCSS(cssWithBase64Font, doc);

  assert.ok(!purged.includes('data:font/woff2'));
  assert.equal(purged.split('.student-answer{box-sizing:border-box}').length - 1, 1);
});

test('purgeExerciseCSS keeps <style> well below 20KB across index.css and modular.css', () => {
  const indexCss = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
  const editorControlsCss = readFileSync(new URL('./editor-controls.css', import.meta.url), 'utf8');
  const modularCss = readFileSync(new URL('./modular.css', import.meta.url), 'utf8');
  const interactiveBtnCss = readFileSync(new URL('./interactive-button.css', import.meta.url), 'utf8');

  // Simulate a large ~130KB stylesheet combining all custom stylesheets + 1000 synthetic Tailwind utilities
  const syntheticUtilities = Array.from({ length: 1000 }, (_, i) => `.tw-unused-${i}{padding:${i}px;margin:${i}px;color:var(--color-gray-700)}`).join('\n');
  const fullStylesheet = `@layer utilities { ${syntheticUtilities} .flex{display:flex} .grid{display:grid} .p-8{padding:2rem} }\n${editorControlsCss}\n${indexCss}\n${interactiveBtnCss}`;

  const doc = createMockDoc({
    classes: [
      'anahuac-builder-export', 'parallax-container', 'flex', 'grid', 'p-8',
      'list-custom', 'list-numbers', 'flipcard-item', 'flipcard-inner', 'flipcard-front', 'flipcard-back',
      'table-container', 'student-answer', 'exercise-finish',
    ],
    tags: ['div', 'section', 'h2', 'p', 'ol', 'li', 'table', 'tr', 'td', 'textarea', 'button', 'details', 'summary'],
  });

  const purgedMain = purgeExerciseCSS(fullStylesheet, doc);
  const purgedModular = purgeExerciseCSS(modularCss, createMockDoc({
    classes: ['modular-table', 'mod-published', 'mod-shell', 'mod-scroll', 'mod-grid', 'mod-cell', 'mod-card', 'mod-text', 'student-rich-answer'],
    tags: ['section', 'div'],
  }));

  const byteLengthMain = Buffer.byteLength(purgedMain, 'utf8');
  const byteLengthModular = Buffer.byteLength(purgedModular, 'utf8');

  assert.ok(byteLengthMain < 20 * 1024, `Expected main <style> to be < 20KB, got ${byteLengthMain} bytes`);
  assert.ok(byteLengthModular < 5 * 1024, `Expected modular <style> to be < 5KB, got ${byteLengthModular} bytes`);
  assert.ok(purgedMain.includes('--color-anahuac-orange:#ff5900'));
  assert.ok(purgedMain.includes('.list-custom'));
  assert.ok(purgedMain.includes('.flipcard-item.is-flipped .flipcard-inner'));
});

test('selectorMatchesProfile activates runtime classes for tabs, flipcards, and interactive buttons', () => {
  const doc = createMockDoc({
    classes: ['lms-tab-pane', 'flipcard-item'],
    tags: ['div', 'button'],
    hasInteractiveButton: true,
  });
  const profile = buildDocCssProfile(doc);

  assert.equal(selectorMatchesProfile('.border-anahuac-orange', profile), true);
  assert.equal(selectorMatchesProfile('.flipcard-item.is-flipped .flipcard-inner', profile), false); // flipcard-inner not in doc yet
  profile.classes.add('flipcard-inner');
  assert.equal(selectorMatchesProfile('.flipcard-item.is-flipped .flipcard-inner', profile), true);
  assert.equal(selectorMatchesProfile('.ib-open', profile), true);
});
