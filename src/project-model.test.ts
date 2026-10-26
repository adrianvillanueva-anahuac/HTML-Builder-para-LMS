import test from 'node:test';
import assert from 'node:assert/strict';
import {tabPalette,tabInk,workspaceTooltip,workspacePendingTasks} from './project-model';

test('copy warning includes only unfinished manual and automatic tasks of its workspace',()=>{
  const p=fixture();p.spaces[0].checklist=[
    {text:' Revisar referencias ',done:false},
    {text:'Contenido revisado',done:true},
    {text:'Acción del botón',done:false,buttonId:'button-1'},
    {text:'Recurso de Genially',done:false,mediaId:'media-1'},
    {text:'   ',done:false},
    {text:'Revisar referencias',done:false}
  ];
  const before=JSON.stringify(p);
  assert.deepEqual(workspacePendingTasks(p.spaces[0]),['Revisar referencias','Acción del botón','Recurso de Genially','Revisar referencias']);
  assert.deepEqual(workspacePendingTasks(p.spaces[1]),[]);
  assert.deepEqual(workspacePendingTasks(undefined),[]);
  assert.equal(JSON.stringify(p),before);
});

test('copy warning keeps authored markup as plain text, not interpreted HTML',()=>{
  const space=fixture().spaces[0];space.checklist=[{text:'Revisar <img src=x onerror=alert(1)> & "citas"',done:false}];
  assert.deepEqual(workspacePendingTasks(space),['Revisar <img src=x onerror=alert(1)> & "citas"']);
  space.checklist[0].done=true;assert.deepEqual(workspacePendingTasks(space),[]);
});

test('checklist preserves completion and exposes states alongside notes',()=>{
  const p=fixture();p.spaces[0].notes=['Revisar'];p.spaces[0].checklist=[{text:'Diseño',done:true},{text:'Publicar',done:false}];
  const loaded=parseProject(JSON.stringify(p));assert.deepEqual(loaded,p);
  const tooltip=workspaceTooltip(loaded.spaces[0]);
  assert.ok(tooltip.includes('Revisar'));assert.ok(tooltip.includes('Completado: Diseño'));assert.ok(tooltip.includes('Pendiente: Publicar'));
  assert.throws(()=>parseProject(JSON.stringify({...p,spaces:[{...p.spaces[0],checklist:[{text:'Tarea',done:'sí'}]}]})));
});

test('tab colors and multiple notes survive project round trip',()=>{
  const p=fixture();p.spaces[0].tabColor='#5d428c';p.spaces[0].notes=['Revisar contenido','Nota <texto>'];
  assert.deepEqual(parseProject(JSON.stringify(p)),p);
  const old=fixture();assert.deepEqual(parseProject(JSON.stringify(old)),old);
  assert.notEqual(projectContent(p),projectContent(old));
  assert.throws(()=>parseProject(JSON.stringify({...p,spaces:[{...p.spaces[0],tabColor:'url(test)'}]})));
  assert.throws(()=>parseProject(JSON.stringify({...p,spaces:[{...p.spaces[0],notes:[2]}]})));
});
test('institutional palette includes five pastel variants per base and readable ink',()=>{
  assert.equal(tabPalette.length,4);
  for(const group of tabPalette){assert.equal(group.colors.length,6);assert.equal(new Set(group.colors).size,6);group.colors.forEach(color=>assert.match(color,/^#[0-9a-f]{6}$/));}
  assert.equal(tabInk('#ffffff'),'#20242b');assert.equal(tabInk('#5d428c'),'#ffffff');
});
import { parseProject, projectContent, projectNameFromFile, emptyWorkspace, type Project } from './project-model';

test('project title uses the selected filename without its project extension',()=>{
  assert.equal(projectNameFromFile('Mi curso.lmsproject'),'Mi curso');
  assert.equal(projectNameFromFile('Diseño versión 2.LMSPROJECT'),'Diseño versión 2');
  assert.equal(projectNameFromFile('Curso.2026.json'),'Curso.2026');
  assert.equal(projectNameFromFile('Sin extensión'),'Sin extensión');
});
test('new workspace is empty and does not reuse previous authored content',()=>{
  const first=emptyWorkspace();first.html='<h2>Requerimientos del sistema</h2>';
  const next=emptyWorkspace();
  assert.ok(next.html.includes('id="canvas"'));
  assert.ok(next.html.includes('id="canvas-placeholder"'));
  assert.ok(next.html.includes('id="empty-state"'));
  assert.ok(!next.html.includes('Requerimientos'));
  assert.ok(!next.html.includes('lms-element'));
});
const fixture = (): Project => ({format:'lms-builder-project',version:1,name:'Prueba',activeId:'one',spaces:[
  {id:'one',name:'Página uno',html:'<section data-exercise-source="contenido">Título áéñ</section>',bg:'blanco',style:'color: red;'},
  {id:'two',name:'Página dos',html:'<p>Independiente</p>',bg:'imagen',style:''}
]});
test('round trip preserves independent spaces, exercise data and Unicode',()=>assert.deepEqual(parseProject(JSON.stringify(fixture())),fixture()));
test('page appearance survives save/reopen without changing older projects',()=>{
  const p=fixture();p.spaces[0].bgColor='#5d428c';p.spaces[0].bgMargin='25';
  p.spaces[0].footerConfig={type:'solido',logoId:6,logoColor:'naranja',blockColor:'morado'};
  assert.deepEqual(parseProject(JSON.stringify(p)),p);
  assert.notEqual(projectContent(p),projectContent(fixture()));
  for(const invalid of [{bgColor:2},{bgMargin:15},{footerConfig:{...p.spaces[0].footerConfig,logoId:8}}])
    assert.throws(()=>parseProject(JSON.stringify({...p,spaces:[{...p.spaces[0],...invalid}]})));
});
test('navigation does not dirty saved content',()=>assert.equal(projectContent(fixture()),projectContent({...fixture(),activeId:'two'})));
test('renaming, reorder and inactive changes dirty the project',()=>{
  const p=fixture();assert.notEqual(projectContent(p),projectContent({...p,name:'Otro'}));
  assert.notEqual(projectContent(p),projectContent({...p,spaces:[...p.spaces].reverse()}));
  const changed=fixture();changed.spaces[1].html='Cambio';assert.notEqual(projectContent(p),projectContent(changed));
});
test('rejects invalid version, empty spaces, duplicate IDs and absent active space',()=>{
  const p=fixture();
  for(const bad of [{...p,version:2},{...p,spaces:[]},{...p,spaces:[p.spaces[0],p.spaces[0]]},{...p,activeId:'missing'},{...p,spaces:[{...p.spaces[0],html:123}]}])
    assert.throws(()=>parseProject(JSON.stringify(bad)));
});
