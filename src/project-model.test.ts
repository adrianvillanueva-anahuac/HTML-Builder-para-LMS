import test from 'node:test';
import assert from 'node:assert/strict';
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
