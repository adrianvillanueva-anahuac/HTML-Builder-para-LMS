import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileButtonChecklist,type DeferredButton} from './button-checklist';
import {emptyWorkspace,parseProject,projectContent,type Project} from './project-model';

const button=(id='trigger-1',label='Explorar',action='none'):DeferredButton=>({id,label,action});
test('confirmed deferral creates one linked pending task without merging equal labels',()=>{
  const first=reconcileButtonChecklist(undefined,[button()])!;
  assert.deepEqual(first,[{buttonId:'trigger-1',text:'Tienes pendiente poner acción en "Explorar".',done:false}]);
  assert.equal(reconcileButtonChecklist(first,[button()]),first);
  assert.equal(reconcileButtonChecklist(first,[button(),button('trigger-2')])!.length,2);
  assert.equal(reconcileButtonChecklist(undefined,[]),undefined);
});
test('assigning either action completes the same task, deferring again reopens it',()=>{
  const pending=reconcileButtonChecklist(undefined,[button()])!;
  for(const action of ['link','encapsulate']){
    const completed=reconcileButtonChecklist(pending,[button('trigger-1','Explorar',action)])!;
    assert.equal(completed.length,1);assert.equal(completed[0].done,true);assert.equal(completed[0].buttonId,pending[0].buttonId);
    assert.equal(reconcileButtonChecklist(completed,[button()])![0].done,false);
  }
});
test('renaming updates safely with user-authored quotes and Unicode; manual tasks stay intact',()=>{
  const manual={text:'Revisar fuentes',done:true};
  const initial=reconcileButtonChecklist([manual],[button()]);
  const next=reconcileButtonChecklist(initial,[button('trigger-1','Leer "sociología" <tema>','link')])!;
  assert.equal(next[0],manual);assert.equal(next[1].text,'Tienes pendiente poner acción en "Leer "sociología" <tema>".');assert.equal(next[1].done,true);
  assert.equal(reconcileButtonChecklist(undefined,[button('trigger-1','  ')])![0].text,'Tienes pendiente poner acción en "Botón".');
});
test('deletion or transfer removes stale automatic tasks, destination and undo recreate them',()=>{
  const manual={text:'Otra tarea',done:false};
  const source=reconcileButtonChecklist([manual],[button()])!;
  assert.deepEqual(reconcileButtonChecklist(source,[]),[manual]);
  const destination=reconcileButtonChecklist(undefined,[button()]);
  assert.equal(destination![0].buttonId,'trigger-1');
  assert.equal(reconcileButtonChecklist(destination,[]),undefined);
  assert.deepEqual(reconcileButtonChecklist([manual],[button()]),source);
});
test('duplicate tracking entries are collapsed without changing manual entries',()=>{
  const list=reconcileButtonChecklist(undefined,[button()])!;
  assert.deepEqual(reconcileButtonChecklist([...list,...list],[button()]),list);
});
test('linked metadata and completion survive project round trip with legacy compatibility',()=>{
  const space={...emptyWorkspace(),id:'page-1',name:'Página 1',checklist:reconcileButtonChecklist([{text:'Manual',done:false}],[button('trigger-1','Lectura','link')])};
  const project:Project={format:'lms-builder-project',version:1,name:'Curso',activeId:space.id,spaces:[space]};
  const loaded=parseProject(JSON.stringify(project));assert.deepEqual(loaded,project);assert.equal(projectContent(loaded),projectContent(project));
  for(const buttonId of ['',false,42])assert.throws(()=>parseProject(JSON.stringify({...project,spaces:[{...space,checklist:[{text:'No válido',done:false,buttonId}]}]})));
});
