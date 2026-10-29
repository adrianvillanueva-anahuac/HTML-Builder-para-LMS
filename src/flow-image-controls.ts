import type {FlowNode} from './flow-model';
import type {FlowImage} from './flow-image';
import {imageAdjustments} from './image-model';
import {flowClipboardImage} from './flow-image-import';
type Actions={editing:boolean;toggle:()=>void;change:(patch:Partial<FlowImage>)=>void;import:(id:string,input:File|string)=>void;frameControls:(parent:HTMLElement)=>void;message?:string};
export function flowImageControls(parent:HTMLElement,nodes:FlowNode[],actions:Actions){
 const first=nodes[0],image=first.image!,single=nodes.length===1;
 const button=(label:string,fn:()=>void)=>{const b=document.createElement('button');b.type='button';b.className='fde-image-button';b.textContent=label;b.onclick=fn;parent.append(b);return b;};
 const note=document.createElement('p');note.className='fde-help';note.textContent='Doble clic en la imagen: recortar, escalar y encuadrar. Doble clic en su texto: editar con herramientas flotantes.';parent.append(note);
 if(single){
  const input=document.createElement('input');input.type='file';input.accept='.png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif';input.hidden=true;input.setAttribute('aria-label','Archivo de imagen del diagrama');parent.append(input);
  button(image.src?'Reemplazar imagen…':'Traer imagen…',()=>input.click());input.onchange=()=>{const file=input.files?.[0];if(file)actions.import(first.id,file);};
  const url=document.createElement('input');url.type='url';url.placeholder='Pega una URL de imagen…';url.setAttribute('aria-label','URL de imagen del diagrama');url.className='fde-image-url';parent.append(url);
  let last='';const submit=()=>{const value=url.value.trim();if(!value||value===last)return;last=value;actions.import(first.id,value);};
  url.onpaste=event=>{event.preventDefault();event.stopPropagation();const file=flowClipboardImage(event.clipboardData);if(file){actions.import(first.id,file);return;}url.value=event.clipboardData?.getData('text/plain').trim()||'';last='';submit();};
  url.onchange=submit;url.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();submit();}};
  const toggle=button(actions.editing?'Terminar encuadre':'Editar encuadre',actions.toggle);toggle.disabled=!image.src;toggle.setAttribute('aria-pressed',String(actions.editing));
  if(actions.editing){const help=document.createElement('p');help.className='fde-help';help.textContent='Naranja: recorta el marco. Azul: escala la foto. Arrastra la foto para encuadrar; el exterior se muestra al 15%. Enter o Escape terminan el encuadre.';parent.append(help);}
 }
 const status=document.createElement('p');status.className='fde-image-error';status.setAttribute('role','status');status.textContent=actions.message||'';parent.append(status);
 const control=(labelText:string,key:string,value:string|number,options?:readonly (readonly [string,string])[],min=0,max=100)=>{
  const label=document.createElement('label');label.className='fde-field';label.textContent=labelText;
  const input=options?document.createElement('select'):document.createElement('input');input.dataset.prop=`image.${key}`;input.setAttribute('aria-label',labelText);
  const read=(node:FlowNode)=>key.startsWith('adjustments.')?node.image!.adjustments[key.split('.')[1] as keyof FlowImage['adjustments']]:node.image![key as keyof FlowImage],mixed=nodes.some(node=>read(node)!==read(first));
  if(input instanceof HTMLSelectElement){if(mixed){const option=new Option('Varios valores','');option.disabled=true;input.append(option);}for(const [id,text]of options!)input.append(new Option(text,id));input.value=mixed?'':String(value);}
  else{input.type='range';input.min=String(min);input.max=String(max);input.step=key==='zoom'?'.01':'1';input.value=String(value);const output=document.createElement('output');output.textContent=mixed?'Varios':String(Math.round(Number(value)*100)/100);label.append(output);}
  label.append(input);parent.append(label);
 };
 control('Máscara','mask',image.mask,[['none','Original · conservar alpha'],['process','Cuadrado / rectángulo'],['circle','Círculo / elipse'],['decision','Decisión'],['terminator','Inicio / fin'],['document','Documento'],['data','Datos']]);
 actions.frameControls(parent);
 control('Escala de la imagen','zoom',image.zoom,undefined,.1,8);control('Rotación de la imagen','rotation',image.rotation,undefined,-180,180);
 button('Centrar y ajustar imagen',()=>actions.change({zoom:1,offsetX:0,offsetY:0,rotation:0}));button('Voltear horizontal',()=>actions.change({flipX:!image.flipX}));button('Voltear vertical',()=>actions.change({flipY:!image.flipY}));
 const details=document.createElement('details');details.className='fde-image-adjustments';const summary=document.createElement('summary');summary.textContent='Ajustes de imagen';details.append(summary);parent.append(details);const before=Array.from(parent.children);
 for(const [key,label,min,max]of [['hue','Matiz (HUE)',-180,180],['contrast','Contraste',0,200],['brightness','Brillo',0,200],['saturation','Saturación',0,200],['tintHue','Color del filtro',0,360],['tint','Intensidad del filtro',0,100]]as const)control(label,`adjustments.${key}`,image.adjustments[key],undefined,min,max);
 button('Restablecer ajustes',()=>actions.change({adjustments:imageAdjustments()}));for(const child of Array.from(parent.children))if(!before.includes(child))details.append(child);
}
