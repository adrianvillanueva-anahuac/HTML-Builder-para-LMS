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
  assert.equal(ids.size,50);
});
test('no enseña las acciones de catálogo retiradas ni obliga a guardar para copiar',()=>{
  const text=JSON.stringify(TUTORIALS);
  assert.doesNotMatch(text,/habilitar la copia|Arrastra o añade|botón “\+”/);
  assert.match(text,/siempre disponible/);assert.match(text,/continuar sin guardar/);
});
test('cubre grupos, separación, interacciones e imagen sin modificar contenido del lienzo',()=>{
  const text=JSON.stringify(TUTORIALS);
  for(const phrase of ['seis puntitos','10 + 10 px','encapsular','HUE','recorte','hipervínculos','borde','altura'])assert.ok(text.toLowerCase().includes(phrase.toLowerCase()));
  for(const {steps} of Object.values(TUTORIALS))for(const step of steps){
    assert.ok(!/^#canvas\b/.test(step.selector));assert.notEqual(step.selector,'[data-tour="canvas"]');
  }
});
