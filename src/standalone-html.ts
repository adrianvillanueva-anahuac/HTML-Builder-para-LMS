export const isStandaloneHTML=(code:string)=>/<!doctype\s+html\b|<html(?:\s|>)/i.test(code);
export function encodeStandaloneHTML(code:string) {
  const bytes=new TextEncoder().encode(code);let binary='';
  for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
}
export function decodeStandaloneHTML(encoded:string) {
  return new TextDecoder().decode(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)));
}
export function standaloneButton(code:string):HTMLButtonElement {
  const parsed=new DOMParser().parseFromString(code,'text/html');
  const title=parsed.title.trim()||'Recurso interactivo';
  const button=document.createElement('button');button.type='button';
  button.dataset.standaloneHtml=encodeStandaloneHTML(code);
  button.dataset.resourceTitle=title;
  button.setAttribute('aria-haspopup','dialog');
  button.textContent=`Abrir ${title}`;
  button.style.cssText='display:inline-flex;align-items:center;justify-content:center;max-width:100%;padding:12px 24px;border:0;border-radius:24px;background:#5d428c;color:#fff;font:500 16px Roboto,Arial,sans-serif;cursor:pointer;white-space:normal';
  return button;
}
