import {normalizeFlowModel,addFlowNode,addFlowEdge,addFlowLane,flowNodeTypes,flowFonts,flowClamp,flowEdgeLabels,type FlowModel,type FlowNode,type FlowEdge,type FlowLane} from './flow-model';
import {renderFlowSVG,flowConnectorColor} from './flow-svg';
import {flowSnap,flowSnapPosition,resizeFlowBox,resizeFlowBoxProportionally,flowEdgeGeometry,flowLabelPosition,moveFlowEdgeRun,type FlowResizeHandle} from './flow-geometry';
import {flowOutputBox} from './flow-crop';
import {selectFlowItem,reconcileFlowSelection,flowSelectionItems,flowSelectionField,applyFlowSelectionPatch,removeFlowSelection,duplicateFlowSelection,type FlowSelection,type FlowSelectionKind} from './flow-selection';
import {createFlowColorControls} from './flow-color-controls';
import {normalizeFlowImage,flowReframeImage,type FlowImage} from './flow-image';
import {flowImageControls} from './flow-image-controls';
import {importFlowImage,flowClipboardImage} from './flow-image-import';
import {moveFlowImageText} from './flow-image-text';
import {createFlowRichText} from './flow-rich-text';
import {flowFreeTextHeight} from './flow-text-layout';
import {flowTextNode,flowNodeTextBox,moveFlowNodeText,addFlowTextBox} from './flow-node-text';
import type {FlowRichNode} from './flow-rich-document';
import './flow-editor.css';

type Side=FlowEdge['fromSide'];
type Selection=FlowSelection|null;
type Drag={pointer:number;kind:'move'|'resize'|'lane'|'lane-resize'|'bend'|'label'|'image-pan'|'image-scale'|'image-crop'|'text-move'|'text-resize';id:string;x:number;y:number;startX:number;startY:number;width:number;height:number;before:string;moved:boolean;handle?:FlowResizeHandle;axis?:'x'|'y';run?:number;edge?:FlowEdge;labelId?:string;image?:FlowImage;textBoxId?:string;textBox?:ReturnType<typeof flowNodeTextBox>;bends?:{id:string;axis:'x'|'y';position:number}[];routing?:{id:string;points:{x:number;y:number}[]}[];items:{id:string;x:number;y:number;width:number;height:number}[]};
type PaletteDrag={pointer:number;type:FlowNode['type'];item:HTMLButtonElement;x:number;y:number;moved:boolean;ghost:HTMLElement|null};
type ConnectionDrag={pointer:number;id:string;side:Side;clientX:number;clientY:number;point:{x:number;y:number};moved:boolean;target:{id:string;side:Side}|null};
const clone=(model:FlowModel)=>normalizeFlowModel(JSON.parse(JSON.stringify(model)));
const icon=(name:string)=>`<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
const svgScope=()=>`flow-editor-${Math.random().toString(36).slice(2)}`;
let activeEditor:HTMLDialogElement|null=null;

/** A self-contained editor: only the explicit Save action changes the parent block. */
export function openFlowEditor(initial:FlowModel,onSave:(model:FlowModel)=>void):void {
  if(activeEditor?.isConnected){activeEditor.focus();return;}
  let model=clone(initial);
  const initialJSON=JSON.stringify(model),scope=svgScope();
  let selection:Selection=null,drag:Drag|null=null,connecting=false,origin:{id:string;side:Side}|null=null;
  let connectionDrag:ConnectionDrag|null=null;
  let zoom=1,autoFit=true,closed=false,lastTap:{id:string;time:number}|null=null;
  let paletteDrag:PaletteDrag|null=null,suppressPaletteClickUntil=0;
  let imageEditingId:string|null=null;
  let lastBlankTap:{x:number;y:number;time:number}|null=null;
  const imports=new Map<string,AbortController>(),importMessages=new Map<string,string>();
  const past:string[]=[],future:string[]=[];
  const fieldStarts=new WeakMap<Element,string>();
  const previousFocus=document.activeElement as HTMLElement|null;
  const dialog=document.createElement('dialog');dialog.className='flow-design-editor flow-editor';dialog.dataset.flowEditor='true';activeEditor=dialog;
  dialog.setAttribute('aria-label','Diseñar diagrama de flujo');
  dialog.innerHTML=`<div class="fde-shell">
    <aside class="fde-palette" aria-label="Elementos del diagrama"><header class="fde-header"><div class="fde-heading"><h2>HTML Builder para LMS</h2><p>Editor de diagrama de flujo</p></div></header><div class="fde-palette-content"><h3>Figuras</h3><p>Arrastra al lienzo o haz clic para agregar.</p><div class="fde-shapes"></div><h3>Organización</h3><button type="button" data-action="lane" class="fde-lane-button">${icon('view_week')}<span>Agregar carril</span></button><button type="button" data-action="canvas" class="fde-lane-button">${icon('tune')}<span>Configurar lienzo</span></button><div class="fde-palette-tip">${icon('tips_and_updates')}<p>Mueve las figuras y arrastra su esquina para cambiar su tamaño. Haz doble clic para editar el texto.</p></div></div></aside>
    <div class="fde-design">
    <div class="fde-commandbar"><div class="fde-command-group"><button type="button" data-action="undo" aria-label="Deshacer" title="Deshacer (Ctrl + Z)">${icon('undo')}</button><button type="button" data-action="redo" aria-label="Rehacer" title="Rehacer (Ctrl + Mayús + Z)">${icon('redo')}</button><span class="fde-divider"></span><button type="button" class="fde-connect-switch" data-action="connect" role="switch" aria-checked="false">${icon('polyline')}<span>Conectar</span><span class="fde-switch-track" aria-hidden="true"></span></button></div><div class="fde-zoom"><button type="button" data-action="fit" title="Ajustar a la vista">${icon('fit_screen')}<span>Ajustar</span></button><label>Zoom <input type="range" min="10" max="200" step="1" value="100" aria-label="Zoom del lienzo"><output>100 %</output></label></div></div>
    <div class="fde-main"><main class="fde-workspace"><div class="fde-status" role="status" aria-live="polite"></div><div class="fde-viewport" tabindex="0" aria-label="Lienzo del diagrama"><div class="fde-stage"><div class="fde-surface"></div></div></div><div class="fde-bottom"><span class="fde-dimensions"></span><span>Ctrl + Z: deshacer · Supr: eliminar</span></div></main><aside class="fde-inspector" aria-label="Propiedades del diagrama"></aside></div>
    <footer class="fde-footer" aria-label="Acciones del diagrama"><strong>Diagrama de flujo</strong><span class="fde-footer-note">Diseño independiente de la página LMS</span><div class="fde-actions"><button type="button" data-action="cancel">Cancelar</button><button type="button" data-action="save">Guardar y volver</button></div></footer>
    </div>
  </div>`;
  const palette=dialog.querySelector<HTMLElement>('.fde-shapes')!;
  const surface=dialog.querySelector<HTMLElement>('.fde-surface')!;
  const stage=dialog.querySelector<HTMLElement>('.fde-stage')!;
  const viewport=dialog.querySelector<HTMLElement>('.fde-viewport')!;
  const inspector=dialog.querySelector<HTMLElement>('.fde-inspector')!;
  const status=dialog.querySelector<HTMLElement>('.fde-status')!;
  const zoomInput=dialog.querySelector<HTMLInputElement>('.fde-zoom input')!;
  const zoomOutput=dialog.querySelector<HTMLOutputElement>('.fde-zoom output')!;
  const colorControls=createFlowColorControls(dialog);
  const rich=createFlowRichText(dialog,{
    node:(id,boxId)=>{const node=model.nodes.find(n=>n.id===id);return node&&flowTextNode(node,boxId);},
    change:(id,runs,align,size,doc?:FlowRichNode,contentHeight?:number,boxId='primary')=>{
      const owner=model.nodes.find(n=>n.id===id);if(!owner)return;
      const node=boxId==='primary'?owner:owner.textBoxes?.find(box=>box.id===boxId);if(!node)return;
      node.text=runs.map(run=>run.text).join('');if(doc)node.richText=doc;else delete node.richText;
      if(boxId==='primary'&&owner.image)owner.image=normalizeFlowImage({...owner.image,textRuns:runs,...(align?{textAlign:align}:{})});else{node.textRuns=runs;if(align)node.textAlign=align;}
      if(size!==undefined)node.fontSize=flowClamp(size,8,72);
      if(boxId==='primary'&&owner.type==='text'&&!owner.textLayout){const required=Math.max(flowFreeTextHeight(owner),contentHeight||0);model.height=Math.min(3000,Math.max(model.height,owner.y+required));owner.height=Math.min(required,model.height-owner.y);}
    },
    layout:(id,boxId,start,handle,dx,dy)=>{const node=model.nodes.find(n=>n.id===id);if(!node)return;const layout=moveFlowNodeText(node,start,handle,dx,dy);if(boxId==='primary')node.textLayout=layout;else{const box=node.textBoxes?.find(box=>box.id===boxId);if(box)box.layout=layout;}},
    add:id=>addTextBox(id),remove:(id,boxId)=>removeTextBox(id,boxId),
    done:before=>record(before),surface,zoom:()=>zoom,snapshot:()=>snapshot(),redraw:()=>renderSurface()
  });
  const imageTools=document.createElement('div');imageTools.className='fde-image-oncanvas';imageTools.hidden=true;imageTools.setAttribute('role','toolbar');imageTools.setAttribute('aria-label','Herramientas de encuadre');imageTools.innerHTML='<button type="button" data-action="image-text">Agregar / editar texto</button><button type="button" data-action="image-fit">Restablecer encuadre</button><button type="button" data-action="image-done">Listo</button>';dialog.append(imageTools);
  imageTools.addEventListener('pointerdown',event=>event.stopPropagation());
  function imageImportMessage(id:string,message:string){importMessages.set(id,message);if(selectedNode()?.id===id){const label=inspector.querySelector<HTMLElement>('.fde-image-error');if(label)label.textContent=message;}}
  async function importImage(id:string,input:File|string){
    imports.get(id)?.abort();const controller=new AbortController();imports.set(id,controller);imageImportMessage(id,'');
    try{const result=await importFlowImage(input,controller.signal);if(closed||controller.signal.aborted||imports.get(id)!==controller)return;
      const target=model.nodes.find(n=>n.id===id);if(!target?.image)return;
      mutate(()=>{const current=model.nodes.find(n=>n.id===id)!;current.image=normalizeFlowImage({...current.image,...result,mask:current.image!.src&&current.image!.mask!=='none'?current.image!.mask:result.alpha===false?'process':'none',zoom:1,offsetX:0,offsetY:0,rotation:0,flipX:false,flipY:false});if(current.width===180&&current.height===80){current.width=Math.min(280,model.width-current.x);current.height=Math.min(220,Math.max(80,current.width*result.naturalHeight/result.naturalWidth),model.height-current.y);}imageImportMessage(id,'Imagen cargada.');});
    }catch{if(!controller.signal.aborted&&!closed)imageImportMessage(id,'No se pudo cargar la imagen.');}finally{if(imports.get(id)===controller)imports.delete(id);}
  }
  function enterImage(id:string){rich.finish();connecting=false;origin=null;selection={kind:'node',ids:[id]};imageEditingId=model.nodes.find(n=>n.id===id)?.image?.src?id:null;render();}
  function enterImageText(id:string,boxId='primary'){const node=model.nodes.find(n=>n.id===id);if(!node||!flowTextNode(node,boxId))return;if(rich.id===id&&rich.boxId===boxId)return;commitFields();selection={kind:'node',ids:[id]};imageEditingId=null;connecting=false;origin=null;if(boxId==='primary'&&node.image&&!node.text){const before=snapshot();node.text='Escribe tu texto aquí';record(before);}render();rich.start(flowTextNode(node,boxId)!,boxId);}
  function addTextBox(id:string){rich.finish();const node=model.nodes.find(n=>n.id===id);if(!node)return;let boxId:string|undefined;mutate(()=>{boxId=addFlowTextBox(node)?.id;});if(boxId)enterImageText(id,boxId);}
  function removeTextBox(id:string,boxId:string){rich.finish();mutate(()=>{const node=model.nodes.find(n=>n.id===id);if(node)node.textBoxes=node.textBoxes?.filter(box=>box.id!==boxId);});}
  const snapControls=document.createElement('div');snapControls.className='fde-snap-controls';snapControls.innerHTML='<label>Ajuste<select data-snap-mode aria-label="Ajuste del movimiento"><option value="free">Libre</option><option value="grid">Retícula · 20 px</option><option value="pixels">Por píxeles</option></select></label><label data-snap-step>Paso (px)<input type="number" min="1" max="100" step="1" data-snap-size aria-label="Paso en píxeles"></label>';
  dialog.querySelector('.fde-zoom')!.before(snapControls);
  const snapMode=snapControls.querySelector<HTMLSelectElement>('[data-snap-mode]')!,snapSize=snapControls.querySelector<HTMLInputElement>('[data-snap-size]')!;
  snapMode.onchange=()=>mutate(()=>{model.snapMode=snapMode.value as FlowModel['snapMode'];});
  snapSize.onchange=()=>mutate(()=>{model.snapSize=Math.round(flowClamp(Number(snapSize.value),1,100));});
  const button=(action:string)=>dialog.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
  const outline=document.createElement('details');outline.className='fde-outline';outline.innerHTML='<summary>Contenido</summary><div class="fde-outline-items"></div>';dialog.querySelector('.fde-palette-tip')!.before(outline);
  for(const entry of flowNodeTypes){
    const item=document.createElement('button');item.type='button';item.className='fde-shape';item.draggable=false;
    item.dataset.shape=entry.type;item.innerHTML=icon(entry.icon);const label=document.createElement('span');label.textContent=entry.label;item.append(label);palette.append(item);
  }
  function clearPaletteDrag(){
    const finished=paletteDrag;paletteDrag=null;if(!finished)return;
    finished.ghost?.remove();
    if(finished.item.hasPointerCapture(finished.pointer))finished.item.releasePointerCapture(finished.pointer);
  }
  palette.addEventListener('pointerdown',event=>{
    if(event.button!==0||paletteDrag)return;
    const item=(event.target as Element).closest<HTMLButtonElement>('[data-shape]');if(!item)return;
    paletteDrag={pointer:event.pointerId,type:item.dataset.shape as FlowNode['type'],item,x:event.clientX,y:event.clientY,moved:false,ghost:null};
    item.setPointerCapture(event.pointerId);
  });
  palette.addEventListener('pointermove',event=>{
    if(!paletteDrag||paletteDrag.pointer!==event.pointerId)return;
    if(!paletteDrag.moved&&Math.hypot(event.clientX-paletteDrag.x,event.clientY-paletteDrag.y)<6)return;
    event.preventDefault();paletteDrag.moved=true;
    if(!paletteDrag.ghost){const ghost=document.createElement('div');ghost.className='fde-drag-ghost';ghost.setAttribute('aria-hidden','true');ghost.innerHTML=paletteDrag.item.innerHTML;dialog.append(ghost);paletteDrag.ghost=ghost;}
    const rect=dialog.getBoundingClientRect();paletteDrag.ghost.style.left=`${event.clientX-rect.left+14}px`;paletteDrag.ghost.style.top=`${event.clientY-rect.top+14}px`;
  });
  palette.addEventListener('pointerup',event=>{
    if(!paletteDrag||paletteDrag.pointer!==event.pointerId)return;const finished=paletteDrag;clearPaletteDrag();
    if(!finished.moved)return;
    event.preventDefault();suppressPaletteClickUntil=performance.now()+350;
    const rect=viewport.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)return;
    const p=point(event);const width=finished.type==='circle'?112:180,height=finished.type==='circle'?112:finished.type==='decision'?120:80;
    insertNode(finished.type,p.x-width/2,p.y-height/2);
  });
  palette.addEventListener('pointercancel',()=>{if(paletteDrag?.moved)suppressPaletteClickUntil=performance.now()+350;clearPaletteDrag();});
  palette.addEventListener('lostpointercapture',()=>clearPaletteDrag());
  function selectedNode(){return selection?.kind==='node'?model.nodes.find(n=>n.id===selection.ids[0]):undefined;}
  function selectedEdge(){return selection?.kind==='edge'?model.edges.find(e=>e.id===selection.ids[0]):undefined;}
  function selectedLane(){return selection?.kind==='lane'?model.lanes.find(l=>l.id===selection.ids[0]):undefined;}
  function mixed(key:string){return flowSelectionField(model,selection,key).mixed;}
  function patchImages(patch:Partial<FlowImage>){
    for(const node of flowSelectionItems(model,selection)as FlowNode[])if(node.type==='image')node.image=normalizeFlowImage({...node.image,...patch});
  }
  function snapshot(){return JSON.stringify(model);}
  function record(before:string){if(before===snapshot())return;past.push(before);while(past.length>1&&(past.length>80||past.reduce((sum,item)=>sum+item.length,0)>32_000_000))past.shift();future.length=0;updateCommands();}
  function mutate(action:()=>void){commitFields();const before=snapshot();action();model=normalizeFlowModel(model);record(before);render();}
  function updateCommands(){
    button('undo').disabled=!past.length;button('redo').disabled=!future.length;
    button('connect').setAttribute('aria-checked',String(connecting));
    const count=selection?.ids.length||0;
    status.textContent=connectionDrag?.moved?(connectionDrag.target?'Suelta para crear la conexión.':'Arrastra hasta otra figura y suelta para conectar. Esc cancela el arrastre.'):connecting?(origin?'Elige el destino o arrastra desde una figura hasta otra. Doble clic vacío apaga Conectar.':'Conectar: haz clic en origen y destino o mantén pulsado y arrastra entre figuras. Doble clic vacío termina.'):(count>1?`${count} ${selection!.kind==='node'?'figuras seleccionadas':selection!.kind==='edge'?'conectores seleccionados':'carriles seleccionados'}. Los cambios se aplican a toda la selección.`:'Doble clic: editar texto · Arrastra un punto para conectar · Shift + clic: selección múltiple.');
  }
  function renderSurface(){
    surface.classList.toggle('is-transparent',['none','transparent'].includes(model.background)||model.backgroundOpacity<1);
    snapMode.value=model.snapMode;snapSize.value=String(model.snapSize);(snapControls.querySelector('[data-snap-step]')as HTMLElement).hidden=model.snapMode!=='pixels';
    surface.style.width=`${model.width}px`;surface.style.height=`${model.height}px`;
    surface.style.transform=`scale(${zoom})`;stage.style.width=`${model.width*zoom}px`;stage.style.height=`${model.height*zoom}px`;
    selection=reconcileFlowSelection(model,selection);
    if(selection?.kind!=='node'||selection.ids.length!==1||selection.ids[0]!==imageEditingId)imageEditingId=null;
    surface.innerHTML=renderFlowSVG(model,{interactive:true,selectedNodeIds:selection?.kind==='node'?selection.ids:undefined,selectedEdgeIds:selection?.kind==='edge'?selection.ids:undefined,selectedLaneIds:selection?.kind==='lane'?selection.ids:undefined,connecting:connecting||!!connectionDrag,scope,imageEditingId:imageEditingId||undefined,textEditingId:rich.id,textEditingBoxId:rich.boxId,connectionPreview:connectionDrag?.moved?{from:connectionDrag.id,fromSide:connectionDrag.side,point:connectionDrag.point,to:connectionDrag.target?.id,toSide:connectionDrag.target?.side}:undefined});
    const imageNode=model.nodes.find(node=>node.id===imageEditingId);imageTools.hidden=!imageNode;
    if(imageNode){const rect=surface.getBoundingClientRect(),outer=dialog.getBoundingClientRect();imageTools.style.left=`${Math.max(8,Math.min(outer.width-360,rect.left-outer.left+imageNode.x*zoom))}px`;imageTools.style.top=`${Math.max(8,Math.min(outer.height-55,rect.top-outer.top+imageNode.y*zoom-48))}px`;}
    rich.sync();
    const output=flowOutputBox(model);
    dialog.querySelector<HTMLElement>('.fde-dimensions')!.textContent=`${model.width} × ${model.height} · ${model.nodes.length} figuras · ${model.edges.length} conexiones${model.autoCrop?` · Salida: ${Math.round(output.width)} × ${Math.round(output.height)} px`:''}`;
    updateCommands();
    const outlineItems=outline.querySelector<HTMLElement>('.fde-outline-items')!;outlineItems.replaceChildren();
    outline.querySelector('summary')!.textContent=`Contenido (${model.nodes.length+model.edges.length+model.lanes.length})`;
    for(const [kind,items]of [['node',model.nodes],['edge',model.edges],['lane',model.lanes]]as const){
      for(const item of items){const entry=document.createElement('button');entry.type='button';entry.dataset.selectKind=kind;entry.dataset.selectId=item.id;entry.textContent=kind==='node'?(item as FlowNode).text||'Figura sin texto':kind==='lane'?(item as FlowLane).title||'Carril sin nombre':(item as FlowEdge).label||'Conexión';entry.title=entry.textContent;entry.setAttribute('aria-pressed',String(selection?.kind===kind&&selection.ids.includes(item.id)));outlineItems.append(entry);}
    }
  }
  function heading(title:string,subtitle?:string){
    const h=document.createElement('h3');h.textContent=title;inspector.append(h);
    if(subtitle){const p=document.createElement('p');p.className='fde-help';p.textContent=subtitle;inspector.append(p);}
  }
  function group(){const el=document.createElement('div');el.className='fde-field-grid';inspector.append(el);return el;}
  function field(parent:HTMLElement,labelText:string,key:string,value:string|number,kind='text',min?:number,max?:number){
    if(kind==='color'){
      const edge=key==='color'?selectedEdge():undefined;
      const from=edge?model.nodes.find(node=>node.id===edge.from):undefined,to=edge?model.nodes.find(node=>node.id===edge.to):undefined;
      return colorControls.field(parent,labelText,key,String(value),mixed(key)||(!!edge&&mixed('colorMode')),chosen=>mutate(()=>{if(selection)applyFlowSelectionPatch(model,selection,{[key]:chosen,...(selection.kind==='edge'?{colorMode:'solid'}:{})});else(model as unknown as Record<string,unknown>)[key]=chosen;}),{transparent:key==='background',gradient:edge&&from&&to?{active:edge.colorMode==='gradient',from:flowConnectorColor(from),to:flowConnectorColor(to),choose:()=>mutate(()=>applyFlowSelectionPatch(model,selection,{colorMode:'gradient'}))}:undefined});
    }
    const isMixed=mixed(key);
    const label=document.createElement('label');label.className='fde-field';label.textContent=labelText+(isMixed?' · Varios':'');
    const input=kind==='textarea'?document.createElement('textarea'):document.createElement('input');
    if(input instanceof HTMLInputElement)input.type=kind;else input.rows=3;
    input.dataset.prop=key;
    let displayValue=String(value);
    if(isMixed&&kind!=='range'){displayValue='';input.placeholder='Varios valores';}
    input.setAttribute('aria-label',labelText);
    if(input instanceof HTMLInputElement){if(min!==undefined)input.min=String(min);if(max!==undefined)input.max=String(max);if(kind==='number')input.step='1';}
    input.value=displayValue;
    if(kind==='text'||kind==='textarea')input.maxLength=4000;
    if(kind==='range'){const output=document.createElement('output');output.textContent=isMixed?'Varios':String(value);label.append(output);}
    label.append(input);parent.append(label);return input;
  }
  function selectField(parent:HTMLElement,labelText:string,key:string,value:string,choices:readonly (readonly [string,string])[]){
    const label=document.createElement('label');label.className='fde-field';label.textContent=labelText;const select=document.createElement('select');select.dataset.prop=key;select.setAttribute('aria-label',labelText);
    if(mixed(key)){const option=document.createElement('option');option.value='';option.textContent='Varios valores';option.disabled=true;select.append(option);}
    for(const [id,text]of choices){const option=document.createElement('option');option.value=id;option.textContent=text;select.append(option);}select.value=mixed(key)?'':value;label.append(select);parent.append(label);
  }
  function checkField(parent:HTMLElement,labelText:string,key:string,value:boolean){
    const label=document.createElement('label');label.className='fde-check';const input=document.createElement('input');input.type='checkbox';input.dataset.prop=key;input.checked=value;
    const alias=key==='emptyFill'?'fill':key==='emptyStroke'?'stroke':null;
    input.indeterminate=alias?flowSelectionItems(model,selection).some(item=>['transparent','none'].includes((item as unknown as Record<string,string>)[alias])!==value):mixed(key);
    if(input.indeterminate)input.setAttribute('aria-description','Valores distintos en la selección');
    label.append(input,document.createTextNode(labelText));parent.append(label);
  }
  function renderInspector(){
    const adjustmentsOpen=inspector.querySelector<HTMLDetailsElement>('.fde-image-adjustments')?.open;
    colorControls.close();inspector.replaceChildren();const node=selectedNode(),edge=selectedEdge(),lane=selectedLane(),count=selection?.ids.length||0;
    inspector.dataset.selectionKind=selection?.kind||'canvas';inspector.dataset.selectionCount=String(count);
    if(node){
      heading(count>1?`Figuras (${count})`:'Figura',count>1?'Edita una propiedad para sobrescribirla en todas. Los demás valores se conservan.':flowNodeTypes.find(n=>n.type===node.type)?.label);
      if(flowSelectionItems(model,selection).every(item=>(item as FlowNode).type==='image')){
        const images=flowSelectionItems(model,selection)as FlowNode[];
        flowImageControls(inspector,images,{editing:imageEditingId===node.id,message:importMessages.get(node.id),toggle:()=>{commitFields();if(imageEditingId===node.id){imageEditingId=null;render();}else enterImage(node.id);},change:patch=>mutate(()=>patchImages(patch)),import:(id,input)=>void importImage(id,input),frameControls:parent=>{const controls=document.createElement('div');controls.className='fde-field-grid';parent.append(controls);field(controls,'Borde','stroke',node.stroke,'color');field(controls,'Grosor del borde','strokeWidth',node.strokeWidth,'number',0,12);checkField(parent,'Sin borde','emptyStroke',['transparent','none'].includes(node.stroke));if(images.every(image=>image.image?.mask==='process'))field(parent,'Redondeado','radius',node.radius,'range',0,Math.min(node.width,node.height)/2);}});
        const adjustments=inspector.querySelector<HTMLDetailsElement>('.fde-image-adjustments');if(adjustments&&adjustmentsOpen)adjustments.open=true;
      }
      const imagesOnly=flowSelectionItems(model,selection).every(item=>(item as FlowNode).type==='image');
      if(!imagesOnly){
        colorControls.combinations(inspector,['fill','stroke','textColor'].some(mixed)?null:node,colors=>mutate(()=>applyFlowSelectionPatch(model,selection,colors)));
        const hint=document.createElement('p');hint.className='fde-help';hint.textContent='Haz doble clic sobre la figura para editar su texto con las herramientas flotantes.';inspector.append(hint);
        const colors=group();field(colors,'Relleno','fill',node.fill,'color');field(colors,'Borde','stroke',node.stroke,'color');field(colors,'Grosor del borde','strokeWidth',node.strokeWidth,'number',0,12);
        checkField(inspector,'Sin relleno','emptyFill',['transparent','none'].includes(node.fill));checkField(inspector,'Sin borde','emptyStroke',['transparent','none'].includes(node.stroke));
        if(flowSelectionItems(model,selection).every(item=>['process','text'].includes((item as FlowNode).type)))field(inspector,'Redondeado','radius',node.radius,'range',0,Math.min(node.width,node.height)/2);
      }
      if(count===1){
        const header=document.createElement('div');header.className='fde-label-heading';header.innerHTML='<span>Cajas de texto</span><button type="button" data-action="add-text-box" aria-label="Agregar caja de texto" title="Agregar caja de texto">+</button>';header.querySelector('button')!.disabled=(node.textBoxes?.length||0)>=19;inspector.append(header);
        const list=document.createElement('div');list.className='fde-text-box-list';
        for(const [index,boxId]of ['primary',...(node.textBoxes||[]).map(box=>box.id)].entries()){
          const row=document.createElement('div'),edit=document.createElement('button');edit.type='button';edit.dataset.action='edit-text-box';edit.dataset.textBoxId=boxId;edit.textContent=flowTextNode(node,boxId)?.text||`Texto ${index+1}`;edit.title=`Editar caja de texto ${index+1}`;row.append(edit);
          if(boxId!=='primary'){const remove=document.createElement('button');remove.type='button';remove.dataset.action='remove-text-box';remove.dataset.textBoxId=boxId;remove.setAttribute('aria-label',`Eliminar caja de texto ${index+1}`);remove.innerHTML=icon('delete');row.append(remove);}list.append(row);
        }inspector.append(list);
      }
      const bounds=group();field(bounds,'Posición X','x',node.x,'number',0,model.width-node.width);field(bounds,'Posición Y','y',node.y,'number',0,model.height-node.height);field(bounds,'Ancho','width',node.width,'number',40,model.width);field(bounds,'Alto','height',node.height,'number',32,model.height);
      const note=document.createElement('p');note.className='fde-help';note.textContent='Arrastra desde un punto del borde para conectar. El switch Conectar fija el modo para conexiones consecutivas. Arrastra la esquina para redimensionar.';inspector.append(note);
    }else if(edge){
      heading(count>1?`Conexiones (${count})`:'Conexión',count>1?'Los cambios se aplican a todos los conectores seleccionados.':undefined);
      const labelsHead=document.createElement('div');labelsHead.className='fde-label-heading';labelsHead.innerHTML='<span>Etiquetas</span><button type="button" data-action="add-label" aria-label="Agregar otra etiqueta" title="Agregar otra etiqueta">+</button>';inspector.append(labelsHead);
      labelsHead.querySelector('button')!.disabled=count>1||flowEdgeLabels(edge).length>=20;
      const scale=field(inspector,'Escala de etiquetas (%)','labelScale',edge.labelScale??100,'range',50,300) as HTMLInputElement;scale.step='5';scale.parentElement!.classList.add('fde-label-scale');scale.parentElement!.firstChild!.remove();const scaleOutput=scale.parentElement!.querySelector('output')!;if(!mixed('labelScale'))scaleOutput.textContent=`${scale.value} %`;
      for(const [index,label]of (count===1?flowEdgeLabels(edge):flowEdgeLabels(edge).slice(0,1)).entries()){
        const row=document.createElement('div');row.className='fde-label-row';row.innerHTML='<span class="material-symbols-outlined fde-label-icon" aria-hidden="true">label</span>';inspector.append(row);const input=field(row,index?`Etiqueta ${index+1}`:'Etiqueta',index?`labels.${label.id}`:'label',label.text);input.parentElement!.firstChild!.remove();
        if(index&&count===1){const remove=document.createElement('button');remove.type='button';remove.textContent='−';remove.dataset.action='remove-label';remove.dataset.labelId=label.id;remove.setAttribute('aria-label',`Quitar etiqueta ${index+1}`);row.append(remove);}
      }
      selectField(inspector,'Recorrido','route',edge.route,[['orthogonal','Ángulos rectos'],['straight','Línea recta'],['curve','Curva']]);
      selectField(inspector,'Estilo de línea','dash',edge.dash,[['solid','Continua'],['dashed','Guiones'],['dotted','Puntos']]);
      field(inspector,'Color','color',edge.color,'color');field(inspector,'Grosor','width',edge.width,'range',1,24);
      const ends=[['startArrow','startMarker','Inicio',edge.startArrow,edge.startMarker],['endArrow','endMarker','Final',edge.endArrow,edge.endMarker]]as const;
      for(const [enabled,key,label,checked,value]of ends){const row=document.createElement('div');row.className='fde-marker-row';inspector.append(row);checkField(row,label,enabled,checked);selectField(row,`Símbolo ${label.toLowerCase()}`,key,value,[['arrow','Flecha'],['circle','Círculo'],['square','Cuadrado'],['gum','Chicle']]);}
      if(flowSelectionItems(model,selection).some(item=>{const edge=item as FlowEdge;return edge.startArrow&&edge.startMarker==='gum'||edge.endArrow&&edge.endMarker==='gum';})){
        field(inspector,'Base del chicle (%)','gumBase',edge.gumBase??75,'range',5,95);field(inspector,'Alcance del chicle (px)','gumReach',edge.gumReach??180,'range',10,1000);
        const note=document.createElement('p');note.className='fde-help';note.textContent='La base es proporcional al lado de la figura. El alcance se adapta al espacio disponible y a los giros para evitar pliegues.';inspector.append(note);
      }
      if(edge.route==='orthogonal'){const reset=document.createElement('button');reset.type='button';reset.dataset.action='reset-bend';reset.textContent='Restablecer doblez automático';reset.className='fde-reset-bend';reset.disabled=flowSelectionItems(model,selection).every(item=>!(item as FlowEdge).bend&&!(item as FlowEdge).waypoints?.length);inspector.append(reset);}
      const sides=[['auto','Automático'],['top','Superior'],['right','Derecho'],['bottom','Inferior'],['left','Izquierdo']]as const;
      selectField(inspector,'Salida del origen','fromSide',edge.fromSide,sides);selectField(inspector,'Entrada al destino','toSide',edge.toSide,sides);
      if(count===1){const names=document.createElement('p');names.className='fde-help';names.textContent=`${model.nodes.find(n=>n.id===edge.from)?.text||'Origen'} → ${model.nodes.find(n=>n.id===edge.to)?.text||'Destino'}`;inspector.append(names);}
    }else if(lane){
      heading(count>1?`Carriles (${count})`:'Carril',count>1?'Edita los carriles seleccionados en conjunto.':'Los carriles organizan equipos, fases o responsables.');field(inspector,'Nombre del carril','title',lane.title);
      colorControls.laneStyles(inspector,mixed('style')?null:lane.style,style=>mutate(()=>applyFlowSelectionPatch(model,selection,{style})));
      colorControls.combinations(inspector,['fill','stroke','textColor'].some(mixed)?null:lane,colors=>mutate(()=>applyFlowSelectionPatch(model,selection,colors)),'lane');
      const colors=group();field(colors,'Fondo','fill',lane.fill,'color');field(colors,'Borde','stroke',lane.stroke,'color');field(colors,'Color del texto','textColor',lane.textColor,'color');
      selectField(inspector,'Posición del texto','textPosition',lane.textPosition,[['top','Arriba'],['bottom','Abajo'],['left','Izquierda'],['right','Derecha']]);
      selectField(inspector,'Tipografía institucional','fontFamily',lane.fontFamily,flowFonts);field(inspector,'Tamaño del texto','fontSize',lane.fontSize,'range',8,32);
      const bounds=group();field(bounds,'Posición X','x',lane.x,'number',0,model.width);field(bounds,'Posición Y','y',lane.y,'number',0,model.height);field(bounds,'Ancho','width',lane.width,'number',80,model.width);field(bounds,'Alto','height',lane.height,'number',80,model.height);
      const note=document.createElement('p');note.className='fde-help';note.textContent='Arrastra el carril para moverlo o sus ocho tiradores para redimensionarlo. Las figuras conservan sus posiciones.';inspector.append(note);
    }else{
      heading('Lienzo','Un espacio independiente para diseñar tu diagrama.');field(inspector,'Título del diagrama','title',model.title);
      const dimensions=group();dimensions.classList.add('fde-canvas-dimensions');field(dimensions,'Ancho del lienzo (px)','width',model.width,'range',850,1920);field(dimensions,'Alto del lienzo (px)','height',model.height,'range',720,3000);
      field(inspector,'Fondo del lienzo','background',model.background,'color');checkField(inspector,'Mostrar cuadrícula','grid',model.grid);
      const tip=document.createElement('p');tip.className='fde-help';tip.textContent='Arrastra las figuras al lienzo, edita sus textos y conecta sus puertos. La cuadrícula es una guía y no se exporta.';inspector.append(tip);
    }
  }
  function render(){renderSurface();renderInspector();}
  function setSelection(next:Selection){commitFields();selection=next;render();}
  function applyField(input:HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement){
    const key=input.dataset.prop!;
    const value=input instanceof HTMLInputElement&&input.type==='checkbox'?input.checked:input instanceof HTMLInputElement&&['number','range'].includes(input.type)?Number(input.value):input.value;
    if(input instanceof HTMLInputElement&&input.type==='number'&&!input.value.trim())return;
    if(input instanceof HTMLSelectElement&&!input.value)return;
    if(typeof value==='number'&&!Number.isFinite(value))return;
    const patch=key==='emptyFill'?{fill:value?'transparent':'#dfd9e8'}:key==='emptyStroke'?{stroke:value?'transparent':'#5d428c'}:{[key]:value};
    if(key.startsWith('image.')&&selection?.kind==='node'){
      const path=key.split('.');
      for(const node of flowSelectionItems(model,selection)as FlowNode[]){if(node.type!=='image')continue;const image=node.image!;node.image=normalizeFlowImage({...image,...(path[1]==='adjustments'?{adjustments:{...image.adjustments,[path[2]]:value}}:{[path[1]]:value})});}
    }
    else if(key.startsWith('labels.')&&selection?.kind==='edge'){
      const id=key.slice(7);for(const edge of flowSelectionItems(model,selection)as FlowEdge[]){const label=edge.labels?.find(label=>label.id===id);if(label)label.text=String(value).slice(0,200);}
    }
    else if(selection){applyFlowSelectionPatch(model,selection,{...patch,...(['fromSide','toSide','route'].includes(key)?{waypoints:[],bend:null}:{})});if(selection.kind==='node'&&['width','height','fontSize'].includes(key))for(const node of flowSelectionItems(model,selection)as FlowNode[]){if(node.type==='text'){const required=flowFreeTextHeight(node);model.height=Math.min(3000,Math.max(model.height,node.y+required));node.height=Math.min(required,model.height-node.y);}}}
    else{Object.assign(model,patch);if(key==='width')model.width=flowClamp(Number(value),850,1920);if(key==='height')model.height=flowClamp(Number(value),720,3000);model=normalizeFlowModel(model);}
    if(!selection&&['width','height'].includes(key)&&autoFit)fit();else renderSurface();
  }
  function commitFields(){
    rich.finish();
    inspector.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('[data-prop]').forEach(input=>{
      const before=fieldStarts.get(input);if(before===undefined)return;
      fieldStarts.delete(input);applyField(input);record(before);
    });
  }
  inspector.addEventListener('input',event=>{
    const input=event.target;if(!(input instanceof HTMLInputElement||input instanceof HTMLTextAreaElement||input instanceof HTMLSelectElement)||!input.dataset.prop)return;
    if(!fieldStarts.has(input))fieldStarts.set(input,snapshot());
    applyField(input);
    if(input instanceof HTMLInputElement&&input.type==='range'){const output=input.parentElement?.querySelector('output');if(output)output.textContent=input.value+(input.dataset.prop==='labelScale'?' %':'');}
  });
  inspector.addEventListener('change',event=>{
    const input=event.target;if(!(input instanceof HTMLInputElement||input instanceof HTMLTextAreaElement||input instanceof HTMLSelectElement)||!input.dataset.prop)return;
    const before=fieldStarts.get(input)||snapshot();fieldStarts.delete(input);applyField(input);record(before);renderInspector();
  });
  function point(event:{clientX:number;clientY:number}){const rect=surface.getBoundingClientRect();return{x:(event.clientX-rect.left)/zoom,y:(event.clientY-rect.top)/zoom};}
  function disconnectAtPort(control:SVGElement){
    const id=control.dataset.flowDisconnect,nodeId=control.dataset.flowDisconnectNode;
    if(!id||!nodeId||!model.nodes.some(node=>node.id===nodeId))return;
    if(selection?.kind!=='node'||!selection.ids.includes(nodeId))setSelection({kind:'node',ids:[nodeId]});
    else mutate(()=>{model.edges=model.edges.filter(edge=>edge.id!==id);});
    viewport.focus({preventScroll:true});
  }
  function connectNode(id:string,side:Side='auto'){
    commitFields();
    if(!origin){origin={id,side};selection={kind:'node',ids:[id]};render();return;}
    if(origin.id===id){status.textContent='Elige una figura distinta como destino.';return;}
    const from=origin;origin=null;mutate(()=>{const edge=addFlowEdge(model,from.id,id,{fromSide:from.side,toSide:side});if(edge)selection={kind:'edge',ids:[edge.id]};});
  }
  function connectionTarget(event:{clientX:number;clientY:number}){
    // Pointer capture retargets events to the viewport: hit-test the real figure.
    const element=document.elementFromPoint(event.clientX,event.clientY);
    if(!element||!surface.contains(element))return null;
    const port=element.closest<SVGElement>('[data-flow-port]'),node=element.closest<SVGElement>('[data-flow-node]');
    const id=port?.dataset.flowPort||node?.dataset.flowNode;
    return id&&id!==connectionDrag?.id&&model.nodes.some(node=>node.id===id)?{id,side:port?.dataset.side as Side||'auto'}:null;
  }
  function moveConnection(event:PointerEvent){
    if(!connectionDrag||event.pointerId!==connectionDrag.pointer)return;
    connectionDrag.moved ||= Math.hypot(event.clientX-connectionDrag.clientX,event.clientY-connectionDrag.clientY)>6;
    if(!connectionDrag.moved)return;
    connectionDrag.point=point(event);connectionDrag.target=connectionTarget(event);renderSurface();
  }
  function cancelConnection(){
    const current=connectionDrag;connectionDrag=null;
    if(current&&viewport.hasPointerCapture(current.pointer))viewport.releasePointerCapture(current.pointer);
  }
  function endConnection(event:PointerEvent,cancelled=false){
    if(!connectionDrag||connectionDrag.pointer!==event.pointerId)return;
    if(!cancelled)moveConnection(event);
    const finished=connectionDrag;cancelConnection();
    if(cancelled){renderSurface();return;}
    if(!finished.moved){if(connecting)connectNode(finished.id,finished.side);else{origin=null;render();}return;}
    if(!finished.target){renderSurface();return;}
    origin=null;lastTap=null;
    mutate(()=>{const edge=addFlowEdge(model,finished.id,finished.target!.id,{fromSide:finished.side,toSide:finished.target!.side});if(edge)selection={kind:'edge',ids:[edge.id]};});
  }
  function insertNode(type:FlowNode['type'],x?:number,y?:number){
    const fallback={x:(viewport.scrollLeft+viewport.clientWidth/2-28)/zoom-80,y:(viewport.scrollTop+viewport.clientHeight/2-28)/zoom-40};
    const previous=selectedNode();
    if(previous){fallback.x=previous.x+previous.width+60;fallback.y=previous.y;if(fallback.x+180>model.width-24){fallback.x=48;fallback.y=previous.y+previous.height+60;}}
    mutate(()=>{const node=addFlowNode(model,type,Math.round(x??fallback.x),Math.round(y??fallback.y)),position=flowSnapPosition(node,node.x,node.y,model);node.x=flowClamp(position.x,0,model.width-node.width);node.y=flowClamp(position.y,0,model.height-node.height);selection={kind:'node',ids:[node.id]};});
  }
  viewport.addEventListener('dragover',event=>{if(event.dataTransfer?.types.includes('application/x-lms-flow-type')){event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect='copy';}});
  viewport.addEventListener('drop',event=>{event.preventDefault();event.stopPropagation();const type=event.dataTransfer?.getData('application/x-lms-flow-type');if(!flowNodeTypes.some(n=>n.type===type))return;const p=point(event);insertNode(type as FlowNode['type'],p.x-80,p.y-40);});
  viewport.addEventListener('pointerdown',event=>{
    if(event.button!==0||connectionDrag)return;const target=event.target as Element;colorControls.close();
    rich.finish();
    const disconnect=target.closest<SVGElement>('[data-flow-disconnect]');
    if(disconnect){event.preventDefault();disconnectAtPort(disconnect);return;}
    const labelEl=target.closest<SVGElement>('[data-flow-label]');
    if(labelEl){const edge=model.edges.find(edge=>edge.id===labelEl.dataset.flowLabel);if(!edge)return;event.preventDefault();commitFields();selection={kind:'edge',ids:[edge.id]};const p=point(event);drag={pointer:event.pointerId,kind:'label',id:edge.id,labelId:labelEl.dataset.labelId,x:p.x,y:p.y,startX:0,startY:0,width:0,height:0,before:snapshot(),moved:false,items:[]};viewport.setPointerCapture(event.pointerId);render();return;}
    if(connecting&&!target.closest('[data-flow-node],[data-flow-port],[data-flow-edge],[data-flow-lane],[data-flow-lane-resize],[data-flow-bend]')){
      event.preventDefault();const now=performance.now();
      if(lastBlankTap&&now-lastBlankTap.time<450&&Math.hypot(event.clientX-lastBlankTap.x,event.clientY-lastBlankTap.y)<12){connecting=false;origin=null;lastBlankTap=null;render();}
      else lastBlankTap={x:event.clientX,y:event.clientY,time:now};return;
    }
    lastBlankTap=null;if(!target.closest('svg'))return;
    const textResize=target.closest<SVGElement>('[data-flow-text-resize]'),caption=target.closest<SVGElement>('[data-flow-image-text]');
    const imageCrop=target.closest<SVGElement>('[data-flow-image-crop]'),imagePan=target.closest<SVGElement>('[data-flow-image-pan]'),imageScale=target.closest<SVGElement>('[data-flow-image-scale]');
    if((textResize||caption||imageCrop||imagePan||imageScale)&&!event.shiftKey&&!connecting){
      const node=model.nodes.find(n=>n.id===(textResize?.dataset.flowTextResize||caption?.dataset.flowImageText||imageCrop?.dataset.flowImageCrop||imagePan?.dataset.flowImagePan||imageScale?.dataset.flowImageScale));if(!node?.image)return;
      event.preventDefault();commitFields();selection={kind:'node',ids:[node.id]};const p=point(event);drag={pointer:event.pointerId,kind:textResize?'text-resize':caption?'text-move':imageCrop?'image-crop':imageScale?'image-scale':'image-pan',id:node.id,x:p.x,y:p.y,startX:node.x,startY:node.y,width:node.width,height:node.height,before:snapshot(),moved:false,items:[],image:normalizeFlowImage(node.image),textBox:node.textLayout?flowNodeTextBox(node):undefined,handle:(textResize?.dataset.handle||imageCrop?.dataset.handle||'se') as FlowResizeHandle};viewport.setPointerCapture(event.pointerId);renderSurface();return;
    }
    const nodeEl=target.closest<SVGElement>('[data-flow-node]'),resizeEl=target.closest<SVGElement>('[data-flow-resize]'),port=target.closest<SVGElement>('[data-flow-port]'),edgeEl=target.closest<SVGElement>('[data-flow-edge]'),laneEl=target.closest<SVGElement>('[data-flow-lane]'),laneResize=target.closest<SVGElement>('[data-flow-lane-resize]'),bendEl=target.closest<SVGElement>('[data-flow-bend]');
    if((connecting||port)&&!event.shiftKey&&!resizeEl&&!laneResize&&!bendEl&&(port||nodeEl)){
      event.preventDefault();commitFields();const id=port?.dataset.flowPort||nodeEl!.dataset.flowNode!;
      connectionDrag={pointer:event.pointerId,id,side:port?.dataset.side as Side||'auto',clientX:event.clientX,clientY:event.clientY,point:point(event),moved:false,target:null};
      if(!connecting)origin=null;selection={kind:'node',ids:[id]};viewport.setPointerCapture(event.pointerId);render();return;
    }
    const p=point(event);let item:FlowNode|FlowLane|undefined,kind:Drag['kind']='move';
    if(bendEl){
      const edge=model.edges.find(edge=>edge.id===bendEl.dataset.flowBend);if(!edge)return;event.preventDefault();commitFields();selection={kind:'edge',ids:[edge.id]};
      drag={pointer:event.pointerId,kind:'bend',id:edge.id,x:p.x,y:p.y,startX:Number(bendEl.dataset.position)||0,startY:0,width:0,height:0,before:snapshot(),moved:false,items:[],axis:bendEl.dataset.axis as 'x'|'y',run:Number(bendEl.dataset.run),edge:JSON.parse(JSON.stringify(edge)) as FlowEdge};
      viewport.setPointerCapture(event.pointerId);render();return;
    }
    if(laneResize){item=model.lanes.find(lane=>lane.id===laneResize.dataset.flowLaneResize);kind='lane-resize';}
    else if(resizeEl){item=model.nodes.find(n=>n.id===resizeEl.dataset.flowResize);kind='resize';}
    else if(nodeEl)item=model.nodes.find(n=>n.id===nodeEl.dataset.flowNode);
    else if(edgeEl){event.preventDefault();setSelection(selectFlowItem(selection,'edge',edgeEl.dataset.flowEdge!,event.shiftKey));return;}
    else if(laneEl){item=model.lanes.find(l=>l.id===laneEl.dataset.flowLane);kind='lane';}
    if(!item){if(!connecting&&!event.shiftKey)setSelection(null);return;}
    event.preventDefault();commitFields();const selectionKind:FlowSelectionKind=kind==='lane'||kind==='lane-resize'?'lane':'node';
    if(event.shiftKey&&kind!=='resize'&&kind!=='lane-resize'){selection=selectFlowItem(selection,selectionKind,item.id,true);render();return;}
    if(selection?.kind!==selectionKind||!selection.ids.includes(item.id))selection={kind:selectionKind,ids:[item.id]};
    const items=flowSelectionItems(model,selection).map(value=>{const entry=value as FlowNode|FlowLane;return{id:entry.id,x:entry.x,y:entry.y,width:entry.width,height:entry.height};});
    drag={pointer:event.pointerId,kind,id:item.id,x:p.x,y:p.y,startX:item.x,startY:item.y,width:item.width,height:item.height,before:snapshot(),moved:false,items,textBoxId:target.closest<SVGElement>('[data-text-box-id]')?.dataset.textBoxId,handle:laneResize?.dataset.handle as FlowResizeHandle||'se',bends:kind==='move'&&model.snapMode==='grid'?model.edges.filter(edge=>edge.bend&&items.some(item=>item.id===edge.from)).map(edge=>({id:edge.id,...edge.bend!})):[],routing:kind==='move'&&model.snapMode==='grid'?model.edges.filter(edge=>edge.waypoints?.length&&items.some(item=>item.id===edge.from)).map(edge=>({id:edge.id,points:edge.waypoints!.map(p=>({...p}))})):[]};
    viewport.setPointerCapture(event.pointerId);render();
  });
  viewport.addEventListener('pointermove',event=>{
    if(connectionDrag?.pointer===event.pointerId){event.preventDefault();moveConnection(event);return;}
    if(!drag||drag.pointer!==event.pointerId)return;event.preventDefault();const p=point(event),rawX=p.x-drag.x,rawY=p.y-drag.y;
    if(['image-pan','image-scale','image-crop','text-move','text-resize'].includes(drag.kind)){
      const node=model.nodes.find(n=>n.id===drag!.id);if(!node?.image||!drag.image)return;
      if(Math.abs(rawX)+Math.abs(rawY)>2)drag.moved=true;if(!drag.moved)return;
      if(drag.kind==='image-crop'){const start={x:drag.startX,y:drag.startY,width:drag.width,height:drag.height},box=resizeFlowBox(start,drag.handle!,rawX,rawY,{...model,snapMode:'free'},40,32);node.image=flowReframeImage(drag.image,start,box);Object.assign(node,box);node.radius=Math.min(node.radius,box.width/2,box.height/2);}
      else if(drag.kind==='text-move'||drag.kind==='text-resize'){if(drag.textBox)node.textLayout=moveFlowNodeText(node,drag.textBox,drag.kind==='text-move'?'move':drag.handle!,rawX,rawY);else node.image=normalizeFlowImage({...drag.image,textLayout:moveFlowImageText(node,drag.image.textLayout,drag.kind==='text-move'?'move':drag.handle!,rawX,rawY)});}
      else{const cx=node.x+node.width/2+drag.image.offsetX*node.width,cy=node.y+node.height/2+drag.image.offsetY*node.height;
        node.image=normalizeFlowImage({...drag.image,...(drag.kind==='image-pan'?{offsetX:drag.image.offsetX+rawX/node.width,offsetY:drag.image.offsetY+rawY/node.height}:{zoom:drag.image.zoom*Math.max(.1,Math.hypot(p.x-cx,p.y-cy)/Math.max(1,Math.hypot(drag.x-cx,drag.y-cy)))})});}
      renderSurface();return;
    }
    if(drag.kind==='label'){
      const edge=model.edges.find(edge=>edge.id===drag!.id),from=model.nodes.find(node=>node.id===edge?.from),to=model.nodes.find(node=>node.id===edge?.to);if(!edge||!from||!to)return;
      if(Math.abs(rawX)+Math.abs(rawY)>2)drag.moved=true;
      if(drag.moved){const position=flowLabelPosition(flowEdgeGeometry(edge,from,to).samples,p);if(drag.labelId==='primary')edge.labelPosition=position;else{const label=edge.labels?.find(label=>label.id===drag!.labelId);if(label)label.position=position;}renderSurface();}return;
    }
    if(drag.kind==='bend'){
      const edge=model.edges.find(edge=>edge.id===drag!.id);if(!edge)return;
      if(Math.abs(rawX)+Math.abs(rawY)>2)drag.moved=true;
      if(drag.moved){const position=flowClamp(flowSnap(drag.startX+(drag.axis==='x'?rawX:rawY),model),0,drag.axis==='x'?model.width:model.height),from=model.nodes.find(node=>node.id===edge.from)!,to=model.nodes.find(node=>node.id===edge.to)!;edge.waypoints=moveFlowEdgeRun(drag.edge!,from,to,drag.run!,position);edge.bend=null;renderSurface();}return;
    }
    const position=drag.kind==='move'?flowSnapPosition({x:drag.startX,y:drag.startY,width:drag.width,height:drag.height},drag.startX+rawX,drag.startY+rawY,model):{x:flowSnap(drag.startX+rawX,model),y:flowSnap(drag.startY+rawY,model)};
    const dx=position.x-drag.startX,dy=position.y-drag.startY;
    const items=drag.kind==='lane'||drag.kind==='lane-resize'?model.lanes:model.nodes;
    if(Math.abs(rawX)+Math.abs(rawY)>2)drag.moved=true;if(!drag.moved)return;
    const boundedX=flowClamp(dx,-Math.min(...drag.items.map(item=>item.x)),Math.min(...drag.items.map(item=>model.width-item.x-item.width)));
    const boundedY=flowClamp(dy,-Math.min(...drag.items.map(item=>item.y)),Math.min(...drag.items.map(item=>model.height-item.y-item.height)));
    for(const start of drag.items){const item=items.find(value=>value.id===start.id);if(!item)continue;
      if(drag.kind==='resize'||drag.kind==='lane-resize'){
        Object.assign(item,drag.kind==='resize'&&'type'in item&&item.type==='circle'&&!event.shiftKey?resizeFlowBoxProportionally(start,drag.handle||'se',rawX,rawY,model):resizeFlowBox(start,drag.handle||'se',rawX,rawY,model,drag.kind==='lane-resize'?80:40,drag.kind==='lane-resize'?80:32));
        if('radius'in item)item.radius=Math.min(item.radius,item.width/2,item.height/2);
        if('type'in item&&item.type==='text'){const required=flowFreeTextHeight(item);model.height=Math.min(3000,Math.max(model.height,item.y+required));item.height=Math.min(required,model.height-item.y);}
      }
      else{item.x=start.x+boundedX;item.y=start.y+boundedY;}
    }
    for(const bend of drag.bends||[]){const edge=model.edges.find(edge=>edge.id===bend.id);if(edge)edge.bend={axis:bend.axis,position:flowClamp(flowSnap(bend.position+(bend.axis==='x'?boundedX:boundedY),model),0,bend.axis==='x'?model.width:model.height)};}
    for(const route of drag.routing||[]){const edge=model.edges.find(edge=>edge.id===route.id);if(edge)edge.waypoints=route.points.map(p=>({x:flowClamp(p.x+boundedX,0,model.width),y:flowClamp(p.y+boundedY,0,model.height)}));}
    renderSurface();
  });
  function endDrag(event:PointerEvent){
    if(!drag||event.pointerId!==drag.pointer)return;const finished=drag;drag=null;
    if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
    record(finished.before);renderInspector();
    if((finished.kind==='move'||finished.kind==='text-move')&&!finished.moved){const now=performance.now(),tapId=(finished.kind==='text-move'?'caption:':'')+finished.id+':'+(finished.textBoxId||'primary');if(lastTap?.id===tapId&&now-lastTap.time<420){if(finished.kind==='text-move'||finished.textBoxId)enterImageText(finished.id,finished.textBoxId);else if(model.nodes.find(n=>n.id===finished.id)?.type==='image')enterImage(finished.id);else enterImageText(finished.id);lastTap=null;}else lastTap={id:tapId,time:now};}
  }
  viewport.addEventListener('pointerup',event=>{if(connectionDrag?.pointer===event.pointerId)endConnection(event);else endDrag(event);});
  viewport.addEventListener('pointercancel',event=>{if(connectionDrag?.pointer===event.pointerId)endConnection(event,true);else endDrag(event);});
  viewport.addEventListener('lostpointercapture',event=>{if(connectionDrag?.pointer===event.pointerId)endConnection(event,true);});
  function previewDisconnect(target:EventTarget|null){
    const id=target instanceof Element?target.closest<SVGElement>('[data-flow-disconnect]')?.dataset.flowDisconnect:undefined;
    for(const edge of surface.querySelectorAll<SVGElement>('[data-flow-edge]'))edge.classList.toggle('is-delete-preview',edge.dataset.flowEdge===id);
  }
  viewport.addEventListener('pointerover',event=>previewDisconnect(event.target));
  viewport.addEventListener('pointerout',event=>previewDisconnect(event.relatedTarget));
  viewport.addEventListener('pointerleave',()=>previewDisconnect(null));
  viewport.addEventListener('focusin',event=>previewDisconnect(event.target));
  viewport.addEventListener('focusout',event=>previewDisconnect(event.relatedTarget));
  viewport.addEventListener('click',event=>{if((event.target as Element).closest('[data-flow-image-text] a,[data-flow-node-text] a'))event.preventDefault();});
    viewport.addEventListener('dblclick',event=>{const target=event.target as Element,id=target.closest<SVGElement>('[data-flow-node]')?.dataset.flowNode;if(connecting&&!target.closest('[data-flow-node],[data-flow-port],[data-flow-edge],[data-flow-lane],[data-flow-lane-resize],[data-flow-bend]')){event.preventDefault();connecting=false;origin=null;lastBlankTap=null;render();return;}if(id&&!connecting&&!target.closest('[data-flow-port],[data-flow-resize]')){const boxId=target.closest<SVGElement>('[data-text-box-id]')?.dataset.textBoxId;if(boxId)enterImageText(id,boxId);else if(model.nodes.find(n=>n.id===id)?.type==='image')enterImage(id);else enterImageText(id);}});
  function removeSelection(){if(!selection)return;const current=selection;mutate(()=>{removeFlowSelection(model,current);selection=null;if(current.kind==='node'&&origin&&current.ids.includes(origin.id))origin=null;});}
  function duplicateSelection(){if(selection)mutate(()=>{selection=duplicateFlowSelection(model,selection);});}
  function undo(redo=false){commitFields();const source=redo?future:past,destination=redo?past:future;if(!source.length)return;destination.push(snapshot());model=normalizeFlowModel(JSON.parse(source.pop()!));selection=null;origin=null;render();}
  function setZoom(value:number){zoom=Math.round(flowClamp(value,.01,2)*100)/100;zoomInput.min='1';zoomInput.value=String(Math.round(zoom*100));zoomOutput.textContent=`${Math.round(zoom*100)} %`;renderSurface();}
  function fit(){autoFit=true;const css=getComputedStyle(viewport),horizontal=parseFloat(css.paddingLeft)+parseFloat(css.paddingRight),vertical=parseFloat(css.paddingTop)+parseFloat(css.paddingBottom);setZoom(Math.floor(Math.min((viewport.clientWidth-horizontal)/model.width,(viewport.clientHeight-vertical)/model.height,1)*100)/100);viewport.scrollLeft=0;viewport.scrollTop=0;}
  zoomInput.addEventListener('input',()=>{autoFit=false;setZoom(Number(zoomInput.value)/100);});
  const viewportResize=new ResizeObserver(()=>{if(closed)return;if(autoFit)fit();else rich.sync();});viewportResize.observe(viewport);
  function cleanClose(){if(closed)return;cancelConnection();rich.dispose();closed=true;viewportResize.disconnect();for(const controller of imports.values())controller.abort();imports.clear();clearPaletteDrag();colorControls.dispose();dialog.close();dialog.remove();if(activeEditor===dialog)activeEditor=null;previousFocus?.focus();}
  function cancel(){
    commitFields();
    if(snapshot()===initialJSON){cleanClose();return;}
    const existing=dialog.querySelector<HTMLButtonElement>('[data-flow-keep]');
    if(existing){existing.focus();return;}
    const shell=dialog.querySelector<HTMLElement>('.fde-shell')!;
    const prompt=document.createElement('div');prompt.className='fde-discard';
    prompt.setAttribute('role','alertdialog');prompt.setAttribute('aria-modal','true');prompt.setAttribute('aria-label','Descartar cambios del diagrama');
    prompt.innerHTML='<div class="fde-discard-card"><h3>¿Descartar los cambios?</h3><p>El diseño guardado en la página no se modificará.</p><div><button type="button" data-flow-keep>Seguir editando</button><button type="button" class="fde-primary" data-flow-discard>Descartar cambios</button></div></div>';
    shell.inert=true;dialog.append(prompt);
    prompt.querySelector<HTMLButtonElement>('[data-flow-keep]')!.onclick=()=>{shell.inert=false;prompt.remove();button('cancel').focus();};
    prompt.querySelector<HTMLButtonElement>('[data-flow-discard]')!.onclick=cleanClose;
    prompt.querySelector<HTMLButtonElement>('[data-flow-keep]')!.focus();
  }
  dialog.addEventListener('cancel',event=>{event.preventDefault();cancel();});
  dialog.addEventListener('click',event=>{
    const target=event.target as Element,shape=target.closest<HTMLElement>('[data-shape]');
    if(shape){if(performance.now()<suppressPaletteClickUntil){event.preventDefault();return;}insertNode(shape.dataset.shape as FlowNode['type']);return;}
    const outlineItem=target.closest<HTMLElement>('[data-select-kind]');
    if(outlineItem){const id=outlineItem.dataset.selectId!,kind=outlineItem.dataset.selectKind as FlowSelectionKind;if(connecting&&kind==='node'&&!event.shiftKey)connectNode(id);else setSelection(selectFlowItem(selection,kind,id,event.shiftKey));outline.querySelector<HTMLButtonElement>(`[data-select-id="${id}"]`)?.focus();return;}
    const action=target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if(action)commitFields();
    if(action==='save'){const result=clone(model);cleanClose();onSave(result);}
    else if(action==='cancel')cancel();
    else if(action==='undo')undo();else if(action==='redo')undo(true);
    else if(action==='connect'){connecting=!connecting;origin=null;lastBlankTap=null;imageEditingId=null;render();}
    else if(action==='image-done'){imageEditingId=null;render();}
    else if(action==='image-fit')mutate(()=>patchImages({zoom:1,offsetX:0,offsetY:0,rotation:0}));
    else if(action==='image-text'){const id=selectedNode()?.id;if(id)enterImageText(id);}
    else if(action==='add-text-box'&&selectedNode())addTextBox(selectedNode()!.id);
    else if(action==='edit-text-box'&&selectedNode())enterImageText(selectedNode()!.id,target.closest<HTMLElement>('[data-text-box-id]')!.dataset.textBoxId);
    else if(action==='remove-text-box'&&selectedNode())removeTextBox(selectedNode()!.id,target.closest<HTMLElement>('[data-text-box-id]')!.dataset.textBoxId!);
    else if(action==='reset-bend')mutate(()=>applyFlowSelectionPatch(model,selection,{bend:null,waypoints:[]}));
    else if(action==='add-label'&&selectedEdge()&&selection?.ids.length===1){let id='';mutate(()=>{const edge=selectedEdge()!;if(flowEdgeLabels(edge).length>=20)return;const used=new Set(edge.labels?.map(label=>label.id));let n=1;while(used.has(`label-${n}`))n++;id=`label-${n}`;(edge.labels??=[]).push({id,text:'Nueva etiqueta',position:.65});});const input=inspector.querySelector<HTMLInputElement>(`[data-prop="labels.${id}"]`);input?.focus();input?.select();}
    else if(action==='remove-label'&&selectedEdge()){const id=target.closest<HTMLElement>('[data-label-id]')?.dataset.labelId;mutate(()=>{const edge=selectedEdge()!;edge.labels=edge.labels?.filter(label=>label.id!==id);});}
    else if(action==='delete')removeSelection();
    else if(action==='duplicate')duplicateSelection();
    else if(action==='lane')mutate(()=>{const lane=addFlowLane(model);lane.x=flowSnap(lane.x,model);lane.y=flowSnap(lane.y,model);selection={kind:'lane',ids:[lane.id]};});
    else if(action==='canvas')setSelection(null);else if(action==='fit')fit();
  });
  dialog.addEventListener('keydown',event=>{
    event.stopPropagation();const target=event.target as HTMLElement,editing=!!target.closest('input,textarea,select,[contenteditable="true"]');
    const disconnect=target.closest<SVGElement>('[data-flow-disconnect]');
    if(disconnect&&['Enter',' '].includes(event.key)){event.preventDefault();disconnectAtPort(disconnect);return;}
    const label=target.closest<SVGElement>('[data-flow-label]');
    if(label&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();mutate(()=>{const edge=model.edges.find(edge=>edge.id===label.dataset.flowLabel);if(!edge)return;const step=(event.shiftKey?.1:.01)*(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1),id=label.dataset.labelId;if(id==='primary')edge.labelPosition=flowClamp((edge.labelPosition??.5)+step,0,1);else{const entry=edge.labels?.find(item=>item.id===id);if(entry)entry.position=flowClamp(entry.position+step,0,1);}});surface.querySelector<SVGElement>(`[data-flow-label="${label.dataset.flowLabel}"][data-label-id="${label.dataset.labelId}"]`)?.focus();return;}
    if(event.key==='Escape'&&colorControls.isOpen()){event.preventDefault();colorControls.close(true);return;}
    if(colorControls.isOpen())return;
    if(event.key==='Escape'&&dialog.querySelector('[data-flow-keep]')){event.preventDefault();dialog.querySelector<HTMLButtonElement>('[data-flow-keep]')!.click();return;}
    if(event.key==='Escape'&&connectionDrag){event.preventDefault();cancelConnection();origin=null;renderSurface();return;}
    if(event.key==='Escape'&&connecting){event.preventDefault();origin=null;renderSurface();return;}
    if(imageEditingId&&(event.key==='Escape'||event.key==='Enter')&&!editing){event.preventDefault();imageEditingId=null;render();return;}
    if(editing)return;
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();undo(event.shiftKey);}
    else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'){event.preventDefault();undo(true);}
    else if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();removeSelection();}
    else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='d'){event.preventDefault();duplicateSelection();}
    else if(event.key==='F2'&&selectedNode()){event.preventDefault();enterImageText(selectedNode()!.id);}
    else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)&&selection&&selection.kind!=='edge'){
      event.preventDefault();const step=(model.snapMode==='grid'?20:model.snapMode==='pixels'?model.snapSize:1)*(event.shiftKey?10:1);mutate(()=>{const items=flowSelectionItems(model,selection)as(FlowNode|FlowLane)[];if(!items.length)return;
        const first=items[0],next=selection?.kind==='node'?flowSnapPosition(first,first.x+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0),first.y+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0),model):{x:first.x+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0),y:first.y+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0)};
        const dx=flowClamp(next.x-first.x,-Math.min(...items.map(item=>item.x)),Math.min(...items.map(item=>model.width-item.x-item.width)));
        const dy=flowClamp(next.y-first.y,-Math.min(...items.map(item=>item.y)),Math.min(...items.map(item=>model.height-item.y-item.height)));
        if(selection?.kind==='node'&&model.snapMode==='grid')for(const edge of model.edges)if(items.some(item=>item.id===edge.from)){if(edge.bend)edge.bend.position=flowClamp(flowSnap(edge.bend.position+(edge.bend.axis==='x'?dx:dy),model),0,edge.bend.axis==='x'?model.width:model.height);if(edge.waypoints)edge.waypoints=edge.waypoints.map(p=>({x:flowClamp(p.x+dx,0,model.width),y:flowClamp(p.y+dy,0,model.height)}));}
        for(const item of items){item.x+=dx;item.y+=dy;}
      });
    }
  });
  dialog.addEventListener('paste',event=>{
    const target=event.target as Element;if(target.closest('input,textarea,[contenteditable="true"]'))return;
    const clipboard=event.clipboardData,file=flowClipboardImage(clipboard),text=clipboard?.getData('text/plain').trim()||'';
    if(!file&&!/^(https?:\/\/|data:image\/)/i.test(text))return;event.preventDefault();event.stopPropagation();const node=selectedNode();if(node?.type==='image')void importImage(node.id,file||text);else status.textContent='Agrega o selecciona una figura Imagen para pegar aquí.';
  });
  dialog.addEventListener('pointerdown',event=>{if(rich.id&&!rich.contains(event.target as Element))rich.finish();});
  viewport.addEventListener('scroll',()=>{rich.sync();if(imageEditingId)renderSurface();});
  // Keep the parent builder's delegated drag, selection and delete handlers outside this editor.
  for(const name of ['click','dblclick','pointerdown','pointerup','pointermove','mousedown','mouseup','dragstart','dragover','drop','input','change'])dialog.addEventListener(name,event=>event.stopPropagation());
  document.body.append(dialog);dialog.showModal();render();requestAnimationFrame(()=>{fit();button('cancel').focus();});document.fonts?.ready.then(()=>{if(!closed)renderSurface();});
}
