import test from 'node:test';
import assert from 'node:assert/strict';
import {TUTORIAL_TOPICS,TUTORIALS} from './tutorial-content';
test('cada tema tiene pasos únicos, completos y navegación consistente',()=>{
  assert.equal(TUTORIAL_TOPICS.length,10);
  assert.equal(new Set(TUTORIAL_TOPICS.map(topic=>topic.id)).size,10);
  const ids=new Set<string>();
  for(const topic of TUTORIAL_TOPICS){
    assert.ok(topic.title&&topic.description&&topic.icon&&topic.duration);
    const steps=TUTORIALS[topic.id].steps;assert.ok(steps.length>=3);
    for(const step of steps){assert.ok(step.title&&step.text&&step.selector);assert.ok(!ids.has(step.id));ids.add(step.id);}
  }
  assert.ok(ids.size>=50);
});
test('no enseña las acciones de catálogo retiradas ni obliga a guardar para copiar',()=>{
  const text=JSON.stringify(TUTORIALS);
  assert.doesNotMatch(text,/habilitar la copia|Arrastra o añade|botón “\+”/);
  assert.match(text,/siempre disponible/);assert.match(text,/continuar sin guardar/i);
});
test('cubre grupos, separación, interacciones e imagen sin modificar contenido del lienzo',()=>{
  const text=JSON.stringify(TUTORIALS);
  for(const phrase of ['seis puntitos','10 + 10 px','encapsular','HUE','recorte','hipervínculos','borde','altura'])assert.ok(text.toLowerCase().includes(phrase.toLowerCase()));
  for(const {steps} of Object.values(TUTORIALS))for(const step of steps){
    assert.ok(!/^#canvas\b/.test(step.selector));assert.notEqual(step.selector,'[data-tour="canvas"]');
  }
});

test('el recorrido general enseña guardar y reabrir el proyecto antes de copiar la página',()=>{
  const steps=TUTORIALS.interfaz.steps;
  const index=(id:string)=>steps.findIndex(step=>step.id===id);
  assert.ok(index('interface-save')<index('interface-reopen'));
  assert.ok(index('interface-reopen')<index('interface-copy'));
  assert.ok(index('interface-copy')<index('interface-brightspace'));
  const text=steps.map(step=>step.text).join(' ');
  for(const phrase of ['.lmsproject','todas las páginas','vuelve a Guardar','Abrir proyecto o HTML','Código fuente / Source Code','Ctrl+V','visibilidad'])assert.ok(text.includes(phrase),phrase);
  assert.ok(steps.filter(step=>step.example).length>=6);
});

test('distingue páginas del proyecto y pestañas internas con un ejemplo continuo',()=>{
  const step=TUTORIALS.interfaz.steps.find(step=>step.id==='interface-pages')!;
  assert.match(step.text,/superiores/);assert.match(step.text,/cada una se copia por separado/);
  assert.match(step.text,/elemento Pestañas/);
  assert.match(step.example!,/Explicación.*Video.*Ejemplo/);
  const example=TUTORIALS.exporta.steps.find(step=>step.id==='export-select')!;
  assert.match(example.text,/pestañas interactivas.*se incluyen juntas/);
});

test('guías específicas incluyen recuperación local y publicación por página',()=>{
  assert.match(JSON.stringify(TUTORIALS.importa),/archivo .lmsproject/);
  assert.ok(TUTORIALS.exporta.steps.some(step=>step.id==='export-save-check'));
  assert.ok(TUTORIALS.exporta.steps.some(step=>step.id==='export-paste'&&step.text.includes('Código fuente')));
  assert.ok(TUTORIALS.exporta.steps.some(step=>step.id==='export-scope'&&step.text.includes('siguiente pestaña')));
});
