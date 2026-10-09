import { useEffect, useRef, useState } from 'react';
import { compactModularState } from './modular-table';
import { takeWorkspaceHistory, loadWorkspaceHistory, upgradeTitleImageElements } from './vanilla-setup';
import { parseProject, projectContent, projectNameFromFile, emptyWorkspace, type Project, type Workspace } from './project-model';

import { startTutorial } from './tutorial';
import { projectDialog } from './project-dialog';

type History = ReturnType<typeof takeWorkspaceHistory>;
export default function ProjectManager({onTutorial}: {onTutorial:()=>void}) {
  const [project, setProject] = useState<Project | null>(null);
  const current = useRef<Project | null>(null);
  const baseline = useRef<string | null>(null);
  const handle = useRef<any>(null);
  const blank = useRef<Workspace | null>(null);
  const histories = useRef(new Map<string, History>());
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
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
  function snapshot(): Pick<Workspace,'html'|'bg'|'style'> {
    const el = outer(), clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.sortable-ghost,.layout-intent-indicator,#empty-state').forEach(n => n.remove());
    clone.querySelectorAll('*').forEach(n => {
      n.removeAttribute('contenteditable'); n.removeAttribute('data-sortable-active');
      n.classList.remove('selected-img','drag-over','is-dragging','drag-item');
    });
    clone.querySelectorAll<HTMLElement>('.parallax-layer').forEach(n => n.style.removeProperty('transform'));
    const placeholder = clone.querySelector<HTMLElement>('#canvas-placeholder');
    placeholder?.removeAttribute('style');
    compactModularState(clone);
    return { html: clone.innerHTML, bg: el.dataset.bg || 'blanco', style: el.style.cssText };
  }
  function capture() {
    const p = current.current;
    if (!p) return null;
    const next = {...p, spaces:p.spaces.map(s => s.id === p.activeId ? {...s,...snapshot()} : s)};
    current.current = next;
    return next;
  }
  function publish(p: Project) { current.current=p; setProject(p); setSaved(projectContent(p) === baseline.current); }
  function restore(s: Workspace) {
    window.currentEditableText = null;
    document.getElementById('rtf-toolbar')?.classList.add('hidden');
    outer().innerHTML=s.html; outer().dataset.bg=s.bg; outer().style.cssText=s.style;
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
          } else { histories.current.clear();handle.current=null;baseline.current=null; }
          restore(imported);publish(p);setMenu(false);
          setMessage('HTML anterior añadido como nueva página. Guarda el proyecto para conservarlo.');
          return;
        }
        if(!(await canReplace()))return;
        histories.current.clear();handle.current=null;
        restore(p.spaces.find(s=>s.id===p.activeId)!);
        baseline.current=projectContent(p);publish(p);setMenu(false);
        setMessage('Proyecto abierto. Guardar te permitirá elegir el archivo de destino.');
      }catch(error){setMessage((error as Error).message);}
    };input.click();
  }
  async function save(asNew = false, requestedName?: string, downloadOnly = false): Promise<boolean> {
    if(busy)return false;
    if(document.querySelector('iframe[title="Diseñar ejercicio descargable"]')) {setMessage('Primero guarda y vuelve desde el ejercicio.');return false;}
    const captured=capture();if(!captured)return false;
    if(!requestedName && captured.name.trim().toLocaleLowerCase()==='proyecto nuevo') {
      setDraftName(captured.name);setEditingName(true);setNameHint(Date.now());setMenu(false);
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
    if(busy || document.querySelector('iframe[title="Diseñar ejercicio descargable"]'))return;
    const p=capture()!;histories.current.set(p.activeId,takeWorkspaceHistory());
    const s=p.spaces.find(s=>s.id===id)!;restore(s);publish({...p,activeId:id});
  }
  async function edit(action:'add'|'rename'|'delete', targetId?:string) {
    const p=capture();if(!p || busy)return;
    if(document.querySelector('iframe[title="Diseñar ejercicio descargable"]'))return;
    const index=p.spaces.findIndex(s=>s.id===(targetId || p.activeId)),spaces=[...p.spaces];
    if(action==='add') {
      const name=await projectDialog('Nombre de la nueva página',`Página ${spaces.length+1}`);if(!name)return;
      histories.current.set(p.activeId,takeWorkspaceHistory());
      const s={...emptyWorkspace(),id:crypto.randomUUID(),name};spaces.push(s);restore(s);publish({...p,spaces,activeId:s.id});return;
    }
    if(action==='rename') {const name=await projectDialog('Nombre del espacio',spaces[index].name);if(!name)return;spaces[index]={...spaces[index],name};}
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
    const p=capture();if(!p || projectContent(p)!==baseline.current){setSaved(false);setMessage('Guarda los últimos cambios del proyecto antes de copiar.');return;}
    const html=window.generateExportHTML(false);
    if(!html){setMessage('No se pudo generar el HTML. Revisa los ejercicios y sus recursos.');return;}
    if(html.length>2000000){setMessage(`El espacio ocupa ${html.length.toLocaleString('es-MX')} caracteres y supera el límite de 2,000,000. Divide el contenido en más espacios o reduce los ejercicios incorporados.`);return;}
    try {await navigator.clipboard.writeText(html);setMessage(`HTML del espacio activo copiado: ${html.length.toLocaleString('es-MX')} caracteres.`);}
    catch {setMessage('No se pudo acceder al portapapeles. Usa Chrome en HTTPS o localhost y permite copiar.');}
  }
  useEffect(()=>{
    // Parent initializes the imperative editor after mounting.
    let timer: ReturnType<typeof setTimeout>;
    const inspect=()=>{
      if(!outer() || !window.initNestedDropzones || document.body.classList.contains('is-dragging') || window.isLmsDragging)return;
      if(!blank.current)blank.current=emptyWorkspace();
      const p=capture();if(p)setSaved(projectContent(p)===baseline.current);
    };
    const schedule=()=>{
      clearTimeout(timer);
      if(document.body.classList.contains('is-dragging') || window.isLmsDragging)return;
      timer=setTimeout(inspect,250);
    };
    const observer=new MutationObserver(schedule);
    if(outer())observer.observe(outer(),{subtree:true,childList:true,characterData:true,attributes:true});
    outer()?.addEventListener('input',schedule);
    window.addEventListener('lms-drag-ended',schedule);
    schedule();
    const warn=(e:BeforeUnloadEvent)=>{const p=capture();if(p && projectContent(p)!==baseline.current){e.preventDefault();e.returnValue='';}};
    window.addEventListener('beforeunload',warn);
    return()=>{clearTimeout(timer);observer.disconnect();outer()?.removeEventListener('input',schedule);window.removeEventListener('lms-drag-ended',schedule);window.removeEventListener('beforeunload',warn);};
  },[]);
  return <div className="project-controls">
    <div className="project-bar" data-tour="project-manager">
      <div className="project-menu-anchor" onPointerLeave={e=>{if(e.pointerType==='mouse')setMenu(false);}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setMenu(false);}} onKeyDown={e=>{if(e.key==='Escape'){setMenu(false);(e.currentTarget.querySelector('.project-menu-toggle') as HTMLButtonElement | null)?.focus();}}}>
        <button className="project-menu-toggle" title="Menú del proyecto" aria-expanded={menu} aria-controls="project-file-menu" onClick={()=>setMenu(!menu)}><span className="material-symbols-outlined">menu</span></button>
        <div id="project-file-menu" className={`project-menu${menu?' is-open':''}`} inert={!menu} aria-hidden={!menu}><button disabled={busy} onClick={()=>create()}>Nuevo proyecto</button><button disabled={busy} onClick={()=>open()}>Abrir proyecto o HTML</button><button disabled={!project||busy} onClick={()=>save()}>Guardar</button><button disabled={!project||busy} onClick={()=>save(true)}>Guardar como…</button><button data-tour="tutorial-launcher" onClick={()=>{setMenu(false);onTutorial();}}><span className="material-symbols-outlined">school</span>Tutorial</button></div>
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
      <div className="project-tab-strip">
      <div className="project-tabs" role="tablist" aria-label="Espacios de trabajo">{project?.spaces.map(s=><div className="project-tab" data-active={s.id===project.activeId} key={s.id} draggable={!busy}
        onDragStart={e=>{e.dataTransfer.setData('application/x-lms-space',s.id);e.dataTransfer.effectAllowed='move';}}
        onDragOver={e=>{if(e.dataTransfer.types.includes('application/x-lms-space')){e.preventDefault();e.dataTransfer.dropEffect='move';}}}
        onDrop={e=>{e.preventDefault();reorder(e.dataTransfer.getData('application/x-lms-space'),s.id);}}>
        <button role="tab" aria-selected={s.id===project.activeId} disabled={busy} title="Doble clic para renombrar; arrastra para reordenar" onClick={()=>{if(s.id!==project.activeId)change(s.id);}} onDoubleClick={()=>edit('rename',s.id)} onKeyDown={e=>{if(e.key==='F2')void edit('rename',s.id);if(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();const i=project.spaces.findIndex(x=>x.id===s.id),next=project.spaces[i+(e.key==='ArrowLeft'?-1:1)];if(next)reorder(s.id,next.id);}}}>{s.name}</button>
        <button className="project-tab-delete" disabled={busy} title={'Eliminar '+s.name} aria-label={'Eliminar '+s.name} onClick={()=>edit('delete',s.id)}><span className="material-symbols-outlined">close</span></button>
      </div>)}</div>
      {project && <button className="project-tab-add" disabled={busy} title="Agregar página" aria-label="Agregar página" onClick={()=>edit('add')}><span className="material-symbols-outlined">add</span></button>}
      </div>
      <button className="project-copy" data-tour="export-copy" disabled={!saved||busy} title={saved?'Copiar espacio activo a Brightspace':'Guarda los cambios para copiar a Brightspace'} aria-label="Copiar a Brightspace" onClick={copy}><span className="material-symbols-outlined">content_copy</span></button>
    </div>
    {(busy || message) && <div className="project-status" role="status" onClick={()=>setMessage('')}>{busy?'Guardando…':message}</div>}
    {!project && <div className="project-welcome" role="dialog" aria-modal="true" aria-label="Comenzar proyecto"><section><h2>Tu proyecto de aprendizaje</h2><p>Diseña varias páginas en un proyecto. Puedes empezar sin guardar; para copiar a Brightspace tendrás que guardar en PC.</p><div className="welcome-actions"><button onClick={()=>create()}>Nuevo proyecto</button><button onClick={()=>open()}>Abrir proyecto o HTML</button><button className="welcome-icon-action" title="Recorrido de app" aria-label="Recorrido de app" onClick={async()=>{if(await create())requestAnimationFrame(()=>startTutorial('interfaz'));}}><span className="material-symbols-outlined" aria-hidden="true">school</span></button><button className="welcome-icon-action" title="Tutoriales en video" aria-label="Tutoriales en video" onClick={()=>setShowVideoNotice(true)}><span className="material-symbols-outlined" aria-hidden="true">smart_display</span></button></div>{showVideoNotice && <p className="welcome-video-notice" role="status">Se están preparando los tutoriales</p>}</section></div>}
  </div>;
}
