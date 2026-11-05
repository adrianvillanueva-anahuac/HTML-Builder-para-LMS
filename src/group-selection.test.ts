import test from 'node:test';
import assert from 'node:assert/strict';
import {isGroupPage,groupDragStarted,groupToolsPosition} from './group-selection-model';

const block=(type:string|undefined,dropzone=true,parent='canvas')=>({parentElement:{id:parent},dataset:{type},querySelector:()=>dropzone?{}:null}) as unknown as HTMLElement;
test('page containers include legacy and exercise pages, but never typed nested boxes',()=>{
  for(const type of [undefined,'pagina_basica','pagina_foda','pagina_ejercicio','pagina_completa','bienvenida'])assert.equal(isGroupPage(block(type)),true,type);
  for(const type of ['caja_texto','pestanas','acordeon','ejercicio_descargable'])assert.equal(isGroupPage(block(type)),false,type);
  assert.equal(isGroupPage(block(undefined,false)),false);
  assert.equal(isGroupPage(block('pagina_basica',true,'nested')),false);
});
test('drag threshold ignores click jitter in any direction',()=>{
  assert.equal(groupDragStarted(100,100,103,104),false);
  assert.equal(groupDragStarted(100,100,94,100),true);
  assert.equal(groupDragStarted(100,100,100,106),true);
});
test('group actions stay below header and inside the visible workspace',()=>{
  assert.deepEqual(groupToolsPosition(400,800,300,95,712,340,1400,230),{top:254,center:600});
  const above=groupToolsPosition(350,400,-50,95,712,340,1400,230);
  assert.equal(above.top,95);assert.equal(above.center,463);
  const below=groupToolsPosition(1300,1500,900,95,712,340,1400,230);
  assert.equal(below.top,668);assert.equal(below.center,1277);
});
