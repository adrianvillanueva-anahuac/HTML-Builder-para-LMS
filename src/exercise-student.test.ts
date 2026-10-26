import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Minimal DOM fixture to exercise the actual embedded student runtime offline.
function fixture({required=true,name='Ana Pérez',finalized=false,rich=false,reviewWatermark=false,reviewWatermarkText='Para revisión'}={}) {
  const downloads:string[]=[],clones:any[]=[],dialogs:any[]=[];
  class Element {
    children:any[]=[];dataset:any={};style:any={};attributes:any={};textContent='';value='';className='';
    hidden=false;disabled=false;readOnly=false;contentEditable='false';parentElement=null;scrollHeight=80;
    onclick:any;download='';innerHTML='';
    addEventListener(){} remove(){} focus(){} showModal(){} close(){}
    append(...nodes:any[]){this.children.push(...nodes);} prepend(node:any){this.children.unshift(node);}
    setAttribute(key:string,value:string){this.attributes[key]=value;}
    querySelector(selector:string):any{return this.children.find(n=>n.tag===selector)||new Element();}
    click(){if(this.download)downloads.push(this.download);else this.onclick?.();}
  }
  const answer=new Element();answer.value='Respuesta conservada';
  const richAnswer=new Element();richAnswer.innerHTML='<b>Respuesta enriquecida</b>';
  const studentName=new Element();studentName.value=name;
  const state=new Element();state.textContent=JSON.stringify({version:1,finalized});
  const save=new Element(),finish=new Element(),status=new Element(),body=new Element();
  const submission={dataset:{exerciseId:'ACT01',requireName:String(required),reviewWatermark:String(reviewWatermark),reviewWatermarkText}};
  (finish as any).closest=()=>submission;
  const label=new Element();label.textContent='Finalizar y descargar HTML';finish.querySelector=()=>label;
  const document:any={body,title:'Ejercicio',addEventListener(){},
    createElement(tag:string){const node:any=new Element();node.tag=tag;if(tag==='dialog')dialogs.push(node);return node;},
    getElementById(id:string){return id==='exercise-student-state'?state:save;},
    querySelector(selector:string){return ({'.student-name':studentName,'.exercise-finish':finish,'.exercise-status':status} as any)[selector]||null;},
    querySelectorAll(selector:string){return selector==='.student-answer'?[answer]:selector==='.student-rich-answer'&&rich?[richAnswer]:[];},
    documentElement:{cloneNode(){
      const copyAnswer=new Element(),copyName=new Element(),copyRich=new Element(),copyState=new Element(),copyBody=new Element();
      const clone:any={answer:copyAnswer,name:copyName,rich:copyRich,state:copyState,body:copyBody,
        querySelector(selector:string){return ({'.student-name':copyName,'#exercise-student-state':copyState,body:copyBody} as any)[selector];},
        querySelectorAll(selector:string){return selector==='.student-answer'?[copyAnswer]:selector==='input,textarea,select'?[copyAnswer,copyName]:selector==='[contenteditable]'?[copyRich]:[];},
        get outerHTML(){return JSON.stringify({answer:copyAnswer.textContent,name:copyName.attributes,state:copyState.textContent});}
      };clones.push(clone);return clone;
    }}
  };
  runInNewContext(readFileSync(new URL('./exercise-student.js',import.meta.url),'utf8'),{
    document,window:{addEventListener(){}},console,Blob,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},setTimeout(){},
  });
  const finalize=()=>{finish.onclick();const confirmation=dialogs.at(-1);confirmation.children.find((n:any)=>n.tag==='footer').children.find((n:any)=>n.textContent==='Finalizar').onclick();};
  return {downloads,clones,dialogs,answer,richAnswer,studentName,save,finish,finalize};
}

test('progress saves answers with progreso_ID and remains editable',async()=>{
  const f=fixture({rich:true});await f.save.onclick();
  assert.deepEqual(f.downloads,['progreso_ACT01.html']);
  assert.equal(JSON.parse(f.clones[0].state.textContent).finalized,false);
  assert.equal(f.clones[0].answer.textContent,'Respuesta conservada');
  assert.equal(f.answer.readOnly,false);assert.equal(f.richAnswer.contentEditable,'true');
});
test('required name must include name and surname before finalization',()=>{
  for(const name of ['', 'Ana','123 456']){const f=fixture({name});assert.equal(f.finish.disabled,true);f.finish.onclick();assert.equal(f.dialogs.length,0);}
});
test('final copy has ID_name, watermark, locked fields and no progress saving',async()=>{
  const f=fixture({rich:true});f.finalize();
  assert.deepEqual(f.downloads,['ACT01_Ana Pérez.html']);
  const clone=f.clones[0];assert.equal(JSON.parse(clone.state.textContent).finalized,true);
  assert.equal(clone.body.children[0].textContent,'ACT01_Ana Pérez.html');
  assert.equal(clone.answer.attributes.disabled,'');assert.equal(clone.name.attributes.readonly,'');
  assert.equal(clone.rich.attributes.contenteditable,'false');
  assert.equal(f.answer.readOnly,true);assert.equal(f.richAnswer.contentEditable,'false');
  assert.equal(f.save.hidden,true);await f.save.onclick();assert.equal(f.downloads.length,1);
});
test('optional name allows finalizing without personal data',()=>{
  const f=fixture({required:false,name:''});assert.equal(f.finish.disabled,false);f.finalize();
  assert.deepEqual(f.downloads,['ACT01_sin_nombre.html']);
});
test('reopened final remains locked and cannot save progress',async()=>{
  const f=fixture({finalized:true,rich:true});assert.equal(f.answer.readOnly,true);
  assert.equal(f.richAnswer.contentEditable,'false');assert.equal(f.save.disabled,true);
  await f.save.onclick();assert.equal(f.downloads.length,0);
});

test('review watermark is optional and never appears in progress saves',async()=>{
  const f=fixture({reviewWatermark:true});await f.save.onclick();
  assert.equal(f.clones[0].body.children.some((node:any)=>node.className==='exercise-review-watermark'),false);
  const disabled=fixture();disabled.finalize();
  assert.equal(disabled.clones[0].body.children.some((node:any)=>node.className==='exercise-review-watermark'),false);
});

test('enabled final watermark defaults to Para revisión and sits at top right',()=>{
  for(const text of ['Para revisión','','   ']){
    const f=fixture({reviewWatermark:true,reviewWatermarkText:text});f.finalize();
    const mark=f.clones[0].body.children.find((node:any)=>node.className==='exercise-review-watermark');
    assert.equal(mark.textContent,'Para revisión');assert.match(mark.style.cssText,/top:12px;right:16px/);
    assert.equal(f.answer.readOnly,true);assert.equal(f.save.hidden,true);
  }
});

test('custom watermark is bounded plain text and final downloads retain it',()=>{
  const text='Revisar <img src=x onerror=alert(1)> — evaluación';
  const f=fixture({reviewWatermark:true,reviewWatermarkText:text});f.finalize();f.finish.onclick();
  assert.equal(f.downloads.length,2);
  for(const clone of f.clones){const mark=clone.body.children.find((node:any)=>node.className==='exercise-review-watermark');assert.equal(mark.textContent,text);assert.equal(mark.innerHTML,'');}
  const long=fixture({reviewWatermark:true,reviewWatermarkText:'X'.repeat(150)});long.finalize();
  assert.equal(long.clones[0].body.children.find((node:any)=>node.className==='exercise-review-watermark').textContent.length,120);
});
