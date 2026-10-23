import {clamp,normalizeCrop,resizeCrop,cropForAspect,imageAdjustments,imageTextLayout,transformImageText,imageFilter,type CropRect,type ImageTextLayout} from './image-model';
import './image-controls.css';

const selector='[data-type="imagen_suelta"],[data-type="profesor_img"]';
const parse=(value:string|undefined)=>{try{const data=JSON.parse(value||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return {};}};
const comparison=document.createElement('div').style;
const apply=(node:HTMLElement,styles:Partial<CSSStyleDeclaration>)=>{for(const [key,value] of Object.entries(styles)){(comparison as any)[key]=value;const normalized=(comparison as any)[key];if((node.style as any)[key]!==normalized)(node.style as any)[key]=normalized;}};
const picture=(block:HTMLElement)=>block.querySelector<HTMLImageElement>('.uploaded-image');
const frameOf=(block:HTMLElement)=>block.querySelector<HTMLElement>('.image-wrapper');
const ratioOf=(block:HTMLElement)=>{const img=picture(block);return img?.naturalWidth&&img.naturalHeight?img.naturalWidth/img.naturalHeight:Number(block.dataset.imageNaturalRatio)||1;};
const ratio=(value:string)=>{const [a,b='1']=value.split('/').map(s=>s.trim());return Number(a)/Number(b)||0;};
const state=(block:HTMLElement)=>imageAdjustments(parse(block.dataset.imageAdjustments));
const textState=(block:HTMLElement)=>imageTextLayout(parse(block.dataset.imageTextLayout));
const setData=(block:HTMLElement,key:string,value:unknown)=>{const next=JSON.stringify(value);if(block.dataset[key]!==next)block.dataset[key]=next;};
const changed=(block:HTMLElement)=>{block.dispatchEvent(new Event('input',{bubbles:true}));};
const change=(block:HTMLElement,update:()=>void)=>{window.saveHistoryState?.(true);update();changed(block);window.saveHistoryState?.(true);};
let cropSession:{block:HTMLElement;close:()=>void}|null=null;

function currentCrop(block:HTMLElement):CropRect{
  if(block.dataset.imageCrop)return normalizeCrop(parse(block.dataset.imageCrop));
  const target=ratio(frameOf(block)?.style.aspectRatio||picture(block)?.style.aspectRatio||'auto');
  const position=(picture(block)?.style.objectPosition||'50% 50%').split(' ').map(p=>parseFloat(p)/100);
  return cropForAspect(ratioOf(block),target,position[0]??.5,position[1]??.5);
}

function paint(block:HTMLElement){
  const frame=frameOf(block),img=picture(block);if(!frame||!img)return;
  if(img.naturalWidth&&img.naturalHeight){const value=String(img.naturalWidth/img.naturalHeight);if(block.dataset.imageNaturalRatio!==value)block.dataset.imageNaturalRatio=value;}
  apply(frame,{position:'relative',maxWidth:'100%',boxSizing:'border-box',overflow:'hidden',isolation:'isolate',containerType:'inline-size'});
  if(frame.parentElement!==block&&frame.parentElement?.classList.contains('justify-center'))apply(frame.parentElement,{display:'flex',flexDirection:'column',alignItems:'center',width:'100%',padding:'8px 0'});
  if(img.getAttribute('src')){if(img.classList.contains('hidden'))img.classList.remove('hidden');apply(img,{display:'block'});}
  if(block.dataset.imageCrop){
    const crop=currentCrop(block);
    apply(frame,{aspectRatio:String(ratioOf(block)*crop.width/crop.height)});
    apply(img,{position:'absolute',width:(100/crop.width)+'%',height:(100/crop.height)+'%',maxWidth:'none',left:(-100*crop.x/crop.width)+'%',top:(-100*crop.y/crop.height)+'%',objectFit:'fill',display:'block'});
    for(const axis of ['x','y'] as const){
      const control=block.querySelector<HTMLInputElement>(`.block-toolbar input[oninput*="updateImagePosition"][oninput*="'${axis}'"]`),space=1-(axis==='x'?crop.width:crop.height);
      const value=String(Math.round(space>1e-6?crop[axis]/space*100:50));
      if(control){if(control.value!==value)control.value=value;if(control.getAttribute('value')!==value)control.setAttribute('value',value);}
    }
  }
  if(block.dataset.imageAdjustments){
    const values=state(block);apply(img,{filter:imageFilter(values)});
    let tint=frame.querySelector<HTMLElement>(':scope > .image-color-tint');
    if(!tint){tint=document.createElement('div');tint.className='image-color-tint';tint.setAttribute('aria-hidden','true');frame.append(tint);}
    apply(tint,{position:'absolute',inset:'0',pointerEvents:'none',backgroundColor:`hsl(${values.tintHue} 85% 50%)`,opacity:String(values.tint/100),mixBlendMode:'color',zIndex:'1'});
  }
  const layer=frame.querySelector<HTMLElement>(':scope > .image-text-layer'),text=layer?.querySelector<HTMLElement>('.image-overlay-text');
  if(layer&&text){
    const t=textState(block);
    apply(layer,{position:'absolute',inset:t.margin+'%',zIndex:'2',pointerEvents:'none',minWidth:'0',minHeight:'0'});
    apply(text,{position:'absolute',boxSizing:'border-box',left:t.x+'%',top:t.y+'%',width:t.width+'%',height:t.height==null?'auto':t.height+'%',maxWidth:'100%',maxHeight:'100%',overflow:'hidden',overflowWrap:'anywhere',transform:`translate(-${t.x}%,-${t.y}%)`,pointerEvents:'auto',margin:'0',lineHeight:'1.3'});
    if(!text.isContentEditable)apply(text,{fontSize:`clamp(8px, ${t.size/4}cqw, 96px)`});
  }
}

function normalizeTextFonts(block:HTMLElement,text:HTMLElement,width:number){
  const s=textState(block),pixels=/px$/.test(text.style.fontSize),own=parseFloat(text.style.fontSize);
  const base=pixels?own:s.size*(width||400)/400;
  if(pixels)setData(block,'imageTextLayout',{...s,size:clamp(own*400/(width||400),10,72)});
  text.querySelectorAll<HTMLElement>('[style]').forEach(node=>{if(/px$/.test(node.style.fontSize))node.style.fontSize=(parseFloat(node.style.fontSize)/base)+'em';});
}

export function changeImageCropAspect(block:HTMLElement,aspect:string){
  if(!block.matches(selector)||!frameOf(block)||!picture(block)?.naturalWidth)return false;
  cropSession?.close();
  change(block,()=>{
    setData(block,'imageCrop',cropForAspect(ratioOf(block),ratio(aspect)));paint(block);
  });return true;
}
export function changeImageCropPosition(block:HTMLElement,axis:'x'|'y',value:number){
  if(!block.dataset.imageCrop)return false;
  const crop=currentCrop(block);crop[axis]=(1-(axis==='x'?crop.width:crop.height))*clamp(value,0,100)/100;
  setData(block,'imageCrop',crop);paint(block);changed(block);return true;
}

function addText(block:HTMLElement){
  const frame=frameOf(block);if(!frame)return;
  if(!frame.querySelector(':scope > .image-text-layer'))change(block,()=>{
    const layer=document.createElement('div');layer.className='image-text-layer';
    const text=document.createElement('div');text.className='image-overlay-text editable-text';text.textContent='Escribe tu texto aquí';
    text.title='Doble clic para editar; arrastra para mover; usa los bordes para redimensionar';text.style.cssText='font-family:Roboto,Arial,sans-serif;font-weight:700;color:#ffffff;text-align:center;text-shadow:0 1px 4px #000b;';
    layer.append(text);frame.append(layer);setData(block,'imageTextLayout',textState(block));paint(block);
  });
}

function beginCrop(block:HTMLElement){
  const img=picture(block),frame=frameOf(block);if(!img?.naturalWidth||!frame)return;
  cropSession?.close();
  const editor=document.createElement('div');editor.id='image-crop-editor';editor.setAttribute('role','group');editor.setAttribute('aria-label','Recorte libre de la imagen');
  editor.innerHTML='<div class="image-crop-stage"><img class="image-crop-preview" alt="Vista previa del recorte" draggable="false"><div class="image-crop-shading"><div class="image-crop-shade"></div></div><div class="image-crop-box" data-crop-handle="move"></div></div><div class="image-crop-actions"><span>Recorte libre</span><button type="button" data-crop-cancel>Cancelar</button><button type="button" data-crop-apply>Aplicar</button></div>';
  const stage=editor.querySelector<HTMLElement>('.image-crop-stage')!,box=editor.querySelector<HTMLElement>('.image-crop-box')!,shade=editor.querySelector<HTMLElement>('.image-crop-shade')!;
  const preview=editor.querySelector<HTMLImageElement>('img')!;preview.src=img.currentSrc||img.src;preview.style.filter=img.style.filter;
  const names:Record<string,string>={nw:'Esquina superior izquierda',n:'Lado superior',ne:'Esquina superior derecha',e:'Lado derecho',se:'Esquina inferior derecha',s:'Lado inferior',sw:'Esquina inferior izquierda',w:'Lado izquierdo'};
  for(const [handle,name] of Object.entries(names)){
    const button=document.createElement('button');button.type='button';button.className='image-crop-handle';button.dataset.cropHandle=handle;button.setAttribute('aria-label',name);
    const x=handle.includes('w')?0:handle.includes('e')?100:50,y=handle.includes('n')?0:handle.includes('s')?100:50;
    Object.assign(button.style,{left:x+'%',top:y+'%',cursor:({nw:'nwse',se:'nwse',ne:'nesw',sw:'nesw',n:'ns',s:'ns',e:'ew',w:'ew'} as Record<string,string>)[handle]+'-resize'});box.append(button);
  }
  let crop=currentCrop(block),drag:{handle:string;x:number;y:number;crop:CropRect}|null=null;
  const draw=()=>{const style={left:crop.x*100+'%',top:crop.y*100+'%',width:crop.width*100+'%',height:crop.height*100+'%'};Object.assign(box.style,style);Object.assign(shade.style,style);};
  const position=()=>{
    if(!block.isConnected){close();return;}
    const r=frame.getBoundingClientRect(),natural=ratioOf(block),width=Math.max(1,Math.min(r.width,innerWidth-56,Math.max(20,innerHeight-140)*natural)),height=width/natural;
    Object.assign(stage.style,{width:width+'px',height:height+'px'});
    Object.assign(editor.style,{left:clamp(r.left+(r.width-width)/2-12,12,innerWidth-width-38)+'px',top:clamp(r.top-12,12,innerHeight-height-80)+'px'});
  };
  const close=()=>{editor.remove();window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);document.removeEventListener('keydown',escape,true);if(cropSession?.block===block)cropSession=null;};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}};
  editor.querySelector('[data-crop-cancel]')!.addEventListener('click',close);
  editor.querySelector('[data-crop-apply]')!.addEventListener('click',()=>{change(block,()=>{setData(block,'imageCrop',crop);paint(block);});close();});
  editor.addEventListener('pointerdown',event=>{
    const handle=(event.target as Element).closest<HTMLElement>('[data-crop-handle]');if(!handle||event.button!==0)return;
    event.preventDefault();event.stopPropagation();drag={handle:handle.dataset.cropHandle!,x:event.clientX,y:event.clientY,crop:{...crop}};handle.setPointerCapture(event.pointerId);
  });
  editor.addEventListener('pointermove',event=>{if(!drag)return;event.preventDefault();const r=stage.getBoundingClientRect();crop=resizeCrop(drag.crop,drag.handle,(event.clientX-drag.x)/r.width,(event.clientY-drag.y)/r.height,Math.max(.02,16/r.width),Math.max(.02,16/r.height));draw();});
  editor.addEventListener('pointerup',()=>{drag=null;});editor.addEventListener('pointercancel',()=>{drag=null;});
  box.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();const step=event.shiftKey ? .05 : .01,handle=(event.target as HTMLElement).dataset.cropHandle||'move';
    crop=resizeCrop(crop,handle,event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0);draw();
  });
  document.body.append(editor);cropSession={block,close};draw();position();box.querySelector<HTMLButtonElement>('[data-crop-handle=se]')?.focus({preventScroll:true});
  window.addEventListener('resize',position);window.addEventListener('scroll',position,true);document.addEventListener('keydown',escape,true);
}

let installed=false;
const loaded=new WeakSet<HTMLImageElement>();
export function setupImageControls(root:ParentNode=document){
  root.querySelectorAll<HTMLElement>(selector).forEach(block=>{
    const img=picture(block);if(!img)return;
    let frame=frameOf(block);
    if(!frame&&block.dataset.type==='profesor_img'){
      frame=document.createElement('div');frame.className='image-wrapper';frame.style.cssText='width:100%;aspect-ratio:1;display:none;';img.before(frame);frame.append(img);
      if(img.getAttribute('src')){frame.style.display='block';img.classList.remove('hidden');}
    }
    const tools=block.querySelector<HTMLElement>(':scope > .block-toolbar > div');
    if(tools&&!tools.querySelector('[data-image-tool]')){
      const remove=tools.querySelector(':scope > button[onclick*="deleteBlock"]');
      for(const [key,icon,label] of [['adjustments','tune','Editar color de imagen'],['text','text_fields','Texto sobre la imagen']]){
        const button=document.createElement('button');button.type='button';button.className='editor-icon-button p-1 flex items-center justify-center';button.dataset.imageTool=key;button.title=label;button.setAttribute('aria-label',label);button.innerHTML=`<span class="material-symbols-outlined text-[18px]" aria-hidden="true">${icon}</span>`;tools.insertBefore(button,remove);
      }
      const presets=tools.querySelector('[onclick*="changeImageAspect"]')?.parentElement;
      if(presets&&!presets.querySelector('[data-image-free-crop]')){const free=document.createElement('button');free.type='button';free.dataset.imageFreeCrop='';free.className='px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100';free.textContent='Libre';free.title='Recorte libre con lados y esquinas';presets.prepend(free);}
    }
    if(!loaded.has(img)){loaded.add(img);img.addEventListener('load',()=>{paint(block);});}
    paint(block);
  });
  if(installed)return;installed=true;installEvents();
}

function installEvents(){
  const popup=document.createElement('div');popup.id='image-controls-popover';popup.hidden=true;popup.setAttribute('role','group');document.body.append(popup);
  const pin=document.createElement('style');document.head.append(pin);
  let active:HTMLElement|null=null,anchor:HTMLElement|null=null,kind='',timer=0,sliderDrag=false;
  const hide=()=>{popup.hidden=true;active=null;anchor=null;pin.textContent='';};
  const later=()=>{clearTimeout(timer);timer=window.setTimeout(()=>{if(!sliderDrag)hide();},400);};
  const stay=()=>clearTimeout(timer);
  const locate=()=>{
    if(!anchor?.isConnected||!active?.isConnected){hide();return;}
    const a=anchor.getBoundingClientRect();
    popup.style.maxHeight=Math.max(80,Math.max(a.top-20,innerHeight-a.bottom-20))+'px';
    const p=popup.getBoundingClientRect();
    popup.style.left=clamp(a.right-p.width,12,innerWidth-p.width-12)+'px';
    popup.style.top=(a.top>p.height+16?a.top-p.height-8:Math.min(innerHeight-p.height-12,a.bottom+8))+'px';
  };
  const slider=(key:string,label:string,value:number,min:number,max:number,unit='%')=>`<label><span>${label}<output data-image-output="${key}">${value}${unit}</output></span><input type="range" data-image-setting="${key}" aria-label="${label}" min="${min}" max="${max}" value="${value}" data-unit="${unit}"></label>`;
  const show=(button:HTMLElement)=>{
    stay();const block=button.closest<HTMLElement>(selector);if(!block||!picture(block)?.getAttribute('src'))return;
    const editing=frameOf(block)?.querySelector<HTMLElement>('.image-overlay-text[contenteditable=true]');
    if(editing){
      editing.contentEditable='false';normalizeTextFonts(block,editing,frameOf(block)?.getBoundingClientRect().width||400);paint(block);
      document.getElementById('rtf-toolbar')?.classList.add('hidden');
      if(window.currentEditableText===editing){window.currentEditableText=null;window.lastKnownRange=null;window.getSelection()?.removeAllRanges();}
    }
    const next=button.dataset.imageTool!;if(active===block&&kind===next&&!popup.hidden){locate();return;}
    active=block;anchor=button;kind=next;
    if(kind==='adjustments'){
      const s=state(block);popup.innerHTML='<h3>Editar imagen</h3>'+slider('hue','Matiz (HUE)',s.hue,-180,180,'°')+slider('contrast','Contraste',s.contrast,0,200)+slider('brightness','Brillo',s.brightness,0,200)+slider('saturation','Saturación',s.saturation,0,200)+slider('tintHue','Color del filtro',s.tintHue,0,360,'°')+slider('tint','Intensidad del filtro',s.tint,0,100)+'<div class="image-menu-actions"><button type="button" data-image-reset>Restablecer ajustes</button></div>';
    }else{
      const s=textState(block),exists=!!frameOf(block)?.querySelector('.image-overlay-text');
      popup.innerHTML='<h3>Texto sobre la imagen</h3><small>Doble clic para editar. Arrastra la caja para moverla y sus bordes para cambiar sus dimensiones.</small>'+(exists?slider('size','Tamaño del texto',s.size,10,72,'')+'<div class="image-menu-actions"><button type="button" data-image-text-remove>Quitar texto</button></div>':'<div class="image-menu-actions"><button type="button" data-image-text-activate>Activar texto</button></div>');
    }
    popup.hidden=false;
    // Pin the source toolbar through a stylesheet, not authored classes/history.
    const parts:string[]=[];let node:Element=block;const canvas=document.getElementById('canvas-container-outer');
    while(node&&node!==canvas){const parent=node.parentElement;if(!parent)break;parts.unshift(`:nth-child(${Array.from(parent.children).indexOf(node)+1})`);node=parent;}
    if(node===canvas)pin.textContent=`body:not(.is-dragging) #canvas-container-outer > ${parts.join(' > ')} > .block-toolbar{opacity:1!important;pointer-events:auto!important}`;
    locate();
  };
  document.addEventListener('pointerover',event=>{const button=(event.target as Element).closest<HTMLElement>('[data-image-tool]');if(button)show(button);});
  document.addEventListener('pointerout',event=>{if((event.target as Element).closest('[data-image-tool]'))later();});
  document.addEventListener('focusin',event=>{const button=(event.target as Element).closest<HTMLElement>('[data-image-tool]');if(button)show(button);});
  popup.addEventListener('pointerenter',stay);popup.addEventListener('pointerleave',later);popup.addEventListener('focusin',stay);
  document.addEventListener('click',event=>{
    const target=event.target as Element,tool=target.closest<HTMLElement>('[data-image-tool]'),free=target.closest<HTMLElement>('[data-image-free-crop]');
    if(free){event.preventDefault();const block=free.closest<HTMLElement>(selector);hide();if(block)beginCrop(block);return;}
    if(tool){event.preventDefault();show(tool);return;}
    if(!popup.contains(target)&&!target.closest('#rtf-toolbar,#text-link-tools'))hide();
  });
  popup.addEventListener('pointerdown',event=>{if((event.target as Element).matches('input[type=range]')&&active){stay();window.saveHistoryState?.(true);sliderDrag=true;window.modularResizing=true;}});
  const finishSlider=()=>{if(sliderDrag){sliderDrag=false;window.modularResizing=false;if(active)changed(active);window.saveHistoryState?.(true);if(!popup.matches(':hover')&&!popup.contains(document.activeElement))later();}};
  document.addEventListener('pointerup',finishSlider);document.addEventListener('pointercancel',finishSlider);window.addEventListener('blur',finishSlider);
  popup.addEventListener('input',event=>{
    const input=event.target as HTMLInputElement;if(!active?.isConnected||!input.dataset.imageSetting)return;
    if(!sliderDrag)window.saveHistoryState?.(true);
    const key=input.dataset.imageSetting,value=Number(input.value);
    if(kind==='adjustments')setData(active,'imageAdjustments',imageAdjustments({...state(active),[key]:value}));else setData(active,'imageTextLayout',imageTextLayout({...textState(active),[key]:value}));
    input.setAttribute('value',input.value);popup.querySelector<HTMLOutputElement>(`[data-image-output="${key}"]`)!.value=input.value+(input.dataset.unit||'');paint(active);changed(active);
    if(!sliderDrag)window.saveHistoryState?.(true);
  });
  popup.addEventListener('click',event=>{
    const target=event.target as Element;if(!active)return;
    if(target.closest('[data-image-reset]')){const block=active,button=anchor!;change(block,()=>{setData(block,'imageAdjustments',imageAdjustments());paint(block);});hide();show(button);}
    if(target.closest('[data-image-text-activate]')){const block=active,button=anchor!;addText(block);hide();show(button);}
    if(target.closest('[data-image-text-remove]')){const block=active;change(block,()=>{frameOf(block)?.querySelector('.image-text-layer')?.remove();});hide();}
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});window.addEventListener('resize',locate);window.addEventListener('scroll',()=>{if(!popup.hidden)locate();},true);
  installTextManipulation();
}

function installTextManipulation(){
  // The rollover lives outside the authored DOM: no handles enter history,
  // duplication, saved projects or exported student content.
  const controls=document.createElement('div');controls.id='image-text-controls';controls.hidden=true;controls.setAttribute('role','group');controls.setAttribute('aria-label','Ajustar caja de texto sobre la imagen');
  const names:Record<string,string>={nw:'Esquina superior izquierda',n:'Borde superior',ne:'Esquina superior derecha',e:'Borde derecho',se:'Esquina inferior derecha',s:'Borde inferior',sw:'Esquina inferior izquierda',w:'Borde izquierdo'};
  for(const [handle,name] of Object.entries(names)){
    const button=document.createElement('button');button.type='button';button.dataset.imageTextHandle=handle;button.setAttribute('aria-label',name+' de la caja de texto');button.title=name;button.style.left=(handle.includes('w')?0:handle.includes('e')?100:50)+'%';button.style.top=(handle.includes('n')?0:handle.includes('s')?100:50)+'%';button.style.cursor=({nw:'nwse',se:'nwse',ne:'nesw',sw:'nesw',n:'ns',s:'ns',e:'ew',w:'ew'} as Record<string,string>)[handle]+'-resize';controls.append(button);
  }
  document.body.append(controls);
  let selected:HTMLElement|null=null,timer=0,animation=0;
  let drag:{block:HTMLElement;text:HTMLElement;x:number;y:number;layout:ImageTextLayout;rect:CropRect;frame:DOMRect;handle:string;target:HTMLElement;started:boolean;pointer:number}|null=null;
  const hide=()=>{clearTimeout(timer);cancelAnimationFrame(animation);controls.hidden=true;selected=null;};
  const draw=()=>{
    if(!selected?.isConnected||selected.isContentEditable||window.isLmsDragging){hide();return;}
    const r=selected.getBoundingClientRect();
    if(!r.width||!r.height){hide();return;}
    apply(controls,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});controls.hidden=false;
    animation=requestAnimationFrame(draw);
  };
  const show=(text:HTMLElement)=>{clearTimeout(timer);selected=text;cancelAnimationFrame(animation);draw();};
  const later=()=>{clearTimeout(timer);timer=window.setTimeout(()=>{if(!drag&&!controls.contains(document.activeElement))hide();},250);};
  const boxRect=(text:HTMLElement,frame:DOMRect):CropRect=>{const r=text.getBoundingClientRect();return normalizeCrop({x:(r.left-frame.left)/frame.width,y:(r.top-frame.top)/frame.height,width:r.width/frame.width,height:r.height/frame.height});};
  document.addEventListener('pointerover',event=>{const text=(event.target as Element).closest<HTMLElement>('.image-overlay-text');if(text)show(text);});
  document.addEventListener('pointerout',event=>{if((event.target as Element).closest('.image-overlay-text'))later();});
  controls.addEventListener('pointerenter',()=>clearTimeout(timer));controls.addEventListener('pointerleave',later);controls.addEventListener('focusin',()=>clearTimeout(timer));controls.addEventListener('focusout',later);
  document.addEventListener('pointerdown',event=>{
    const target=event.target as Element,handle=target.closest<HTMLElement>('[data-image-text-handle]');
    const text=handle?selected:target.closest<HTMLElement>('.image-overlay-text');
    if(!text||text.isContentEditable||event.button!==0){if(!controls.contains(target))hide();return;}
    const block=text.closest<HTMLElement>(selector),frame=block&&frameOf(block)?.getBoundingClientRect();if(!block||!frame?.width||!frame.height)return;
    event.preventDefault();show(text);if(handle)handle.focus({preventScroll:true});
    drag={block,text,x:event.clientX,y:event.clientY,layout:textState(block),rect:boxRect(text,frame),frame,handle:handle?.dataset.imageTextHandle||'move',target:handle||text,started:false,pointer:event.pointerId};
  });
  document.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointer)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.started&&Math.hypot(dx,dy)<4)return;
    if(!drag.text.isConnected){end();return;}
    if(!drag.started){window.saveHistoryState?.(true);window.modularResizing=true;drag.started=true;drag.target.setPointerCapture(drag.pointer);}
    const layout=transformImageText(drag.layout,drag.rect,drag.handle,dx/drag.frame.width,dy/drag.frame.height,.1,Math.max(.02,Math.min(1,20/drag.frame.height)));
    setData(drag.block,'imageTextLayout',layout);paint(drag.block);event.preventDefault();
  },{passive:false});
  const end=()=>{if(!drag)return;const {block,started,target,pointer}=drag;drag=null;if(target.hasPointerCapture(pointer))target.releasePointerCapture(pointer);if(started){window.modularResizing=false;changed(block);window.saveHistoryState?.(true);}later();};
  document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);window.addEventListener('blur',end);
  controls.addEventListener('lostpointercapture',end);
  controls.addEventListener('keydown',event=>{
    if(event.key==='Escape'){end();hide();return;}
    if(!selected||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    const block=selected.closest<HTMLElement>(selector),frame=block&&frameOf(block)?.getBoundingClientRect();if(!block||!frame?.width||!frame.height)return;
    event.preventDefault();event.stopPropagation();const step=event.shiftKey?10:1,handle=(event.target as HTMLElement).dataset.imageTextHandle!;
    const layout=transformImageText(textState(block),boxRect(selected,frame),handle,(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0)/frame.width,(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)/frame.height);
    change(block,()=>{setData(block,'imageTextLayout',layout);paint(block);});
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){end();hide();}});
  document.addEventListener('focusout',event=>{
    const text=(event.target as Element).closest<HTMLElement>('.image-overlay-text');if(!text)return;
    setTimeout(()=>{
      if(!text.isConnected||text.isContentEditable)return;
      const block=text.closest<HTMLElement>(selector);if(!block)return;
      // Rich-text sizes become relative units so later image resizing scales
      // formatted fragments as well as the default text.
      normalizeTextFonts(block,text,frameOf(block)?.getBoundingClientRect().width||400);
      paint(block);changed(block);
    },180);
  });
}

export function prepareImageControlsExport(root:ParentNode,source?:ParentNode){
  const originals=source?.querySelectorAll<HTMLElement>(selector);
  root.querySelectorAll<HTMLElement>(selector).forEach((block,index)=>{
    const original=originals?.[index],width=original?frameOf(original)?.getBoundingClientRect().width||400:400;
    block.querySelectorAll<HTMLElement>('.image-overlay-text').forEach(text=>{normalizeTextFonts(block,text,width);text.removeAttribute('title');text.removeAttribute('contenteditable');text.style.cursor='default';});
    paint(block);
  });
}
