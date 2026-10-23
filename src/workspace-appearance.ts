import type {FooterConfig,Workspace} from './project-model';

export type SelectionAction='all'|'none'|'invert'|'odd'|'even';
export function selectAppearanceRows(ids:string[],selected:ReadonlySet<string>,action:SelectionAction):Set<string> {
  return new Set(ids.filter((id,index)=>action==='all'||(action==='invert'&&!selected.has(id))||(action==='odd'&&index%2===0)||(action==='even'&&index%2===1)));
}

export interface BackgroundAppearance {bg:string;bgColor?:string;bgMargin?:string;padding:string;layers:string}
export interface AppearanceChanges {background?:{ids:string[];value:BackgroundAppearance};footer?:{ids:string[];value:FooterConfig}}
export const defaultFooter:FooterConfig={type:'lineas',logoColor:'naranja',blockColor:'naranja',logoId:1};

export function restoreBackgroundMetadata(root:HTMLElement,space:Pick<Workspace,'bg'|'bgColor'|'bgMargin'>) {
  root.dataset.bg=space.bg;
  for(const key of ['bgColor','bgMargin'] as const){
    if(space[key]!==undefined)root.dataset[key]=space[key];else delete root.dataset[key];
  }
}
export function workspaceAppearanceRoot(space:Workspace):HTMLElement {
  const root=document.createElement('div');root.innerHTML=space.html;root.style.cssText=space.style;
  restoreBackgroundMetadata(root,space);return root;
}
export function readBackground(root:HTMLElement):BackgroundAppearance {
  const wrapper=root.querySelector<HTMLElement>(':scope > .parallax-bg-wrapper');
  const copy=wrapper?.cloneNode(true) as HTMLElement|undefined;
  copy?.classList.remove('hidden');
  copy?.querySelectorAll<HTMLElement>('.parallax-layer').forEach(layer=>layer.style.removeProperty('transform'));
  const bg=root.dataset.bg||'blanco',base=root.querySelector<HTMLElement>('.bg-layer');
  // Older projects saved the layers but not these two root data attributes.
  const bgColor=root.dataset.bgColor||(bg==='imagen'?base?.style.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1]:bg==='color_solido'?base?.style.backgroundColor:undefined);
  return {bg,bgColor,bgMargin:root.dataset.bgMargin||String(parseFloat(root.style.padding)||15),padding:root.style.padding,layers:copy?.outerHTML||''};
}
export function applyBackground(root:HTMLElement,value:BackgroundAppearance) {
  restoreBackgroundMetadata(root,value);
  root.style.padding=value.padding;
  const previous=root.querySelector(':scope > .parallax-bg-wrapper');
  if(value.layers){
    const template=document.createElement('template');template.innerHTML=value.layers;
    const next=template.content.firstElementChild!;
    if(previous)previous.replaceWith(next);else root.prepend(next);
  }
}
export function readFooter(root:HTMLElement,fallback:FooterConfig=defaultFooter):FooterConfig {
  const footer=root.querySelector<HTMLElement>('.lms-footer-wrapper');
  if(!footer)return {...fallback};
  return {type:footer.dataset.footerType||fallback.type,logoId:Number(footer.dataset.footerLogo)||fallback.logoId,logoColor:footer.dataset.footerLogoColor||fallback.logoColor,blockColor:footer.dataset.footerBlockColor||fallback.blockColor};
}
export function applyFooter(root:HTMLElement,value:FooterConfig) {
  const keys=['tempFooterType','tempFooterLogo','tempFooterLogoColor','tempFooterBlockColor'];
  const previous=keys.map(key=>window[key]);
  try{
    window.tempFooterType=value.type;window.tempFooterLogo=value.logoId;
    window.tempFooterLogoColor=value.logoColor;window.tempFooterBlockColor=value.blockColor;
    root.querySelectorAll<HTMLElement>('.lms-footer-wrapper').forEach(footer=>window.applyFooterConfigBase(footer));
  }finally{keys.forEach((key,index)=>window[key]=previous[index]);}
}

export function backgroundLabel(value:BackgroundAppearance):string {
  if(value.bg==='color_solido'){
    const color=(value.bgColor||'').replaceAll(' ','').toLowerCase();
    const names:Record<string,string>={'#ff5900':'Naranja Anáhuac','rgb(255,89,0)':'Naranja Anáhuac','#5d428c':'Morado Anáhuac','rgb(93,66,140)':'Morado Anáhuac','#cdd5dc':'Gris claro','rgb(205,213,220)':'Gris claro','#646464':'Gris oscuro','rgb(100,100,100)':'Gris oscuro','#f7f7f7':'Fondo claro','rgb(247,247,247)':'Fondo claro'};
    return names[color]||'Color institucional';
  }
  return value.bg==='imagen'?'Imagen de fondo':value.bg==='blanco'?'Blanco':value.bg.replaceAll('_',' ');
}
export const footerLabel=(value:FooterConfig)=>`${value.type==='solido'?'Sólido':'Líneas'} · ${value.type==='solido'?value.blockColor:value.logoColor} · logo ${value.logoId}`;
