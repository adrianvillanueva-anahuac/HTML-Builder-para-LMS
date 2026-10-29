import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { compactModularState } from './modular-table';
import { takeWorkspaceHistory, loadWorkspaceHistory, upgradeTitleImageElements } from './vanilla-setup';
import { parseProject, projectContent, projectNameFromFile, emptyWorkspace, workspacePendingTasks, type Project, type Workspace } from './project-model';

import { startTutorial } from './tutorial';
import { projectDialog } from './project-dialog';
import { pageListDialog } from './page-list-dialog';
import { workspaceDialog } from './workspace-dialog';
import {appearanceDialog} from './appearance-dialog';
import {applyBackground,applyFooter,restoreBackgroundMetadata,workspaceAppearanceRoot} from './workspace-appearance';
import { tabInk,workspaceTooltip,workspaceChecklistState } from './project-model';
import './workspace-checklist.css';
import {installWorkspaceDrag} from './workspace-drag';
import {automaticTaskHint,ensureMediaChecklistIds,isAutomaticTask,syncWorkspaceAutomaticChecklist} from './media-checklist';
import type { CSSProperties } from 'react';

type History = ReturnType<typeof takeWorkspaceHistory>;
const LMS_CHARACTER_LIMIT=2_000_000;
const formatCharacters=(value:number)=>value.toLocaleString('es-MX');
export default function ProjectManager({onTutorial}: {onTutorial:()=>void}) {
  const [project, setProject] = useState<Project | null>(null);
  const [tabInfo,setTabInfo]=useState<{space:Workspace;x:number;y:number}|null>(null);
  const [exportSize,setExportSize]=useState<{id:string;count:number|null}|null>(null);
  useEffect(()=>{
    if(!tabInfo)return;
    const id=tabInfo.space.id;
    setExportSize(null);
    const measure=()=>{
      try{
        const p=current.current,space=p?.spaces.find(s=>s.id===id);
        if(!space||!window.generateExportHTML)return;
        let source:HTMLElement;
        if(id===p!.activeId)source=outer();
        else {source=document.createElement('div');source.innerHTML=space.html;source.dataset.bg=space.bg;source.style.cssText=space.style;}
        const html=window.generateExportHTML(false,source,true) as string|null;
        setExportSize({id,count:html===null?null:html.length});
      }catch{setExportSize({id,count:null});}
    };
    let timer=setTimeout(measure,120);
    const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(measure,300);});
    if(outer()&&id===current.current?.activeId)observer.observe(outer(),{subtree:true,childList:true,characterData:true,attributes:true});
    return()=>{clearTimeout(timer);observer.disconnect();};
  },[tabInfo?.space.id]);
  const tabInfoTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const keepTabInfo=()=>{if(tabInfoTimer.current)clearTimeout(tabInfoTimer.current);};
  const hideTabInfo=()=>{keepTabInfo();tabInfoTimer.current=setTimeout(()=>{
    if(!document.activeElement?.closest('.project-tab-info'))setTabInfo(null);
  },250);};
  const showTabInfo=(space:Workspace,element:HTMLElement)=>{
    if(window.isLmsDragging||window.lmsWorkspaceDragActive)return;
    keepTabInfo();const rect=element.getBoundingClientRect();
    setTabInfo({space,x:Math.max(12,Math.min(rect.left,window.innerWidth-332)),y:rect.bottom+12});
  };
  useEffect(()=>{
    const dismiss=()=>setTabInfo(null);
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape')dismiss();};
    const scroll=(event:Event)=>{if(!(event.target instanceof Element)||!event.target.closest('.project-tab-info'))dismiss();};
    window.addEventListener('resize',dismiss);document.addEventListener('scroll',scroll,true);document.addEventListener('keydown',key);
    return ()=>{keepTabInfo();window.removeEventListener('resize',dismiss);document.removeEventListener('scroll',scroll,true);document.removeEventListener('keydown',key);};
  },[]);
  const current = useRef<Project | null>(null);
  const baseline = useRef<string | null>(null);
  const handle = useRef<any>(null);
  const blank = useRef<Workspace | null>(null);
  const histories = useRef(new Map<string, History>());
  // Remember actual generated tasks for this editing session. Undo can then
  // restore an existing task while automatic creation is disabled, without
  // treating newly inserted/duplicated empty elements as previously tracked.
  const trackedTasks=useRef({buttons:new Set<string>(),media:new Set<string>()});
  function rememberTasks(spaces:Workspace[]){
    spaces.forEach(space=>space.checklist?.forEach(item=>{
      if(item.buttonId)trackedTasks.current.buttons.add(item.buttonId);
      if(item.mediaId)trackedTasks.current.media.add(item.mediaId);
    }));
  }
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef=useRef(false);busyRef.current=busy;
  const [showVideoNotice, setShowVideoNotice] = useState(false);
  const [menu, setMenu] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [nameHint, setNameHint] = useState(0);
  const nameInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if(editingName) {nameInput.current?.focus();nameInput.current?.select();} },[editingName]);
  useEffect(() => {
    if(!nameHint)return;
    const timer=window.setTimeout(()=>setNameHint(0),4000);
    return ()=>window.clearTimeout(timer);
  },[nameHint]);
  const [notice, setNotice] = useState({text:'',sequence:0});
  const message = notice.text;
  function setMessage(text:string) {
    // Restart the lifetime even when the same notification is shown twice.
    setNotice(previous => ({text,sequence:previous.sequence+1}));
  }
  useEffect(() => {
    if (!message || busy) return;
    const sequence = notice.sequence;
    const timeout = window.setTimeout(() => {
      setNotice(previous => previous.sequence===sequence ? {...previous,text:''} : previous);
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [notice.sequence, message, busy]);
  const outer = () => document.getElementById('canvas-container-outer')!;
  function snapshot(el:HTMLElement=outer()): Pick<Workspace,'html'|'bg'|'style'|'bgColor'|'bgMargin'> {
    ensureMediaChecklistIds(el);
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.sortable-ghost,.layout-intent-indicator,#empty-state').forEach(n => n.remove());
    clone.querySelectorAll('*').forEach(n => {
      n.removeAttribute('contenteditable'); n.removeAttribute('data-sortable-active');
      n.classList.remove('selected-img','drag-over','is-dragging','drag-item','ghost-element','sortable-chosen');
    });
    clone.querySelectorAll<HTMLElement>('.parallax-layer').forEach(n => n.style.removeProperty('transform'));
    const placeholder = clone.querySelector<HTMLElement>('#canvas-placeholder');
    placeholder?.removeAttribute('style');
    clone.querySelectorAll('.lms-drag-origin').forEach(el => el.remove());
    compactModularState(clone);
    return { html: clone.innerHTML, bg: el.dataset.bg || 'blanco', style: el.style.cssText, bgColor:el.dataset.bgColor, bgMargin:el.dataset.bgMargin };
  }
  function capture() {
    const p = current.current;
    if (!p) return null;
    if(window.lmsWorkspaceDragActive)return p;
    rememberTasks(p.spaces);
    const next = {...p, spaces:p.spaces.map(s => s.id === p.activeId ? syncWorkspaceAutomaticChecklist({...s,...snapshot()},outer(),p.autoChecklist!==false,trackedTasks.current,false) : s)};
    rememberTasks(next.spaces);
    current.current = next;
    if(next.spaces.some((space,index)=>space.checklist!==p.spaces[index].checklist)){
      setProject(next);
      setTabInfo(info=>info?{...info,space:next.spaces.find(s=>s.id===info.space.id)!}:null);
    }
    return next;
  }
  function publish(p: Project) {
    // Cross-page drag serializes both pages before publishing. Reconcile each
    // final snapshot, never a temporary parked/ghost canvas during the drag.
    if(!window.lmsWorkspaceDragActive){
      rememberTasks(p.spaces);
      p={...p,spaces:p.spaces.map(space=>syncWorkspaceAutomaticChecklist(space,undefined,p.autoChecklist!==false,trackedTasks.current,space.id!==p.activeId))};
      rememberTasks(p.spaces);
    }
    (window as any).globalFooterConfig=p.footerConfig;
    window.currentWorkspaceFooterConfig=p.spaces.find(s=>s.id===p.activeId)?.footerConfig;
    window.lmsWorkspaceCount=p.spaces.length;
    window.dispatchEvent(new Event('lms-project-spaces-changed'));
    current.current=p; setProject(p); setSaved(projectContent(p) === baseline.current);
    setTabInfo(info=>{if(!info)return null;const space=p.spaces.find(s=>s.id===info.space.id);return space?{...info,space}:null;});
  }
  function setChecklistDone(spaceId:string,index:number,done:boolean) {
    if(busy || document.querySelector('iframe[title="Diseñar ejercicio descargable"]'))return;
    const p=capture();if(!p)return;
    const space=p.spaces.find(s=>s.id===spaceId);if(!space?.checklist?.[index]||isAutomaticTask(space.checklist[index]))return;
    // Update metadata without switching tabs or rebuilding the active canvas.
    publish({...p,spaces:p.spaces.map(s=>s.id===spaceId?{...s,checklist:s.checklist!.map((item,i)=>i===index?{...item,done}:item)}:s)});
  }
  function resetNameEditor(name: string) {
    setDraftName(name);
    setEditingName(false);
    setNameHint(0);
    nameInput.current?.setCustomValidity('');
  }
  function toggleAutomaticChecklist(){
    if(busy||document.querySelector('iframe[title="Diseñar ejercicio descargable"]'))return;
    const p=capture();if(!p)return;
    publish({...p,autoChecklist:p.autoChecklist===false});
  }
  function restore(s: Workspace) {
    window.currentEditableText = null;
    document.getElementById('rtf-toolbar')?.classList.add('hidden');
    outer().innerHTML=s.html; restoreBackgroundMetadata(outer(),s); outer().style.cssText=s.style;
    if(ensureMediaChecklistIds(outer()))s.html=outer().innerHTML;
    outer().querySelectorAll('[data-sortable-active]').forEach(n => n.removeAttribute('data-sortable-active'));
    window.initNestedDropzones(); upgradeTitleImageElements(); window.checkEmptyState();
    loadWorkspaceHistory(histories.current.get(s.id));
  }
  async function canReplace(mode:'new'|'open'='open') {
    if (busy) { setMessage('Espera a que termine el guardado del proyecto.'); return false; }
    if (document.querySelector('iframe[title="Diseñar ejercicio descargable"]')) { setMessage('Guarda y vuelve o cancela la edición del ejercicio primero.'); return false; }
    const p=capture();
    if(!p)return true;
    if(mode==='new'){
      const choice=await projectDialog('¿Qué deseas hacer con el proyecto actual?',undefined,[
        {value:'save',label:'Guardar y crear nuevo'},{value:'discard',label:'Crear nuevo sin guardar'},{value:'cancel',label:'Seguir trabajando'}]);
      if(choice==='save')return await save();
      return choice==='discard';
    }
    return (await projectDialog('¿Descartar el trabajo actual y abrir otro proyecto?',undefined,[
      {value:'discard',label:'Descartar y abrir proyecto'},{value:'cancel',label:'Seguir trabajando'}]))==='discard';
  }
  async function create() {
    if (!(await canReplace('new'))) return false;
    if (!blank.current) blank.current=emptyWorkspace();
    const s={...emptyWorkspace(),id:crypto.randomUUID(),name:'Página 1'};
    baseline.current=null;handle.current=null;histories.current.clear();
    trackedTasks.current={buttons:new Set(),media:new Set()};
    resetNameEditor('Proyecto nuevo');
    restore(s);publish({format:'lms-builder-project',version:1,name:'Proyecto nuevo',activeId:s.id,spaces:[s]});setMenu(false);return true;
  }
  async function open() {
    if (busy) return;
    if (document.querySelector('iframe[title="Diseñar ejercicio descargable"]')) { setMessage('Guarda y vuelve o cancela la edición del ejercicio primero.'); return; }
    const input=document.createElement('input');input.type='file';input.accept='.lmsproject,.json,.html,.htm';
    input.hidden=true;document.body.append(input);
    input.addEventListener('cancel',()=>input.remove(),{once:true});
    input.onchange=async()=> {
      const file=input.files?.[0];input.remove();if(!file)return;
      try {
        const migrate=/\.html?$/i.test(file.name);
        if(!migrate && !/\.(lmsproject|json)$/i.test(file.name))throw new Error('Selecciona un proyecto .lmsproject o un HTML anterior del Builder.');
        const text=await file.text();
        if(!blank.current)blank.current=emptyWorkspace();
        let p:Project;
        if(migrate) {
          const doc=new DOMParser().parseFromString(text,'text/html');
          const state=doc.getElementById('lms-state');
          if(!state)throw new Error('Este HTML no contiene el estado editable del Builder.');
          let raw=state instanceof HTMLTextAreaElement ? state.value : state.textContent || '';
          let html:string;
          if(state.dataset.encoding==='json') html=JSON.parse(raw);
          else { try {raw=JSON.parse(raw);}catch{} html=decodeURIComponent(atob(raw)); }
          if(typeof html!=='string')throw new Error('El estado del HTML no es válido.');
          if(!blank.current)blank.current=emptyWorkspace();
          if(!html.includes('id="canvas"')) {
            const template=document.createElement('div');template.innerHTML=blank.current.html;
            template.querySelector('#canvas')!.innerHTML=html;html=template.innerHTML;
          }
          const s={...blank.current,id:crypto.randomUUID(),name:file.name.replace(/\.html?$/i,''),html};
          p={format:'lms-builder-project',version:1,name:file.name.replace(/\.html?$/i,''),activeId:s.id,spaces:[s]};
        } else p={...parseProject(text),name:projectNameFromFile(file.name)};
        // Project files contain executable editor markup: open only trusted local files.
        if(!(await projectDialog('Abre únicamente proyectos y HTML de confianza. ¿Continuar con este archivo?')))return;
        if(migrate) {
          const existing=capture();
          const imported=p.spaces[0];
          if(existing) {
            histories.current.set(existing.activeId,takeWorkspaceHistory());
            p={...existing,activeId:imported.id,spaces:[...existing.spaces,imported]};
          } else { histories.current.clear();handle.current=null;baseline.current=null;trackedTasks.current={buttons:new Set(),media:new Set()}; }
          restore(imported);publish(p);resetNameEditor(p.name);setMenu(false);
          setMessage('HTML anterior añadido como nueva página. Guarda el proyecto para conservarlo.');
          return;
        }
        if(!(await canReplace()))return;
        histories.current.clear();handle.current=null;
        trackedTasks.current={buttons:new Set(),media:new Set()};
        restore(p.spaces.find(s=>s.id===p.activeId)!);
        baseline.current=projectContent(p);publish(p);resetNameEditor(p.name);setMenu(false);
        setMessage('Proyecto abierto. Guardar te permitirá elegir el archivo de destino.');
      }catch(error){setMessage((error as Error).message);}
    };input.click();
  }
  async function save(asNew = false, requestedName?: string, downloadOnly = false): Promise<boolean> {
    if(busy)return false;
    if(document.querySelector('iframe[title="Diseñar ejercicio descargable"]')) {setMessage('Primero guarda y vuelve desde el ejercicio.');return false;}
    const captured=capture();if(!captured)return false;
    if(!requestedName && (asNew || captured.name.trim().toLocaleLowerCase()==='proyecto nuevo')) {
      setDraftName(captured.name);setEditingName(true);setNameHint(Date.now());setMenu(false);
      // Also refocus when Save as is chosen while the name editor is already open.
      requestAnimationFrame(()=>{
        nameInput.current?.setCustomValidity('');
        nameInput.current?.focus();
        nameInput.current?.select();
      });
      return false;
    }
    const p={...captured,name:requestedName || captured.name};
    setBusy(true);
    try {
      if(downloadOnly || !(window as any).showSaveFilePicker)throw new Error('Use project download');
      const chosen=(!asNew && handle.current) || await (window as any).showSaveFilePicker({suggestedName:p.name.replace(/[<>:"/\\|?*]/g,'_')+'.lmsproject',types:[{description:'Proyecto Builder LMS',accept:{'application/json':['.lmsproject']}}]});
      const savedProject={...p,name:projectNameFromFile(chosen.name)};
      const writable=await chosen.createWritable();await writable.write(JSON.stringify(savedProject));await writable.close();
      handle.current=chosen;baseline.current=projectContent(savedProject);
      const latest={...capture()!,name:savedProject.name};publish(latest);setMessage('Proyecto guardado en PC.');setMenu(false);return projectContent(latest)===baseline.current;
    }catch(error){
      if((error as Error).name!=='AbortError'){
        handle.current=null;
        try {
          const filename=p.name.replace(/[<>:"/\\|?*]/g,'_')+'.lmsproject';
          const downloadedProject={...p,name:projectNameFromFile(filename)};
          const blob=new Blob([JSON.stringify(downloadedProject)],{type:'application/json'});
          const url=URL.createObjectURL(blob);
          const a=document.createElement('a');a.href=url;a.download=filename;
          try {document.body.appendChild(a);a.click();}
          finally {a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60000);}
          setMenu(false);
          // A download click cannot confirm that the browser saved the file,
          // particularly inside a sandboxed iframe. Never discard work on that alone.
          const confirmation=await projectDialog('Revisa tus descargas. ¿Se guardó el archivo '+filename+'?',undefined,[
            {value:'downloaded',label:'Sí, el archivo se descargó'},
            {value:'cancel',label:'No se descargó / seguir editando'}]);
          if(confirmation!=='downloaded'){
            setMessage('Conservamos tu trabajo. Si el iframe bloquea las descargas, abre la app en una pestaña independiente o habilita allow-downloads en su contenedor.');return false;
          }
          baseline.current=projectContent(downloadedProject);
          const latest={...capture()!,name:downloadedProject.name};publish(latest);
          setMessage('Proyecto descargado. Puedes reabrirlo con «Abrir proyecto o HTML». Los siguientes guardados descargarán otra copia.');
          return projectContent(latest)===baseline.current;
        }catch{
          setMessage('No se pudo descargar el proyecto. Conservamos tu trabajo; vuelve a intentarlo.');
        }
      }
    }
    finally{setBusy(false);}
    return false;
  }
  function change(id:string) {
    if(window.lmsWorkspaceDragActive)return;
    if(busy || document.querySelector('iframe[title="Diseñar ejercicio descargable"]'))return;
    const p=capture()!;histories.current.set(p.activeId,takeWorkspaceHistory());
    const s=p.spaces.find(s=>s.id===id)!;restore(s);publish({...p,activeId:id});
  }
  async function edit(action:'add'|'rename'|'delete', targetId?:string) {
    const p=capture();if(!p || busy)return;
    if(document.querySelector('iframe[title="Diseñar ejercicio descargable"]'))return;
    const index=p.spaces.findIndex(s=>s.id===(targetId || p.activeId)),spaces=[...p.spaces];
    if(action==='add') {
      const names=await pageListDialog(`Página ${spaces.length+1}`);if(!names?.length)return;
      histories.current.set(p.activeId,takeWorkspaceHistory());
      const added=names.map(name=>({...emptyWorkspace(),id:crypto.randomUUID(),name}));
      spaces.push(...added);const s=added[0];restore(s);publish({...p,spaces,activeId:s.id});return;
    }
    if(action==='rename') {const settings=await workspaceDialog(spaces[index]);if(!settings)return;spaces[index]={...spaces[index],...settings};}
    if(action==='delete') {
      if(spaces.length===1){setMessage('El proyecto debe conservar al menos un espacio.');return;}
      if(!(await projectDialog(`¿Eliminar «${spaces[index].name}» y su contenido? Esta acción no se puede deshacer.`)))return;
      const removed=spaces[index].id;histories.current.delete(removed);spaces.splice(index,1);
      if(removed===p.activeId){const next=spaces[Math.min(index,spaces.length-1)];restore(next);publish({...p,spaces,activeId:next.id});}else publish({...p,spaces});return;
    }
    publish({...p,spaces});
  }
  async function renameProject() {
    if(busy)return;
    const p=capture();if(!p)return;
    const isExisting=baseline.current!==null;
    const name=await projectDialog(isExisting?'Guardar como: nombre de la copia':'Guardar proyecto con este nombre',p.name);
    if(name)await save(isExisting,name);
  }
  function reorder(from:string, to:string) {
    if(busy || document.querySelector('iframe[title="Diseñar ejercicio descargable"]'))return;
    const p=capture();if(!p || from===to)return;
    const spaces=[...p.spaces],a=spaces.findIndex(s=>s.id===from),b=spaces.findIndex(s=>s.id===to);
    if(a<0||b<0)return;
    const [moved]=spaces.splice(a,1);spaces.splice(b,0,moved);publish({...p,spaces});
  }
  async function copy() {
    if(busy){setMessage('Espera a que termine el guardado y vuelve a copiar.');return;}
    const p=capture();if(!p)return;
    const space=p.spaces.find(s=>s.id===p.activeId),pending=workspacePendingTasks(space);
    if(pending.length){
      const choice=await projectDialog('Esta pestaña tiene pendientes',undefined,[
        {value:'cancel',label:'Regresar a editar'},
        {value:'continue',label:'Continuar con pendientes'}
      ],{description:`Antes de copiar «${space!.name}» a Brightspace, revisa estos pendientes. Puedes continuar con la copia o regresar para seguir editando.`,items:pending});
      if(choice!=='continue')return;
    }
    if(projectContent(p)!==baseline.current){
      setSaved(false);
      const choice=await projectDialog('Recuerda guardar los cambios para conservar la última versión del proyecto.',undefined,[{value:'save',label:'Guardar progreso y copiar'},{value:'copy',label:'Continuar sin guardar'},{value:'cancel',label:'Cancelar'}]);
      if(choice==='save'){
        let name:string|undefined;
        if(p.name.trim().toLocaleLowerCase()==='proyecto nuevo'){
          const value=await projectDialog('Nombre del proyecto para guardar',p.name);if(!value)return;name=value;
        }
        if(!(await save(false,name)))return;
      }else if(choice!=='copy')return;
    }
    const html=window.generateExportHTML(false);
    if(!html){setMessage('No se pudo generar el HTML. Revisa los ejercicios y sus recursos.');return;}
    if(html.length>LMS_CHARACTER_LIMIT){setMessage(`El espacio ocupa ${html.length.toLocaleString('es-MX')} caracteres y supera el límite de 2,000,000. Divide el contenido en más espacios o reduce los ejercicios incorporados.`);return;}
    try {await navigator.clipboard.writeText(html);setMessage(`HTML del espacio activo copiado: ${html.length.toLocaleString('es-MX')} caracteres.`);}
    catch {setMessage('No se pudo acceder al portapapeles. Usa Chrome en HTTPS o localhost y permite copiar.');}
  }
  useEffect(()=>{
    const applyGlobal=(event:Event)=>{
      const p=capture();if(!p)return;
      const footerConfig=(event as CustomEvent).detail;
      const spaces=p.spaces.map(space=>{
        if(space.id===p.activeId)return {...space,footerConfig};
        const container=document.createElement('div');container.innerHTML=space.html;
        container.querySelectorAll<HTMLElement>('.lms-footer-wrapper').forEach(wrapper=>window.applyFooterConfigBase(wrapper));
        const html=container.innerHTML;
        if(html!==space.html){
          const history=histories.current.get(space.id);
          const stack=history?history.stack.slice(0,history.index+1):[space.html];
          stack.push(html);histories.current.set(space.id,{stack,index:stack.length-1});
        }
        return {...space,html,footerConfig};
      });
      publish({...p,spaces,footerConfig});
    };
    window.addEventListener('lms-global-footer-changed',applyGlobal);
    return ()=>window.removeEventListener('lms-global-footer-changed',applyGlobal);
  },[]);
  useEffect(()=>{
    let editing=false;
    const openAppearance=async()=>{
      if(editing||busyRef.current||window.isLmsDragging||window.lmsWorkspaceDragActive)return;
      if(document.querySelector('iframe[title="Diseñar ejercicio descargable"]')){setMessage('Termina de editar el ejercicio primero.');return;}
      const initial=capture();if(!initial||initial.spaces.length<2)return;
      editing=true;setTabInfo(null);
      try{
        const changes=await appearanceDialog(initial.spaces,initial.footerConfig);if(!changes)return;
        const p=capture();if(!p)return;
        const bgIds=new Set(changes.background?.ids),footerIds=new Set(changes.footer?.ids);
        window.saveHistoryState(true);
        const spaces=p.spaces.map(space=>{
          if(!bgIds.has(space.id)&&!footerIds.has(space.id))return space;
          const active=space.id===p.activeId,root=active?outer():workspaceAppearanceRoot(space);
          if(bgIds.has(space.id))applyBackground(root,changes.background!.value);
          if(footerIds.has(space.id))applyFooter(root,changes.footer!.value);
          const next={...space,...snapshot(root),...(footerIds.has(space.id)?{footerConfig:{...changes.footer!.value}}:{})};
          if(!active&&next.html!==space.html){
            const history=histories.current.get(space.id);
            const stack=history?history.stack.slice(0,history.index+1):[space.html];
            stack.push(next.html);histories.current.set(space.id,{stack,index:stack.length-1});
          }
          return next;
        });
        window.saveHistoryState(true);publish({...p,spaces});
        setMessage('Diseño aplicado a los espacios seleccionados. Recuerda guardar el proyecto.');
      }catch(error){setMessage((error as Error).message);}
      finally{editing=false;}
    };
    window.addEventListener('lms-open-appearance-batch',openAppearance);
    return()=>window.removeEventListener('lms-open-appearance-batch',openAppearance);
  },[]);
  useEffect(()=>installWorkspaceDrag({
    begin:()=>{
      if(busyRef.current||document.querySelector('iframe[title="Diseñar ejercicio descargable"]'))return null;
      const p=capture();if(!p)return null;
      histories.current.set(p.activeId,takeWorkspaceHistory());setTabInfo(null);return p;
    },
    show:id=>{const p=current.current;if(p)publish({...p,activeId:id});},
    serialize:snapshot,
    finish:(before,updates,activeId,cancelled)=>{
      const spaces=before.spaces.map(s=>updates.has(s.id)?{...s,...updates.get(s.id)!}:s);
      for(const s of spaces){
        const original=before.spaces.find(previous=>previous.id===s.id)!;
        if(original.html===s.html)continue;
        const history=histories.current.get(s.id);
        const stack=history?history.stack.slice(0,history.index+1):[];
        if(stack.at(-1)!==original.html)stack.push(original.html);
        stack.push(s.html);histories.current.set(s.id,{stack,index:stack.length-1});
      }
      publish({...before,spaces,activeId});loadWorkspaceHistory(histories.current.get(activeId));
      setMessage(cancelled?'Movimiento cancelado. El elemento permanece en su posición original.':'Elemento movido al espacio seleccionado.');
    }
  }),[]);
  useEffect(()=>{
    // Parent initializes the imperative editor after mounting.
    let timer: ReturnType<typeof setTimeout>;
    const inspect=()=>{
      if(!outer() || !window.initNestedDropzones || document.body.classList.contains('is-dragging') || window.isLmsDragging || window.lmsWorkspaceDragActive)return;
      if(!blank.current)blank.current=emptyWorkspace();
      const p=capture();if(p)setSaved(projectContent(p)===baseline.current);
    };
    const schedule=()=>{
      clearTimeout(timer);
      if(document.body.classList.contains('is-dragging') || window.isLmsDragging || window.lmsWorkspaceDragActive)return;
      timer=setTimeout(inspect,250);
    };
    const observer=new MutationObserver(schedule);
    if(outer())observer.observe(outer(),{subtree:true,childList:true,characterData:true,attributes:true});
    outer()?.addEventListener('input',schedule);
    window.addEventListener('lms-drag-ended',schedule);
    window.addEventListener('lms-button-state-changed',inspect);
    schedule();
    const warn=(e:BeforeUnloadEvent)=>{const p=capture();if(p && projectContent(p)!==baseline.current){e.preventDefault();e.returnValue='';}};
    window.addEventListener('beforeunload',warn);
    return()=>{clearTimeout(timer);observer.disconnect();outer()?.removeEventListener('input',schedule);window.removeEventListener('lms-drag-ended',schedule);window.removeEventListener('lms-button-state-changed',inspect);window.removeEventListener('beforeunload',warn);};
  },[]);
  return <div className="project-controls">
    <div className="project-bar" data-tour="project-manager">
      <div className="project-menu-anchor" onPointerLeave={e=>{if(e.pointerType==='mouse')setMenu(false);}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setMenu(false);}} onKeyDown={e=>{if(e.key==='Escape'){setMenu(false);(e.currentTarget.querySelector('.project-menu-toggle') as HTMLButtonElement | null)?.focus();}}}>
        <button className="project-menu-toggle" title="Menú del proyecto" aria-expanded={menu} aria-controls="project-file-menu" onClick={()=>setMenu(!menu)}><span className="material-symbols-outlined">menu</span></button>
        <div id="project-file-menu" className={`project-menu${menu?' is-open':''}`} inert={!menu} aria-hidden={!menu}><button disabled={busy} onClick={()=>create()}>Nuevo proyecto</button><button disabled={busy} onClick={()=>open()}>Abrir proyecto o HTML</button><button disabled={!project||busy} onClick={()=>save()}>Guardar</button><button data-tour="tutorial-launcher" onClick={()=>{setMenu(false);onTutorial();}}><span className="material-symbols-outlined">school</span>Tutorial</button><button type="button" className="project-auto-checklist" role="switch" aria-label="Pendientes automáticos" aria-checked={project?.autoChecklist!==false} disabled={!project||busy} onClick={toggleAutomaticChecklist} title="Controla la creación de nuevos pendientes. Los existentes siguen actualizándose y puedes agregar tareas manualmente."><span className="project-auto-label"><strong>Pendientes automáticos</strong><small>{project?.autoChecklist===false?'No agregar nuevos pendientes':'Agregar cuando falte contenido'}</small></span><span className="project-switch-track" aria-hidden="true"/></button></div>
      </div>
      <span className="project-save-state" role="status">{saved?'Guardado':'Sin guardar'}</span>
      <div className="project-name-anchor">
        {editingName ? <form className="project-name-form" onSubmit={e=>{
          e.preventDefault();
          const name=draftName.trim().replace(/\.lmsproject$/i,'').trim();
          if(!name || name.toLocaleLowerCase()==='proyecto nuevo'){
            nameInput.current?.setCustomValidity('Escribe un nombre distinto de Proyecto nuevo.');nameInput.current?.reportValidity();return;
          }
          const p=capture();if(!p)return;
          publish({...p,name});setEditingName(false);setNameHint(0);void save(true,name,true);
        }}>
          <input ref={nameInput} aria-label="Nombre de tu proyecto" value={draftName} required maxLength={120} onChange={e=>{e.currentTarget.setCustomValidity('');setDraftName(e.target.value);}} onKeyDown={e=>{if(e.key==='Escape'){setEditingName(false);setNameHint(0);}}}/>
          <button type="submit" aria-label="Confirmar nombre y descargar" title="Confirmar nombre y descargar"><span className="material-symbols-outlined">check</span></button>
        </form> : <button className="project-name" title="Doble clic para renombrar y guardar proyecto" onDoubleClick={renameProject} onKeyDown={e=>{if(e.key==='F2')void renameProject();}}>{project?.name || 'Sin proyecto'}</button>}
        {nameHint>0 && <div key={nameHint} className="project-name-hint" role="status"><span className="material-symbols-outlined" aria-hidden="true">north</span>Escribe aquí el nombre de tu proyecto.</div>}
      </div>
      <div className="project-tab-strip" onKeyDown={e=>{
        if(e.key==='ArrowDown'&&!e.altKey&&(e.target as HTMLElement).matches('[role="tab"]')) {
          const checkbox=document.querySelector<HTMLInputElement>('#project-tab-info input:not(:disabled)');
          if(checkbox){e.preventDefault();keepTabInfo();checkbox.focus();}
        }
      }} style={{'--active-tab-color':project?.spaces.find(s=>s.id===project.activeId)?.tabColor||'var(--default-tab-color)'} as CSSProperties}>
      <div className="project-tabs" role="tablist" aria-label="Espacios de trabajo">{project?.spaces.map(s=><div className="project-tab" data-workspace-id={s.id} data-colored={!!s.tabColor} style={{'--tab-color':s.tabColor||'var(--default-tab-color)','--tab-ink':s.tabColor?tabInk(s.tabColor):'var(--default-tab-ink)'} as CSSProperties} data-active={s.id===project.activeId} key={s.id} draggable={!busy}
        onDragStart={e=>{setTabInfo(null);e.dataTransfer.setData('application/x-lms-space',s.id);e.dataTransfer.effectAllowed='move';}}
        onDragOver={e=>{if(e.dataTransfer.types.includes('application/x-lms-space')){e.preventDefault();e.dataTransfer.dropEffect='move';}}}
        onDrop={e=>{e.preventDefault();reorder(e.dataTransfer.getData('application/x-lms-space'),s.id);}}>
        <button role="tab" aria-selected={s.id===project.activeId} disabled={busy} aria-description={workspaceTooltip(s)} aria-describedby={tabInfo?.space.id===s.id?'project-tab-info':undefined} onMouseEnter={e=>showTabInfo(s,e.currentTarget)} onMouseLeave={hideTabInfo} onFocus={e=>showTabInfo(s,e.currentTarget)} onBlur={hideTabInfo} onClick={()=>{setTabInfo(null);if(s.id!==project.activeId)change(s.id);}} onDoubleClick={()=>{setTabInfo(null);void edit('rename',s.id);}} onKeyDown={e=>{if(e.key==='F2'){setTabInfo(null);void edit('rename',s.id);}if(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();const i=project.spaces.findIndex(x=>x.id===s.id),next=project.spaces[i+(e.key==='ArrowLeft'?-1:1)];if(next)reorder(s.id,next.id);}}}>{workspaceChecklistState(s)&&<span className="project-tab-checklist-dot" data-state={workspaceChecklistState(s)} aria-hidden="true" title={workspaceChecklistState(s)==='complete'?'Checklist completo':'Checklist con pendientes'}/>}<span>{s.name}</span></button>
        <button className="project-tab-delete" disabled={busy} title={'Eliminar '+s.name} aria-label={'Eliminar '+s.name} onClick={()=>edit('delete',s.id)}><span className="material-symbols-outlined">close</span></button>
      </div>)}</div>
      {project && <button className="project-tab-add" disabled={busy} title="Agregar página" aria-label="Agregar página" onClick={()=>edit('add')}><span className="material-symbols-outlined">add</span></button>}
      </div>
      <button className="project-copy" data-tour="export-copy" title="Copiar espacio activo a Brightspace" aria-label="Copiar a Brightspace" onClick={copy}><span className="material-symbols-outlined">content_copy</span></button>
    </div>
    {tabInfo && createPortal(<div id="project-tab-info" className="project-tab-info" role="region" aria-label={'Información de '+tabInfo.space.name} style={{left:tabInfo.x,top:tabInfo.y,maxHeight:`calc(100dvh - ${tabInfo.y+12}px)`}} onMouseEnter={keepTabInfo} onMouseLeave={hideTabInfo} onFocus={keepTabInfo} onBlur={hideTabInfo} onKeyDown={e=>{
      if(e.key==='Escape') {
        e.stopPropagation();
        const index=project?.spaces.findIndex(s=>s.id===tabInfo.space.id)??-1;
        document.querySelectorAll<HTMLButtonElement>('.project-tabs [role="tab"]')[index]?.focus();
        setTabInfo(null);
      }
    }}>
      <strong><span className="project-tab-info-dot" style={{background:tabInfo.space.tabColor||'#ffffff'}}/>{tabInfo.space.name}</strong>
      {!!tabInfo.space.notes?.length&&<section><h3>Notas</h3>{tabInfo.space.notes.map((note,i)=><p key={i}>{note}</p>)}</section>}
      {!!tabInfo.space.checklist?.length&&<section><h3>Checklist</h3>{tabInfo.space.checklist.map((item,i)=><label className="project-tab-info-task" data-done={item.done} title={isAutomaticTask(item)?automaticTaskHint(item):undefined} key={i}><input type="checkbox" checked={item.done} disabled={busy||isAutomaticTask(item)} aria-label={item.text} onChange={e=>setChecklistDone(tabInfo.space.id,i,e.currentTarget.checked)}/><span>{item.text}<small>{item.done?'Completado':'Pendiente'}{isAutomaticTask(item)?' · Automático':''}</small></span></label>)}</section>}
      <section className="project-export-size" aria-label="Tamaño del código para LMS" data-level={exportSize?.count!=null&&exportSize.count>LMS_CHARACTER_LIMIT?'over':exportSize?.count!=null&&exportSize.count>=LMS_CHARACTER_LIMIT*.9?'warning':'normal'}>
        <h3>Código para LMS</h3>
        {exportSize?.id!==tabInfo.space.id?<p>Calculando caracteres…</p>:exportSize.count===null?<p>Completa y guarda los ejercicios y revisa sus recursos para calcular el HTML exportable.</p>:<>
          <div className="project-export-total"><strong>{formatCharacters(exportSize.count)}</strong><span> / {formatCharacters(LMS_CHARACTER_LIMIT)} caracteres</span></div>
          <progress max={LMS_CHARACTER_LIMIT} value={Math.min(exportSize.count,LMS_CHARACTER_LIMIT)} aria-label="Caracteres del HTML exportado" aria-valuetext={`${formatCharacters(exportSize.count)} de ${formatCharacters(LMS_CHARACTER_LIMIT)} caracteres`}/>
          <small>{exportSize.count>LMS_CHARACTER_LIMIT?`Excede el límite por ${formatCharacters(exportSize.count-LMS_CHARACTER_LIMIT)} caracteres`:`Disponibles: ${formatCharacters(LMS_CHARACTER_LIMIT-exportSize.count)} caracteres`}</small>
        </>}
      </section>
      <footer>Doble clic para editar la información</footer>
    </div>,document.body)}
    {(busy || message) && <div className="project-status" role="status" onClick={()=>setMessage('')}>{busy?'Guardando…':message}</div>}
    {!project && <div className="project-welcome" role="dialog" aria-modal="true" aria-label="Comenzar proyecto"><section><h2>Tu proyecto de aprendizaje</h2><p>Diseña varias páginas en un proyecto. Puedes copiar a Brightspace sin guardar. Recuerda guardar en PC para conservar la última versión de tu proyecto.</p><div className="welcome-actions"><button onClick={()=>create()}>Nuevo proyecto</button><button onClick={()=>open()}>Abrir proyecto o HTML</button><button className="welcome-icon-action" title="Recorrido de app" aria-label="Recorrido de app" onClick={async()=>{if(await create())requestAnimationFrame(()=>startTutorial('interfaz'));}}><span className="material-symbols-outlined" aria-hidden="true">school</span></button><button className="welcome-icon-action" title="Tutoriales en video" aria-label="Tutoriales en video" onClick={()=>setShowVideoNotice(true)}><span className="material-symbols-outlined" aria-hidden="true">smart_display</span></button></div>{showVideoNotice && <p className="welcome-video-notice" role="status">Se están preparando los tutoriales</p>}</section></div>}
  </div>;
}
