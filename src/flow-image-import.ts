import {flowImageSource} from './flow-image';
export type FlowImportedImage={src:string;naturalWidth:number;naturalHeight:number;alpha:boolean|null};
/** Windows/clipboard files may omit their MIME type; inspect the bytes instead. */
export function flowRasterMime(bytes:Uint8Array):string|null{
 const starts=(signature:number[])=>signature.every((byte,index)=>bytes[index]===byte);
 if(starts([137,80,78,71,13,10,26,10]))return 'image/png';
 if(starts([255,216,255]))return 'image/jpeg';
 if(starts([71,73,70,56])&&[55,57].includes(bytes[4])&&bytes[5]===97)return 'image/gif';
 if(starts([82,73,70,70])&&[87,69,66,80].every((byte,index)=>bytes[index+8]===byte))return 'image/webp';
 return null;
}
export function flowClipboardImage(data:DataTransfer|null):File|undefined{
 const files=[...Array.from(data?.files||[]),...Array.from(data?.items||[]).filter(item=>item.kind==='file').flatMap(item=>{const file=item.getAsFile();return file?[file]:[];})];
 return files.find(file=>file.type.startsWith('image/')||/\.(png|jpe?g|webp|gif)$/i.test(file.name));
}
function decode(source:string,signal:AbortSignal,cors:boolean):Promise<HTMLImageElement>{
 return new Promise((resolve,reject)=>{
 const image=new Image();let timer:ReturnType<typeof setTimeout>;const end=(error?:Error)=>{clearTimeout(timer);signal.removeEventListener('abort',abort);image.onload=null;image.onerror=null;if(error){image.src='';reject(error);}else resolve(image);};
 const abort=()=>end(new DOMException('Carga cancelada','AbortError'));if(signal.aborted){abort();return;}signal.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>end(new Error('La imagen tardó demasiado en responder.')),15000);
 if(cors)image.crossOrigin='anonymous';image.onload=()=>end();image.onerror=()=>end(new Error('El contenido pegado no es una imagen válida o no está disponible.'));image.src=source;
 });
}
/** Decode real pixels, never classify an image or its alpha from its extension. */
export async function importFlowImage(input:File|string,signal:AbortSignal):Promise<FlowImportedImage>{
 const file=typeof input!=='string';
 if(file){
  if(!input.size||input.size>10*1024*1024)throw new Error('Usa PNG, JPG, WebP o GIF de hasta 10 MB.');
  if(!flowRasterMime(new Uint8Array(await input.slice(0,16).arrayBuffer())))throw new Error('El archivo no contiene una imagen PNG, JPG, WebP o GIF válida.');
 }
 if(signal.aborted)throw new DOMException('Carga cancelada','AbortError');
 const source=file?URL.createObjectURL(input):flowImageSource(input.trim());if(!source)throw new Error('Lo pegado no es un archivo de imagen ni una URL HTTP/HTTPS de imagen.');
 try{
  let image:HTMLImageElement;
  try{image=await decode(source,signal,!file&&!source.startsWith('data:'));}catch(e){if(file||signal.aborted||source.startsWith('data:'))throw e;image=await decode(source,signal,false);}
  if(image.naturalWidth*image.naturalHeight>80_000_000)throw new Error('Usa una imagen menor de 80 megapíxeles.');
  const scale=Math.min(1,2048/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d')!;context.drawImage(image,0,0,canvas.width,canvas.height);
  try{
   const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;let alpha=false;for(let i=3;i<pixels.length;i+=4)if(pixels[i]<255){alpha=true;break;}
   const src=canvas.toDataURL('image/png');if(!flowImageSource(src))throw new Error('La imagen es demasiado pesada. Usa una versión más pequeña.');
   return {src,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,alpha};
  }catch(e){if(e instanceof DOMException&&e.name==='SecurityError'&&!file)return {src:source,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,alpha:null};throw e;}
 }finally{if(file)URL.revokeObjectURL(source);}
}
