import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlowModel, normalizeFlowModel, addFlowNode, duplicateFlowNode, removeFlowNode, addFlowEdge, addFlowLane, flowNodeTypes } from './flow-model';
import { renderFlowSVG } from './flow-svg';

test('el lienzo vacío tiene valores propios y cada figura usa un identificador nuevo', () => {
  const model = createFlowModel(), other = createFlowModel();
  assert.equal(model.width, 1200); assert.equal(model.height, 720); assert.equal(model.background, '#ffffff');
  for (const descriptor of flowNodeTypes) addFlowNode(model, descriptor.type);
  assert.equal(model.nodes.length, 8); assert.equal(other.nodes.length, 0);
  assert.equal(new Set(model.nodes.map(node => node.id)).size, 8);
  assert.equal(new Set(model.nodes.map(node => node.type)).size, 8);
});

test('normaliza estados malformados, límites, colores y referencias de conexión', () => {
  const model = normalizeFlowModel({ width: -1, height: Infinity, background: 'url(javascript:alert(1))', nodes: [null, { id: '<bad>', type: 'unknown', width: 99999, height: -4, x: 9000, y: -1, fill: 'url(#foreign)', stroke: 'red\" onload=\"evil', textColor: '#FFF', fontSize: 999 }, { id: 'valid', x: NaN }], edges: [{ from: '<bad>', to: 'valid', id: '\" onclick=\"evil', color: 'javascript:evil' }, { from: 'missing', to: 'valid' }, { from: 'valid', to: 'valid' }], lanes: [null, { id: 'valid', width: 99999, height: -2 }] });
  assert.equal(model.width, 320); assert.equal(model.height, 240); assert.equal(model.background, '#ffffff');
  assert.equal(model.nodes.length, 2); assert.equal(model.edges.length, 1); assert.equal(model.lanes.length, 1);
  assert.equal(model.nodes[0].width, 320); assert.equal(model.nodes[0].height, 32); assert.equal(model.nodes[0].x, 0); assert.equal(model.nodes[0].y, 0);
  assert.equal(model.nodes[0].type, 'process'); assert.equal(model.nodes[0].fill, '#f3eef9'); assert.equal(model.nodes[0].textColor, '#fff');
  assert.equal(model.edges[0].from, model.nodes[0].id); assert.equal(model.edges[0].to, 'valid');
  assert.equal(model.edges[0].color, '#5d428c');
  assert.equal(new Set([...model.nodes, ...model.edges, ...model.lanes].map(item => item.id)).size, 4);
  assert.deepEqual(normalizeFlowModel(null), createFlowModel());
});

test('duplicar es independiente, mantiene límites y eliminar borra conexiones asociadas', () => {
  const model = createFlowModel(), first = addFlowNode(model, 'process', 1200, 720), second = addFlowNode(model, 'decision', 400, 400);
  assert.equal(addFlowEdge(model, first.id, first.id), null); assert.equal(addFlowEdge(model, first.id, 'missing'), null);
  const edge = addFlowEdge(model, first.id, second.id, { route: 'curve', dash: 'dotted', label: 'Sí' });
  assert.ok(edge); assert.equal(edge.route, 'curve');
  const copy = duplicateFlowNode(model, first.id)!;
  assert.notEqual(copy.id, first.id); assert.ok(copy.x + copy.width <= model.width); assert.ok(copy.y + copy.height <= model.height);
  copy.text = 'Otro'; assert.notEqual(copy.text, first.text); assert.equal(model.edges.length, 1);
  removeFlowNode(model, first.id); assert.equal(model.edges.length, 0); assert.equal(model.nodes.length, 2);
  assert.equal(duplicateFlowNode(model, 'missing'), null);
});

test('serializar y reabrir conserva figuras, carriles, texto, estilos y líneas', () => {
  const model = createFlowModel(), first = addFlowNode(model, 'document'), second = addFlowNode(model, 'data', 600, 300);
  addFlowLane(model); model.nodes[0].text = 'Primera línea\nSegunda línea';
  addFlowEdge(model, first.id, second.id, { fromSide: 'right', toSide: 'top', startArrow: true, endArrow: false, width: 4, color: '#ff5900', dash: 'dashed' });
  assert.deepEqual(normalizeFlowModel(JSON.parse(JSON.stringify(model))), model);
});

test('el SVG escapa todo texto y restringe los atributos de diagramas importados', () => {
  const model = createFlowModel(), first = addFlowNode(model, 'process'), second = addFlowNode(model, 'circle', 600, 300);
  model.title = '<script>alert("x")</script>';
  first.text = '<img src=x onerror=alert(1)>';
  const lane = addFlowLane(model); lane.title = '<svg onload="evil">';
  addFlowEdge(model, first.id, second.id, { label: '<a href="javascript:evil">' });
  (first as unknown as { fill: string }).fill = 'url(https://evil.test/a.svg)';
  const svg = renderFlowSVG(model, { scope: '\"><script>bad</script>' });
  assert.ok(svg.includes('&lt;script&gt;')); assert.ok(svg.includes('&lt;img')); assert.ok(svg.includes('&lt;svg'));
  assert.ok(!svg.includes('<script')); assert.ok(!svg.includes('<img')); assert.ok(!svg.includes('https://evil')); assert.ok(!svg.includes('foreignObject'));
  assert.ok(!svg.includes('onload="evil"')); assert.ok(!/\s(?:href|xlink:href)="/.test(svg));
  assert.match(svg, /^<svg xmlns=/); assert.match(svg, /role="img" aria-labelledby=/);
  assert.match(svg, /aria-label="&lt;img src=x onerror=alert\(1\)&gt;"/);
  assert.match(svg, /<desc id="[a-zA-Z0-9_-]+">Áreas: &lt;svg onload=&quot;evil&quot;&gt;/);
  const describedId = svg.match(/aria-describedby="([^"]+)"/)![1];
  assert.ok(svg.includes(`<desc id="${describedId}">`));
});

test('renderiza siete figuras, tres rutas, flechas y etiquetas con texto ajustado', () => {
  const model = createFlowModel();
  const nodes = flowNodeTypes.map((descriptor, index) => addFlowNode(model, descriptor.type, 40 + index * 140, index % 2 ? 300 : 80));
  nodes[0].text = 'Texto extenso para ajustar en varias líneas dentro de una figura';
  for (const [index, route] of (['orthogonal', 'straight', 'curve'] as const).entries()) addFlowEdge(model, nodes[index].id, nodes[index + 1].id, { route, startArrow: true, endArrow: true, label: 'Continuar', dash: index === 1 ? 'dotted' : 'dashed' });
  const svg = renderFlowSVG(model, { scope: 'test' });
  assert.match(svg, /<polygon/); assert.match(svg, /<ellipse/); assert.match(svg, /<path d="M 0 0 H/);
  assert.ok(svg.includes(' C ')); assert.ok(svg.includes(' Q ')); assert.ok(svg.includes('marker-start=')); assert.ok(svg.includes('marker-end='));
  assert.ok(svg.includes('stroke-dasharray="1 6"')); assert.ok((svg.match(/<tspan/g) || []).length > nodes.length);
  assert.ok(!svg.includes('data-flow-resize')); assert.ok(!svg.includes('data-flow-port')); assert.ok(!svg.includes('<pattern'));
  assert.equal(renderFlowSVG(model, { scope: 'test' }), svg);
  assert.notEqual(renderFlowSVG(model, { scope: 'other' }), svg);
});

test('controles y cuadrícula solo están en el lienzo interactivo seleccionado', () => {
  const model = createFlowModel(), first = addFlowNode(model, 'decision'), second = addFlowNode(model, 'process', 600, 300), lane = addFlowLane(model);
  const edge = addFlowEdge(model, first.id, second.id)!;
  const svg = renderFlowSVG(model, { interactive: true, selectedNodeId: first.id, selectedEdgeId: edge.id, selectedLaneId: lane.id, scope: 'editor' });
  assert.ok(svg.includes('<pattern')); assert.ok(svg.includes(`data-flow-resize="${first.id}"`));
  assert.equal((svg.match(/data-flow-port=/g) || []).length, 8);assert.equal((svg.match(/fde-node-ports is-visible/g)||[]).length,1);assert.ok(svg.includes(`data-flow-lane="${lane.id}"`));
  assert.ok(svg.includes(`data-flow-edge="${edge.id}"`)); assert.ok(svg.includes('stroke-dasharray="7 4"'));
  const connect = renderFlowSVG(model, { interactive: true, connecting: true });
  assert.equal((connect.match(/data-flow-port=/g) || []).length, 8);
});

test('la decisión mantiene su etiqueta completa y la descripción contiene todo texto original', () => {
  const model = createFlowModel(), first = addFlowNode(model, 'decision'), second = addFlowNode(model, 'process', 600, 300);
  second.text = 'Una instrucción muy larga que en la figura puede necesitar varias líneas y elipsis pero en la descripción permanece completa.';
  const lane = addFlowLane(model); lane.title = 'Responsable de revisión';
  addFlowEdge(model, first.id, second.id, { label: 'Continuar cuando esté listo' });
  const svg = renderFlowSVG(model, { scope: 'accessibility' });
  assert.match(svg, /<tspan[^>]+>Decisión<\/tspan>/);
  const description = svg.match(/<desc[^>]*>([\s\S]*?)<\/desc>/)![1];
  assert.ok(description.includes(second.text)); assert.ok(description.includes(lane.title));
  assert.ok(description.includes('Decisión →')); assert.ok(description.includes('(Continuar cuando esté listo)'));
  assert.ok(svg.includes(`role="group" aria-label="${second.text}"`));
  first.fontSize = 44;
  assert.match(renderFlowSVG(model), /font-size="44"/);
});

test('los datos importados quedan limitados y no comparten referencias', () => {
  const source = { nodes: Array.from({ length: 300 }, (_, index) => ({ id: `n-${index}`, text: 'a'.repeat(2000) })), lanes: Array.from({ length: 30 }, (_, index) => ({ id: `lane-${index}` })) };
  const model = normalizeFlowModel(source);
  assert.equal(model.nodes.length, 250); assert.equal(model.lanes.length, 20); assert.equal(model.nodes[0].text.length, 1000);
  model.nodes[0].text = 'Cambiado'; assert.notEqual(source.nodes[0].text, model.nodes[0].text);
  const svg = renderFlowSVG(normalizeFlowModel({ nodes: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 0, y: 0 }], edges: [{ id: 'e', from: 'a', to: 'b', fromSide: 'top', toSide: 'top' }] }));
  assert.ok(!svg.includes('NaN')); assert.ok(!svg.includes('Infinity'));
});

test('los proyectos anteriores conservan conectores sólidos y el modo gradiente se serializa', () => {
  const old = normalizeFlowModel({ nodes: [{ id: 'a' }, { id: 'b' }], edges: [{ id: 'e', from: 'a', to: 'b', color: '#ff5900' }] });
  assert.equal(old.edges[0].colorMode, 'solid');
  assert.ok(!renderFlowSVG(old).includes('<linearGradient'));
  const model = createFlowModel(), first = addFlowNode(model, 'process'), second = addFlowNode(model, 'process', 600, 80);
  const solid = addFlowEdge(model, first.id, second.id)!, gradient = addFlowEdge(model, first.id, second.id, { colorMode: 'gradient' })!;
  assert.equal(solid.colorMode, 'solid'); assert.equal(gradient.colorMode, 'gradient');
  assert.deepEqual(normalizeFlowModel(JSON.parse(JSON.stringify(model))), model);
  const invalid = normalizeFlowModel({ ...old, edges: [{ ...old.edges[0], colorMode: 'url(javascript:evil)' }] });
  assert.equal(invalid.edges[0].colorMode, 'solid');
});

test('el degradado sigue los bordes y anclas, con flechas y etiqueta del mismo color', () => {
  const model = createFlowModel(), first = addFlowNode(model, 'process', 80, 80), second = addFlowNode(model, 'process', 600, 80);
  first.stroke = '#ff0000'; first.fill = '#000000'; second.stroke = '#0000ff'; second.fill = '#ffffff';
  const edge = addFlowEdge(model, first.id, second.id, { colorMode: 'gradient', fromSide: 'right', toSide: 'left', route: 'straight', startArrow: true, label: 'Continuar', color: '#00ff00' })!;
  const svg = renderFlowSVG(model, { scope: 'gradient' });
  assert.match(svg, /<linearGradient id="[^\"]+" gradientUnits="userSpaceOnUse" x1="260" y1="120" x2="600" y2="120">/);
  assert.match(svg, /<stop offset="0%" stop-color="#ff0000"\/><stop offset="100%" stop-color="#0000ff"\/>/);
  const startMarker = svg.match(/marker-start="url\(#([^\)]+)\)"/)![1], endMarker = svg.match(/marker-end="url\(#([^\)]+)\)"/)![1];
  assert.notEqual(startMarker, endMarker);
  assert.ok(svg.includes(`<marker id="${startMarker}"`)); assert.ok(svg.includes(`<marker id="${endMarker}"`));
  assert.match(svg, /<marker id="[^\"]+-arrow-start-[^\"]+"[^>]*><path[^>]* fill="#ff0000"\/><\/marker>/);
  assert.match(svg, /<marker id="[^\"]+-arrow-end-[^\"]+"[^>]*><path[^>]* fill="#0000ff"\/><\/marker>/);
  assert.match(svg, /<text[^>]*fill="#800080"[^>]*><tspan[^>]*>Continuar<\/tspan>/);
  const gradientId = svg.match(/<linearGradient id="([^\"]+)"/)![1];
  assert.ok(svg.includes(`stroke="url(#${gradientId})"`));
  first.stroke = '#00ff00'; second.x = 700;
  const moved = renderFlowSVG(model, { scope: 'gradient' });
  assert.match(moved, /x2="700" y2="120"/); assert.match(moved, /stop-color="#00ff00"/);
  assert.equal(edge.color, '#00ff00');
});

test('bordes transparentes o ausentes usan relleno visible y finalmente morado institucional', () => {
  const model = createFlowModel(), first = addFlowNode(model, 'process'), second = addFlowNode(model, 'text', 600, 80);
  first.stroke = '#1230'; first.fill = '#f00'; second.stroke = 'transparent'; second.fill = 'none';
  addFlowEdge(model, first.id, second.id, { colorMode: 'gradient' });
  assert.match(renderFlowSVG(model), /<stop offset="0%" stop-color="#f00"\/><stop offset="100%" stop-color="#5d428c"\/>/);
  first.stroke = '#112233'; first.strokeWidth = 0; first.fill = '#aabbcc';
  second.stroke = '#00000000'; second.fill = '#aabbcc00';
  assert.match(renderFlowSVG(model), /<stop offset="0%" stop-color="#aabbcc"\/><stop offset="100%" stop-color="#5d428c"\/>/);
  second.strokeWidth = 2; second.stroke = '#1238';
  assert.match(renderFlowSVG(model), /stop-color="#1238"/);
});

test('gradientes y marcadores solo referencian definiciones locales únicas y seguras', () => {
  const model = normalizeFlowModel({ nodes: [{ id: 'a', stroke: 'url(https://evil.test/a.svg)' }, { id: 'b', stroke: '#ff5900', x: 500 }], edges: [{ id: '\" onload=\"evil', from: 'a', to: 'b', colorMode: 'gradient', startArrow: true }, { id: 'e2', from: 'b', to: 'a', colorMode: 'gradient', route: 'curve' }] });
  const svg = renderFlowSVG(model, { scope: '\"><img onerror=evil>' }), other = renderFlowSVG(model, { scope: 'other' });
  const ids = [...svg.matchAll(/\sid="([^\"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of svg.matchAll(/url\(#([^\)]+)\)/g)) assert.ok(ids.includes(match[1]));
  assert.ok(ids.every(id => /^[a-zA-Z0-9_-]+$/.test(id))); assert.ok(!svg.includes('https://evil'));
  assert.ok(!/style="[^\"]*url\(/.test(svg)); assert.ok(!/url\((?!#)/.test(svg));
  assert.notEqual(svg.match(/<linearGradient id="([^\"]+)"/)![1], other.match(/<linearGradient id="([^\"]+)"/)![1]);
});

test('la multiselección admite listas readonly y conserva las opciones de selección singular', () => {
  const model = createFlowModel(), first = addFlowNode(model, 'process'), second = addFlowNode(model, 'circle', 500, 200), third = addFlowNode(model, 'decision', 800, 400);
  const lane = addFlowLane(model), lane2 = addFlowLane(model), edge = addFlowEdge(model, first.id, second.id)!, edge2 = addFlowEdge(model, second.id, third.id)!;
  const selectedNodeIds: readonly string[] = [first.id], selectedEdgeIds: readonly string[] = [edge.id], selectedLaneIds: readonly string[] = [lane.id];
  const svg = renderFlowSVG(model, { interactive: true, selectedNodeIds, selectedNodeId: second.id, selectedEdgeIds, selectedEdgeId: edge2.id, selectedLaneIds, selectedLaneId: lane2.id });
  assert.equal((svg.match(/data-flow-resize=/g) || []).length, 2); assert.equal((svg.match(/data-flow-port=/g) || []).length, 12);assert.equal((svg.match(/fde-node-ports is-visible/g)||[]).length,2);
  assert.ok(svg.includes(`data-flow-resize="${first.id}"`)); assert.ok(svg.includes(`data-flow-resize="${second.id}"`)); assert.ok(!svg.includes(`data-flow-resize="${third.id}"`));
  assert.equal((svg.match(/stroke="#ffb88f"/g) || []).length, 2); assert.equal((svg.match(/stroke-dasharray="7 4"/g) || []).length, 2);
  assert.deepEqual(selectedNodeIds, [first.id]); assert.deepEqual(selectedEdgeIds, [edge.id]); assert.deepEqual(selectedLaneIds, [lane.id]);
  const published = renderFlowSVG(model, { selectedNodeIds, selectedEdgeIds, selectedLaneIds });
  assert.ok(!published.includes('data-flow-resize')); assert.ok(!published.includes('stroke="#ffb88f"')); assert.ok(!published.includes('stroke-dasharray="7 4"'));
});
