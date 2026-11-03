import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeColor,
  normalizeAlign,
  parsePastedTable,
  parseHtmlTable,
  parseTsvTable,
  cleanInnerMarkup,
} from './table-paste-parser';

test('normaliza colores hex, rgb y nombres CSS descartando transparentes y vacíos', () => {
  assert.equal(normalizeColor('#4472C4'), '#4472c4');
  assert.equal(normalizeColor('#fff'), '#fff');
  assert.equal(normalizeColor('rgb(68, 114, 196)'), 'rgb(68, 114, 196)');
  assert.equal(normalizeColor('rgba(68, 114, 196, 0.8)'), 'rgba(68, 114, 196, 0.8)');
  assert.equal(normalizeColor('white'), 'white');
  assert.equal(normalizeColor('black'), 'black');

  // Ignorados
  assert.equal(normalizeColor(undefined), undefined);
  assert.equal(normalizeColor(''), undefined);
  assert.equal(normalizeColor('none'), undefined);
  assert.equal(normalizeColor('transparent'), undefined);
  assert.equal(normalizeColor('rgba(0, 0, 0, 0)'), undefined);
  assert.equal(normalizeColor('inherit'), undefined);
});

test('normaliza alineaciones de texto válidas', () => {
  assert.equal(normalizeAlign('center'), 'center');
  assert.equal(normalizeAlign('CENTER'), 'center');
  assert.equal(normalizeAlign('right'), 'right');
  assert.equal(normalizeAlign('left'), 'left');
  assert.equal(normalizeAlign('justify'), 'justify');
  assert.equal(normalizeAlign('invalid'), undefined);
  assert.equal(normalizeAlign(''), undefined);
});

test('limpia y sanitiza HTML interno de celdas preservando estilos ricos seguros', () => {
  const dirty = `
    <p class="MsoNormal">
      <b><span>Texto en negrita</span></b>
      <script>alert(1)</script>
      <o:p></o:p>
    </p>
    <p class="MsoNormal">
      <i><span style="color:#ff5900">Texto cursiva naranja</span></i>
      <a href="https://example.com">Enlace</a>
    </p>
  `;
  const result = cleanInnerMarkup(dirty);
  assert.ok(!result.html.includes('<script'));
  assert.ok(!result.html.includes('<o:p'));
  assert.ok(result.html.includes('<b>Texto en negrita</b>'));
  assert.ok(result.html.includes('<i>'));
  assert.ok(result.html.includes('color:#ff5900'));
  assert.ok(result.html.includes('href="https://example.com'));
  assert.ok(result.html.includes('<br>'));
  assert.ok(result.text.includes('Texto en negrita'));
  assert.ok(result.text.includes('Texto cursiva naranja'));
});

test('parses Google Slides table with background colors, colspan and rich formatting', () => {
  const slidesHtml = `
    <meta charset='utf-8'>
    <google-sheets-html-origin>
    <table style="border-collapse:collapse;">
      <tbody>
        <tr>
          <td style="border:1px solid #000;background-color:#4285f4;padding:7px;text-align:center;">
            <p dir="ltr" style="line-height:1.2;text-align:center;margin-top:0pt;margin-bottom:0pt;">
              <span style="font-size:11pt;color:#ffffff;font-weight:700;">Título Google</span>
            </p>
          </td>
          <td style="border:1px solid #000;background-color:#4285f4;padding:7px;text-align:center;" colspan="2">
            <p dir="ltr" style="line-height:1.2;text-align:center;margin-top:0pt;margin-bottom:0pt;">
              <span style="font-size:11pt;color:#ffffff;font-weight:700;">Columna Combinada</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="border:1px solid #000;background-color:#ffffff;padding:7px;">
            <p dir="ltr"><span style="color:#000000;">Dato 1</span></p>
          </td>
          <td style="border:1px solid #000;background-color:#ffffff;padding:7px;">
            <p dir="ltr"><b><span style="color:#000000;">Dato 2 Negrita</span></b></p>
          </td>
          <td style="border:1px solid #000;background-color:#ffffff;padding:7px;">
            <p dir="ltr"><span style="color:#000000;">Dato 3</span></p>
          </td>
        </tr>
      </tbody>
    </table>
  `;

  const parsed = parseHtmlTable(slidesHtml);
  assert.ok(parsed);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.maxCols, 3);
  assert.equal(parsed.hasCustomFormatting, true);

  // Header row
  const row0 = parsed.rows[0];
  assert.equal(row0.isHeaderRow, true);
  assert.equal(row0.cells.length, 2);

  const cell0 = row0.cells[0];
  assert.equal(cell0.text, 'Título Google');
  assert.equal(cell0.customBg, '#4285f4');
  assert.equal(cell0.textAlign, 'center');
  assert.equal(cell0.colSpan, 1);

  const cell1 = row0.cells[1];
  assert.equal(cell1.text, 'Columna Combinada');
  assert.equal(cell1.colSpan, 2);
  assert.equal(cell1.customBg, '#4285f4');

  // Body row
  const row1 = parsed.rows[1];
  assert.equal(row1.isHeaderRow, false);
  assert.equal(row1.cells.length, 3);
  assert.ok(row1.cells[1].html.includes('<b>Dato 2 Negrita</b>'));
});

test('parses PowerPoint (PPTX) MsoNormalTable with colors, rowspan and office markup', () => {
  const pptxHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office">
    <body>
    <!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
    <table class=MsoNormalTable border=0 cellspacing=0 cellpadding=0 style='border-collapse:collapse;'>
     <tr style='height:24.0pt'>
      <td width=180 style='width:135.0pt;background:#4472C4;padding:0cm 5.4pt 0cm 5.4pt'>
      <p class=MsoNormal align=center style='text-align:center'><b><span style='font-size:11.0pt;color:white'>Encabezado PPT</span></b><o:p></o:p></p>
      </td>
      <td width=180 style='width:135.0pt;background:#4472C4;padding:0cm 5.4pt 0cm 5.4pt'>
      <p class=MsoNormal align=center style='text-align:center'><b><span style='font-size:11.0pt;color:white'>Métrica</span></b><o:p></o:p></p>
      </td>
     </tr>
     <tr style='height:24.0pt'>
      <td width=180 style='width:135.0pt;background:#D9E1F2;padding:0cm 5.4pt 0cm 5.4pt' rowspan=2>
      <p class=MsoNormal><b><span style='font-size:10.5pt;color:#203764'>Fila Agrupada</span></b><o:p></o:p></p>
      </td>
      <td width=180 style='width:135.0pt;background:#F2F2F2;padding:0cm 5.4pt 0cm 5.4pt'>
      <p class=MsoNormal><span style='font-size:10.5pt;color:#333333'>150 unidades</span><o:p></o:p></p>
      </td>
     </tr>
     <tr style='height:24.0pt'>
      <td width=180 style='width:135.0pt;background:white;padding:0cm 5.4pt 0cm 5.4pt'>
      <p class=MsoNormal><span style='font-size:10.5pt;color:#333333'>200 unidades</span><o:p></o:p></p>
      </td>
     </tr>
    </table>
    </body>
    </html>
  `;

  const parsed = parseHtmlTable(pptxHtml);
  assert.ok(parsed);
  assert.equal(parsed.rows.length, 3);
  assert.equal(parsed.maxCols, 2);

  // Row 0
  assert.equal(parsed.rows[0].cells[0].customBg, '#4472c4');
  assert.equal(parsed.rows[0].cells[0].textAlign, 'center');
  assert.equal(parsed.rows[0].cells[0].text, 'Encabezado PPT');

  // Row 1 with rowspan=2
  const groupedCell = parsed.rows[1].cells[0];
  assert.equal(groupedCell.rowSpan, 2);
  assert.equal(groupedCell.customBg, '#d9e1f2');
  assert.equal(groupedCell.text, 'Fila Agrupada');

  // Row 2
  assert.equal(parsed.rows[2].cells[0].text, '200 unidades');
});

test('parses Excel HTML table with rich inline styles', () => {
  const excelHtml = `
    <table border=0 cellpadding=0 cellspacing=0 width=288>
     <tr>
      <td style='background-color:#ED7D31;color:#ffffff;text-align:center;'><b>Producto</b></td>
      <td style='background-color:#ED7D31;color:#ffffff;text-align:center;'><b>Precio</b></td>
     </tr>
     <tr>
      <td style='background-color:#FCE4D6;text-align:left;'>Curso A</td>
      <td style='background-color:#FCE4D6;text-align:right;'>$100.00</td>
     </tr>
    </table>
  `;

  const parsed = parseHtmlTable(excelHtml);
  assert.ok(parsed);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].cells[0].customBg, '#ed7d31');
  assert.equal(parsed.rows[1].cells[1].textAlign, 'right');
  assert.equal(parsed.rows[1].cells[1].text, '$100.00');
});

test('parses plain TSV table fallback correctly', () => {
  const tsv = "Encabezado 1\tEncabezado 2\tEncabezado 3\nValor A\tValor B\tValor C\nValor D\tValor E\tValor F";
  const parsed = parseTsvTable(tsv);
  assert.ok(parsed);
  assert.equal(parsed.rows.length, 3);
  assert.equal(parsed.maxCols, 3);
  assert.equal(parsed.hasCustomFormatting, false);

  assert.equal(parsed.rows[0].isHeaderRow, true);
  assert.equal(parsed.rows[0].cells[0].text, 'Encabezado 1');
  assert.equal(parsed.rows[1].isHeaderRow, false);
  assert.equal(parsed.rows[1].cells[1].text, 'Valor B');
});

test('parsePastedTable prioritizes rich HTML table over plain text when available', () => {
  const html = `<table><tr><td style="background-color:#4472c4"><b>Rico</b></td></tr><tr><td>Dato</td></tr></table>`;
  const text = "Plano\nDato";

  const parsed = parsePastedTable({ html, text });
  assert.ok(parsed);
  assert.equal(parsed.hasCustomFormatting, true);
  assert.equal(parsed.rows[0].cells[0].customBg, '#4472c4');
  assert.ok(parsed.rows[0].cells[0].html.includes('<b>Rico</b>'));
});

test('parsePastedTable falls back to TSV text when no HTML table exists', () => {
  const text = "Col 1\tCol 2\nVal 1\tVal 2";
  const parsed = parsePastedTable({ text, html: "<p>Solo un parrafo</p>" });
  assert.ok(parsed);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].cells[0].text, 'Col 1');
});
