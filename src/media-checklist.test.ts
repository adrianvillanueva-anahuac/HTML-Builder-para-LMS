import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileMediaChecklist,isMediaFilled,isAutomaticTask,automaticTaskHint,type MediaResource} from './media-checklist';
import {createFlowModel,addFlowNode,addFlowLane} from './flow-model';
import {reconcileButtonChecklist} from './button-checklist';
import {emptyWorkspace,parseProject,projectContent,type ChecklistItem,type Project} from './project-model';

const resource=(id='media-1',label='YouTube',hasContent=false):MediaResource=>({id,label,hasContent});
const generated=(id='media-1',label='YouTube',done=false):ChecklistItem=>({mediaId:id,text:`Tienes pendiente agregar contenido en "${label}".`,done});
const fixture=():Project=>({format:'lms-builder-project',version:1,name:'Curso',activeId:'page-1',spaces:[{...emptyWorkspace(),id:'page-1',name:'Página 1'}]});
// The diagram branch intentionally needs only its persisted dataset, not DOM previews.
const flowBlock=(source?:unknown)=>({dataset:{type:'diagrama_flujo',...(source===undefined?{}:{flowModel:typeof source==='string'?source:JSON.stringify(source)})},querySelector:()=>{throw Error('El SVG no determina si el diagrama está completo');}} as unknown as HTMLElement);
test('empty diagrams and canvas-only settings remain pending independently of the preview',()=>{
 assert.equal(isMediaFilled(flowBlock()),false);assert.equal(isMediaFilled(flowBlock(createFlowModel())),false);
 const model=createFlowModel();Object.assign(model,{title:'Mi diagrama',background:'#ff5900',grid:false,width:1600,height:900,autoCrop:true});assert.equal(isMediaFilled(flowBlock(model)),false);
});
test('saved diagram nodes or lanes count as content, consistently with published diagrams',()=>{
 for(const type of ['process','decision','terminator','circle','document','data','text','image']as const){const model=createFlowModel();addFlowNode(model,type);assert.equal(isMediaFilled(flowBlock(model)),true,type);}
 const model=createFlowModel();addFlowLane(model);assert.equal(isMediaFilled(flowBlock(model)),true);
});
test('malformed diagram data cannot crash automatic scanning or complete an empty diagram',()=>{
 for(const source of ['', '{bad', 'null','[]','42','"<svg>contenido</svg>"',JSON.stringify({nodes:[null,42,'x',[]],edges:[{}]})])assert.equal(isMediaFilled(flowBlock(source)),false);
});
test('diagram tasks complete, reopen and disappear using the existing linked checklist lifecycle',()=>{
 const model=createFlowModel(),item=(hasContent:boolean)=>resource('diagram-1','Diagrama de flujo',hasContent);
 const pending=reconcileMediaChecklist(undefined,[item(isMediaFilled(flowBlock(model)))])!;assert.deepEqual(pending,[generated('diagram-1','Diagrama de flujo')]);
 addFlowNode(model,'process');const done=reconcileMediaChecklist(pending,[item(isMediaFilled(flowBlock(model)))],false)!;assert.equal(done[0].done,true);assert.equal(done[0].mediaId,'diagram-1');
 model.nodes=[];assert.deepEqual(reconcileMediaChecklist(done,[item(isMediaFilled(flowBlock(model)))],false),pending);assert.equal(reconcileMediaChecklist(done,[],false),undefined);
});
test('automatic creation settings and distinct duplicated diagram identities are preserved',()=>{
 const diagrams=[resource('one','Diagrama de flujo'),resource('copy','Diagrama de flujo'),resource('complete','Diagrama de flujo',true)];assert.equal(reconcileMediaChecklist(undefined,diagrams,false),undefined);
 const tasks=reconcileMediaChecklist(undefined,diagrams)!;assert.deepEqual(tasks.map(item=>item.mediaId),['one','copy']);assert.ok(tasks.every(isAutomaticTask));assert.ok(automaticTaskHint(tasks[0]).includes('contenido del elemento'));
});
test('diagram pending links persist in existing project files without adding a schema',()=>{
 const project=fixture();project.spaces[0].checklist=[generated('diagram-1','Diagrama de flujo')];assert.deepEqual(parseProject(JSON.stringify(project)),project);
});

test('empty media creates a pending linked item but populated media does not create completed noise',()=>{
  assert.deepEqual(reconcileMediaChecklist(undefined,[resource()]),[generated()]);
  assert.equal(reconcileMediaChecklist(undefined,[resource('filled','Vimeo',true)]),undefined);
  assert.deepEqual(reconcileMediaChecklist(undefined,[resource('filled','Vimeo',true),resource()]),[generated()]);
});

test('equal labels remain separate resources and duplicate resource ids create only one item',()=>{
  const next=reconcileMediaChecklist(undefined,[resource('first'),resource('second'),resource('first')])!;
  assert.equal(next.length,2);
  assert.deepEqual(next.map(item=>item.mediaId),['first','second']);
  assert.ok(next.every(item=>item.text===generated().text&&!item.done));
});

test('completing, reopening and relabeling update the existing media task',()=>{
  const pending=[generated()];
  const completed=reconcileMediaChecklist(pending,[resource('media-1','YouTube',true)])!;
  assert.deepEqual(completed,[generated('media-1','YouTube',true)]);
  assert.equal(completed[0].mediaId,pending[0].mediaId);
  assert.deepEqual(reconcileMediaChecklist(completed,[resource()]),pending);
  const label='Lectura "Sociología" <tema> áéñ';
  assert.deepEqual(reconcileMediaChecklist(completed,[resource('media-1',label,true)]),[generated('media-1',label,true)]);
});

test('disabled creation preserves existing linked state updates and never appends unseen resources',()=>{
  assert.equal(reconcileMediaChecklist(undefined,[resource()],false),undefined);
  const existing=[generated()];
  const next=reconcileMediaChecklist(existing,[resource('media-1','Canva',true),resource('new','Gamma')],false)!;
  assert.deepEqual(next,[generated('media-1','Canva',true)]);
  assert.deepEqual(reconcileMediaChecklist(next,[resource('media-1','Canva'),resource('new','Gamma')],false),[generated('media-1','Canva')]);
});

test('reenabling creation catches current missing resources without generating tasks for filled resources',()=>{
  const manual={text:'Revisar referencias',done:false};
  const resources=[resource(),resource('second','Gamma'),resource('filled','Vimeo',true)];
  const off=reconcileMediaChecklist([manual],resources,false)!;
  assert.deepEqual(off,[manual]);
  const on=reconcileMediaChecklist(off,resources,true)!;
  assert.deepEqual(on,[manual,generated(),generated('second','Gamma')]);
  assert.equal(on[0],manual);
});

test('manual tasks and button tasks retain their exact identity and order through media updates',()=>{
  const manual:ChecklistItem={text:'Revisar accesibilidad',done:true};
  const button:ChecklistItem={buttonId:'trigger-1',text:'Tienes pendiente poner acción en "Explorar".',done:false};
  const manualAfter:ChecklistItem={text:'Publicar',done:false};
  const initial=[manual,generated(),button,manualAfter];
  const next=reconcileMediaChecklist(initial,[resource('media-1','Canva',true),resource('new','Gamma')])!;
  assert.deepEqual(next,[manual,generated('media-1','Canva',true),button,manualAfter,generated('new','Gamma')]);
  assert.equal(next[0],manual);assert.equal(next[2],button);assert.equal(next[3],manualAfter);
  assert.deepEqual(initial,[manual,generated(),button,manualAfter]);
});

test('deleted or transferred media removes only its own task even while creation is disabled',()=>{
  const manual:ChecklistItem={text:'Manual',done:false};
  const button:ChecklistItem={buttonId:'trigger-1',text:'Botón pendiente',done:false};
  const source=[manual,generated(),button];
  const remaining=reconcileMediaChecklist(source,[],false)!;
  assert.deepEqual(remaining,[manual,button]);
  assert.equal(remaining[0],manual);assert.equal(remaining[1],button);
  assert.equal(reconcileMediaChecklist([generated()],[],false),undefined);
  const destination=reconcileMediaChecklist(undefined,[resource()]);
  assert.deepEqual(destination,[generated()]);
  assert.deepEqual(reconcileMediaChecklist([manual,button],[resource()]),[manual,button,generated()]);
});

test('duplicate saved links are collapsed without deduplicating manual or button entries',()=>{
  const manual:ChecklistItem={text:'Manual',done:false};
  const button:ChecklistItem={buttonId:'trigger-1',text:'Botón pendiente',done:false};
  assert.deepEqual(reconcileMediaChecklist([manual,generated(),button,generated(),manual],[resource()]),[manual,generated(),button,manual]);
});

test('unchanged reconciliation returns the original array, including empty and creation-disabled cases',()=>{
  const empty:ChecklistItem[]=[];
  assert.equal(reconcileMediaChecklist(undefined,[]),undefined);
  assert.equal(reconcileMediaChecklist(empty,[]),empty);
  const initial=[generated()];
  assert.equal(reconcileMediaChecklist(initial,[resource()]),initial);
  assert.equal(reconcileMediaChecklist(initial,[resource(),resource('new','Canva')],false),initial);
  const completed=[generated('media-1','YouTube',true)];
  assert.equal(reconcileMediaChecklist(completed,[resource('media-1','YouTube',true)]),completed);
});

test('project round trip preserves media links, mixed checklist entries and disabled automatic creation',()=>{
  const project=fixture();project.autoChecklist=false;
  project.spaces[0].checklist=[{text:'Manual',done:false},{buttonId:'trigger-1',text:'Botón',done:true},generated('media-1','YouTube',true)];
  const loaded=parseProject(JSON.stringify(project));
  assert.deepEqual(loaded,project);
  assert.equal(loaded.autoChecklist,false);
  assert.equal(projectContent(loaded),projectContent(project));
  assert.equal(JSON.parse(projectContent(loaded)).autoChecklist,false);
});

test('legacy projects stay compatible and toggling automatic creation changes saved project content',()=>{
  const legacy=fixture();
  const loaded=parseProject(JSON.stringify(legacy));
  assert.deepEqual(loaded,legacy);
  assert.equal(loaded.autoChecklist,undefined);
  const disabled={...legacy,autoChecklist:false};
  const enabled={...legacy,autoChecklist:true};
  assert.notEqual(projectContent(disabled),projectContent(legacy));
  assert.notEqual(projectContent(disabled),projectContent(enabled));
  assert.equal(parseProject(JSON.stringify(enabled)).autoChecklist,true);
});

test('project parser rejects invalid auto-checklist settings, invalid media links and ambiguous links',()=>{
  const project=fixture();
  for(const autoChecklist of [null,0,1,'true','false',[],{}])
    assert.throws(()=>parseProject(JSON.stringify({...project,autoChecklist})));
  for(const mediaId of ['', '   ',false,42,null,[],{}])
    assert.throws(()=>parseProject(JSON.stringify({...project,spaces:[{...project.spaces[0],checklist:[{text:'Inválido',done:false,mediaId}]}]})));
  assert.throws(()=>parseProject(JSON.stringify({...project,spaces:[{...project.spaces[0],checklist:[{text:'Ambiguo',done:false,mediaId:'media-1',buttonId:'trigger-1'}]}]})));
});

test('tracked media transfers while creation is disabled, in either reconciliation order and completion state',()=>{
  for(const hasContent of [false,true])for(const sourceFirst of [false,true]){
    const source=[generated('moved','Canva',hasContent)];
    const tracked:ReadonlySet<string>=new Set(['moved']);
    const resources=[resource('moved','Canva',hasContent),resource('new','YouTube'),resource('copied','Canva',hasContent)];
    let nextSource:ChecklistItem[]|undefined,nextDestination:ChecklistItem[]|undefined;
    const reconcileSource=()=>{nextSource=reconcileMediaChecklist(source,[],false,tracked);};
    const reconcileDestination=()=>{nextDestination=reconcileMediaChecklist(undefined,resources,false,tracked);};
    if(sourceFirst){reconcileSource();reconcileDestination();}else{reconcileDestination();reconcileSource();}
    assert.equal(nextSource,undefined);
    assert.deepEqual(nextDestination,[generated('moved','Canva',hasContent)]);
    assert.equal(reconcileMediaChecklist(nextDestination,resources,false,tracked),nextDestination);
    assert.deepEqual([...tracked],['moved']);
  }
});

test('tracked button transfers while creation is disabled without admitting untracked blank buttons or clones',()=>{
  for(const action of ['none','link','encapsulate'])for(const sourceFirst of [false,true]){
    const expected:ChecklistItem={buttonId:'moved',text:'Tienes pendiente poner acción en "Explorar".',done:action!=='none'};
    const source=[expected];
    const tracked:ReadonlySet<string>=new Set(['moved']);
    const buttons=[{id:'moved',label:'Explorar',action},{id:'new',label:'Sin acción',action:'none'},{id:'copied',label:'Explorar',action}];
    let nextSource:ChecklistItem[]|undefined,nextDestination:ChecklistItem[]|undefined;
    const reconcileSource=()=>{nextSource=reconcileButtonChecklist(source,[],false,tracked);};
    const reconcileDestination=()=>{nextDestination=reconcileButtonChecklist(undefined,buttons,false,tracked);};
    if(sourceFirst){reconcileSource();reconcileDestination();}else{reconcileDestination();reconcileSource();}
    assert.equal(nextSource,undefined);
    assert.deepEqual(nextDestination,[expected]);
    assert.equal(reconcileButtonChecklist(nextDestination,buttons,false,tracked),nextDestination);
    assert.deepEqual([...tracked],['moved']);
  }
});

test('known media and button tasks can return after deletion or undo without enabling creation for new ids',()=>{
  const mediaTracked:ReadonlySet<string>=new Set(['media-1']);
  const buttonTracked:ReadonlySet<string>=new Set(['trigger-1']);
  const mediaRemoved=reconcileMediaChecklist([generated()],[],false,mediaTracked);
  const buttonTask:ChecklistItem={buttonId:'trigger-1',text:'Tienes pendiente poner acción en "Explorar".',done:false};
  const buttonRemoved=reconcileButtonChecklist([buttonTask],[],false,buttonTracked);
  assert.equal(mediaRemoved,undefined);assert.equal(buttonRemoved,undefined);
  assert.deepEqual(reconcileMediaChecklist(mediaRemoved,[resource(),resource('new','Gamma')],false,mediaTracked),[generated()]);
  assert.deepEqual(reconcileButtonChecklist(buttonRemoved,[{id:'trigger-1',label:'Explorar',action:'none'},{id:'new',label:'Otro',action:'none'}],false,buttonTracked),[buttonTask]);
  assert.deepEqual([...mediaTracked],['media-1']);assert.deepEqual([...buttonTracked],['trigger-1']);
});
