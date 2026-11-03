import test from 'node:test';
import assert from 'node:assert/strict';
import {escapeHtml, sanitizeHref} from './html-sanitize';
import {buildReferenciaItemBodyHTML, isPageTemplateType, parseReferencesText} from './references';

test('escapeHtml escapes HTML tags, quotes, and ampersands', () => {
  assert.equal(
    escapeHtml('Autor (2025). <https://anahuac.mx/recurso?a=1&b="2">'),
    'Autor (2025). &lt;https://anahuac.mx/recurso?a=1&amp;b=&quot;2&quot;&gt;',
  );
});

test('sanitizeHref allows safe protocols and blocks javascript URLs', () => {
  assert.equal(sanitizeHref('https://anahuac.mx/curso'), 'https://anahuac.mx/curso');
  assert.equal(sanitizeHref('anahuac.mx/curso'), 'https://anahuac.mx/curso');
  assert.equal(sanitizeHref('javascript:alert(1)', '#'), '#');
  assert.equal(sanitizeHref('data:text/html,<script>alert(1)</script>', ''), '');
});

test('parseReferencesText extracts APA/IEEE references including angle-bracketed URLs', () => {
  const input = [
    'Apellido, N. (2024). Título del artículo. Disponible en <https://ejemplo.org/articulo>.',
    'Organización Mundial de la Salud. (2023). Informe anual. https://who.int/report, consultado en mayo.',
    'Referencia impresa sin enlace web.',
  ].join('\n');

  const entries = parseReferencesText(input);
  assert.deepEqual(entries, [
    {
      text: 'Apellido, N. (2024). Título del artículo. Disponible en',
      url: 'https://ejemplo.org/articulo',
    },
    {
      text: 'Organización Mundial de la Salud. (2023). Informe anual.',
      url: 'https://who.int/report',
    },
    {
      text: 'consultado en mayo.',
      url: '',
    },
    {
      text: 'Referencia impresa sin enlace web.',
      url: '',
    },
  ]);
});

test('buildReferenciaItemBodyHTML escapes reference text and sanitizes link URL', () => {
  const {safeText, linkHTML} = buildReferenciaItemBodyHTML('Cita con <etiqueta> & "comillas"', 'https://anahuac.mx/doc?x="1"');
  assert.equal(safeText, 'Cita con &lt;etiqueta&gt; &amp; &quot;comillas&quot;');
  assert.ok(!safeText.includes('<etiqueta>'));
  assert.match(linkHTML, /href="https:\/\/anahuac\.mx\/doc\?x=%221%22"/);

  const blocked = buildReferenciaItemBodyHTML('Cita segura', 'javascript:alert(1)');
  assert.equal(blocked.linkHTML, '');
});

test('isPageTemplateType identifies full-page templates', () => {
  assert.equal(isPageTemplateType('bienvenida'), true);
  assert.equal(isPageTemplateType('pagina_basica'), true);
  assert.equal(isPageTemplateType('pagina_foda'), true);
  assert.equal(isPageTemplateType('parrafo_basico'), false);
  assert.equal(isPageTemplateType('tabla_modular'), false);
});
