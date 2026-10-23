import {buttonQuickIcons,iconCatalog,iconDisplayName} from './icon-catalog';
import {materialIconSVG} from './material-icon-vectors';

const searchable=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('_',' ').toLowerCase();

// A native child dialog stays above its native parent without changing any live
// editor target. A selection is only a draft until the text dialog is accepted.
export function iconCatalogDialog(current:string):Promise<string|null> {
  return new Promise(resolve=>{
    const previous=document.activeElement as HTMLElement|null;
    const dialog=document.createElement('dialog');dialog.className='exercise-settings project-prompt ib-dialog ib-icon-catalog-dialog';
    dialog.setAttribute('aria-labelledby','ib-icon-catalog-title');
    dialog.innerHTML='<form method="dialog"><h2 id="ib-icon-catalog-title">Catálogo completo de iconos</h2><label class="ib-icon-search-field">Buscar icono<input type="search" placeholder="Nombre o categoría" aria-label="Buscar icono"></label><p class="ib-icon-catalog-current"></p><div class="ib-icon-catalog-scroll"></div><p class="ib-icon-catalog-empty" role="status" hidden>No hay iconos que coincidan con tu búsqueda.</p><div class="exercise-dialog-actions"><button value="cancel" formnovalidate>Cancelar</button></div></form>';
    const scroll=dialog.querySelector<HTMLElement>('.ib-icon-catalog-scroll')!,search=dialog.querySelector<HTMLInputElement>('input')!;
    dialog.querySelector('form')!.onsubmit=event=>event.preventDefault();
    const cancel=dialog.querySelector<HTMLButtonElement>('button[value=cancel]')!;cancel.type='button';cancel.onclick=()=>dialog.close('cancel');
    dialog.querySelector('.ib-icon-catalog-current')!.textContent=`Icono actual: ${iconDisplayName(current)}`;
    let selected:string|null=null;
    const groups:[string,readonly (readonly [string,string])[]][]=[['Botones y navegación',buttonQuickIcons],...Object.entries(iconCatalog).map(([category,icons])=>[category,icons.map(name=>[name,iconDisplayName(name)] as const)] as [string,readonly (readonly [string,string])[]])];
    for(const [category,icons] of groups){
      const section=document.createElement('section');section.className='ib-icon-category';
      const heading=document.createElement('h3');heading.textContent=category;
      const grid=document.createElement('div');grid.className='ib-icon-catalog-grid';grid.setAttribute('role','group');grid.setAttribute('aria-label',category);
      for(const [name,label] of icons){
        const button=document.createElement('button');button.type='button';button.className='ib-catalog-icon';button.dataset.icon=name;
        button.dataset.search=searchable(`${category} ${name} ${label}`);button.title=label;
        button.setAttribute('aria-label',label);button.setAttribute('aria-pressed',String(name===current));
        button.innerHTML=materialIconSVG(name||'block',25);
        button.onclick=()=>{selected=name;dialog.close('selected');};grid.append(button);
      }
      section.append(heading,grid);scroll.append(section);
    }
    search.oninput=()=>{
      const words=searchable(search.value.trim()).split(/\s+/).filter(Boolean);let count=0;
      scroll.querySelectorAll<HTMLElement>('.ib-icon-category').forEach(section=>{
        let visible=0;
        section.querySelectorAll<HTMLElement>('.ib-catalog-icon').forEach(button=>{button.hidden=!words.every(word=>button.dataset.search!.includes(word));if(!button.hidden)visible++;});
        section.hidden=visible===0;count+=visible;
      });
      dialog.querySelector<HTMLElement>('.ib-icon-catalog-empty')!.hidden=count>0;
    };
    dialog.addEventListener('close',()=>{
      const result=dialog.returnValue==='selected'?selected:null;
      dialog.remove();previous?.isConnected&&previous.focus({preventScroll:true});resolve(result);
    },{once:true});
    document.body.append(dialog);dialog.showModal();search.focus({preventScroll:true});
  });
}
