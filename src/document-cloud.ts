import {IMPORT_LIMITS} from './document-plan';

type Provider='google'|'microsoft';
type Item={id:string;name:string;folder?:boolean;mimeType?:string;size?:number};
const supported=(name:string)=>/\.(docx|md|markdown|txt|csv)$/i.test(name);
const googleScope='https://www.googleapis.com/auth/drive.readonly';
const googleNative='application/vnd.google-apps.document';
let googleScript:Promise<void>|undefined;

function loadGoogle(){
  if((window as any).google?.accounts?.oauth2)return Promise.resolve();
  return googleScript??=new Promise<void>((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
    const timer=setTimeout(()=>{script.remove();googleScript=undefined;reject(Error('Google no respondió. Reintenta.'));},15000);
    script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();googleScript=undefined;reject(Error('No se pudo cargar el acceso a Google.'));};document.head.append(script);
  });
}

export async function readLimitedCloudFile(response:Response,name:string):Promise<File>{
  if(!response.ok)throw Error(response.status===401?'La sesión expiró. Vuelve a conectar.':response.status===403?'No tienes permiso para descargar este documento.':response.status===429?'El proveedor alcanzó su límite. Reintenta más tarde.':'No se pudo descargar el documento.');
  if(Number(response.headers.get('content-length'))>IMPORT_LIMITS.fileBytes){await response.body?.cancel();throw Error('El documento supera 5 MB.');}
  if(!response.body)throw Error('El proveedor devolvió un archivo vacío.');
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>IMPORT_LIMITS.fileBytes){await reader.cancel();throw Error('El documento supera 5 MB.');}chunks.push(value);}}finally{reader.releaseLock();}
  return new File(chunks as BlobPart[],name,{type:response.headers.get('content-type')||'application/octet-stream'});
}

/** Credentials stay in this picker closure; provider files never pass through our server. */
export async function chooseCloudDocuments(provider:Provider):Promise<File[]>{
  const clientId=provider==='google'?import.meta.env.VITE_GOOGLE_CLIENT_ID:import.meta.env.VITE_MICROSOFT_CLIENT_ID;
  if(!clientId)throw Error(`Falta configurar ${provider==='google'?'Google Drive (VITE_GOOGLE_CLIENT_ID)':'OneDrive (VITE_MICROSOFT_CLIENT_ID)'}. Puedes arrastrar un archivo desde tu PC mientras se configura el acceso.`);
  const modal=document.createElement('dialog');modal.className='document-import-dialog document-cloud-dialog';modal.setAttribute('aria-label',`Seleccionar desde ${provider==='google'?'Google Drive':'OneDrive'}`);
  modal.innerHTML=`<header><h2>${provider==='google'?'Google Drive':'OneDrive'}</h2><button type="button" data-close>Cancelar</button></header><p>Conecta tu cuenta para leer y seleccionar documentos. No modificaremos tus archivos ni los enviaremos a Gemini.</p><p>${provider==='google'?'Google solicitará permiso de lectura de Drive. Se mostrarán documentos compatibles; Google Docs se exporta a Word.':'Microsoft solicitará Files.Read. Puedes navegar por las carpetas de tu OneDrive y elegir DOCX, Markdown, TXT o CSV.'}</p><button type="button" data-connect>Conectar y autorizar</button><div data-browser hidden><div class="doc-actions"><button type="button" data-up>Carpeta anterior</button><label>Buscar por nombre <input type="search" data-search maxlength="100"></label><button type="button" data-find>Buscar</button></div><div data-items></div><button type="button" data-more hidden>Más archivos</button><p data-selected></p><button type="button" data-use disabled>Usar archivos seleccionados</button></div><p class="doc-status" role="status" aria-live="polite">Preparando conexión…</p>`;
  document.body.append(modal);modal.showModal();
  const q=<T extends HTMLElement>(selector:string)=>modal.querySelector<T>(selector)!;
  let token='',closed=false,msal:any,folder='root',next='',busy=false;const parents:string[]=[];const selected=new Map<string,Item>();const abort=new AbortController();
  const status=q('.doc-status');
  const authHeaders=()=>({Authorization:`Bearer ${token}`});
  const api=async(url:string)=>{
    const expected=provider==='google'?'https://www.googleapis.com/drive/v3/':'https://graph.microsoft.com/v1.0/';
    if(!url.startsWith(expected))throw Error('Respuesta del proveedor no válida.');
    const response=await fetch(url,{headers:authHeaders(),signal:abort.signal,credentials:'omit',referrerPolicy:'no-referrer'});
    if(!response.ok)throw Error(response.status===401?'La sesión expiró. Cierra y vuelve a conectar.':response.status===403?'Tu cuenta o administrador no permite este acceso.':response.status===429?'El proveedor alcanzó su cuota. Intenta más tarde.':'No se pudo consultar la nube.');
    return response.json();
  };
  const setBusy=(value:boolean)=>{busy=value;modal.setAttribute('aria-busy',String(value));q<HTMLButtonElement>('[data-use]').disabled=value||!selected.size;q<HTMLButtonElement>('[data-find]').disabled=value;q<HTMLButtonElement>('[data-up]').disabled=value||!parents.length;q<HTMLButtonElement>('[data-more]').disabled=value;};
  const renderItems=(items:Item[],append:boolean)=>{
    if(!append)q('[data-items]').replaceChildren();
    items.forEach(item=>{
      const row=document.createElement('div');row.className='doc-cloud-item';
      if(item.folder){const button=document.createElement('button');button.type='button';button.textContent=`📁 ${item.name}`;button.onclick=()=>{if(!busy){parents.push(folder);folder=item.id;q<HTMLInputElement>('[data-search]').value='';void list(false);}};row.append(button);}
      else{const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.checked=selected.has(item.id);check.disabled=!!item.size&&item.size>IMPORT_LIMITS.fileBytes;label.append(check,document.createTextNode(` ${item.name}${check.disabled?' — supera 5 MB':''}`));check.onchange=()=>{if(check.checked&&selected.size>=5){check.checked=false;status.textContent='Puedes elegir hasta 5 archivos.';return;}if(check.checked)selected.set(item.id,item);else selected.delete(item.id);q('[data-selected]').textContent=`${selected.size} archivos seleccionados`;q<HTMLButtonElement>('[data-use]').disabled=busy||!selected.size;};row.append(label);}
      q('[data-items]').append(row);
    });
  };
  const list=async(more:boolean)=>{
    if(closed)return;setBusy(true);status.textContent='Consultando documentos…';
    try{
      const search=q<HTMLInputElement>('[data-search]').value.trim();let items:Item[];
      if(provider==='google'){
        const escaped=search.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        const query=`trashed=false and mimeType!='application/vnd.google-apps.folder'${search?` and name contains '${escaped}'`:''}`;
        const params=new URLSearchParams({q:query,pageSize:'100',fields:'nextPageToken,files(id,name,mimeType,size)',orderBy:'modifiedTime desc'});if(more&&next)params.set('pageToken',next);
        const result=await api('https://www.googleapis.com/drive/v3/files?'+params);next=result.nextPageToken||'';items=(result.files||[]).filter((f:any)=>f.mimeType===googleNative||supported(f.name)).map((f:any)=>({...f,size:Number(f.size)||undefined}));
      }else{
        const base='https://graph.microsoft.com/v1.0/me/drive/';
        const path=search?`root/search(q='${encodeURIComponent(search.replace(/'/g,"''"))}')`:(folder==='root'?'root/children':`items/${encodeURIComponent(folder)}/children`);
        const result=await api(more&&next?next:base+path+'?$select=id,name,size,folder,file&$top=100');next=result['@odata.nextLink']||'';items=(result.value||[]).filter((f:any)=>f.folder||supported(f.name)).map((f:any)=>({...f,folder:!!f.folder}));
      }
      if(closed)return;renderItems(items,more);q('[data-more]').hidden=!next;status.textContent=items.length?'Selecciona los documentos que deseas transformar.':'Sin archivos compatibles en esta página. Prueba otra búsqueda o pulsa Más archivos si está disponible.';
    }catch(error){if(!closed)status.textContent=(error as Error).message;}finally{if(!closed)setBusy(false);}
  };
  q('[data-find]').onclick=()=>{if(!busy)void list(false);};q('[data-more]').onclick=()=>{if(!busy)void list(true);};q('[data-up]').onclick=()=>{if(!busy&&parents.length){folder=parents.pop()!;void list(false);}};
  return new Promise<File[]>((resolve)=>{
    const finish=(files:File[])=>{if(closed)return;closed=true;abort.abort();token='';selected.clear();void msal?.clearCache();modal.close();modal.remove();resolve(files);};
    modal.addEventListener('cancel',event=>{event.preventDefault();finish([]);});q('[data-close]').onclick=()=>finish([]);
    q('[data-connect]').onclick=async()=>{
      q<HTMLButtonElement>('[data-connect]').disabled=true;status.textContent='Completa el inicio de sesión en la ventana del proveedor.';
      try{
        if(provider==='google'){
          const google=(window as any).google;
          token=await new Promise<string>((resolveToken,reject)=>{const client=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:googleScope,callback:(result:any)=>result.error||!result.access_token?reject(Error('Google no autorizó la lectura.')):resolveToken(result.access_token),error_callback:()=>reject(Error('Se canceló o bloqueó la ventana de Google.'))});client.requestAccessToken({prompt:'consent'});});
        }else{
          const result=await msal.acquireTokenPopup({scopes:['Files.Read'],prompt:'select_account'});token=result.accessToken;
        }
        if(closed){token='';void msal?.clearCache();return;}
        q('[data-connect]').hidden=true;q('[data-browser]').hidden=false;await list(false);
      }catch{if(!closed){status.textContent='No se completó la autorización. Revisa ventanas emergentes, configuración OAuth y permisos de tu organización.';q<HTMLButtonElement>('[data-connect]').disabled=false;}}
    };
    q('[data-use]').onclick=async()=>{
      if(busy||!selected.size)return;setBusy(true);status.textContent='Descargando los archivos seleccionados…';
      try{
        const files:File[]=[];let total=0;
        for(const item of [...selected.values()]){
          let response:Response,name=item.name;
          if(provider==='google'){
            const base=`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.id)}`;
            const native=item.mimeType===googleNative;
            if(native)name=name.replace(/\.docx$/i,'')+'.docx';
            const url=native?base+'/export?mimeType='+encodeURIComponent('application/vnd.openxmlformats-officedocument.wordprocessingml.document'):base+'?alt=media';
            response=await fetch(url,{headers:authHeaders(),signal:abort.signal,credentials:'omit',referrerPolicy:'no-referrer'});
          }else{
            const metadata=await api(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(item.id)}?$select=id,name,@microsoft.graph.downloadUrl`);
            const url=new URL(metadata['@microsoft.graph.downloadUrl']);if(url.protocol!=='https:')throw Error('Enlace de descarga inválido.');
            // Graph's preauthenticated download URL must not receive the access token.
            response=await fetch(url.href,{signal:abort.signal,credentials:'omit',referrerPolicy:'no-referrer'});
          }
          files.push(await readLimitedCloudFile(response,name));total+=files.at(-1)!.size;if(total>IMPORT_LIMITS.totalBytes)throw Error('La selección supera 12 MB. Elige menos documentos.');
        }
        finish(files);
      }catch(error){if(!closed){status.textContent=error instanceof TypeError?'No se pudo descargar desde la nube. Revisa tu conexión y los permisos.':(error as Error).message;setBusy(false);}}
    };
    q<HTMLButtonElement>('[data-connect]').disabled=true;
    void(async()=>{
      try{
        if(provider==='google')await loadGoogle();
        else{const {PublicClientApplication}=await import('@azure/msal-browser');msal=new PublicClientApplication({auth:{clientId,authority:`https://login.microsoftonline.com/${import.meta.env.VITE_MICROSOFT_TENANT_ID||'common'}`,redirectUri:new URL('oauth-callback.html',new URL(import.meta.env.BASE_URL,location.href)).href},cache:{cacheLocation:'memoryStorage'},system:{loggerOptions:{piiLoggingEnabled:false,loggerCallback:()=>{}}}});await msal.initialize();}
        if(!closed){q<HTMLButtonElement>('[data-connect]').disabled=false;status.textContent='Pulsa Conectar y autorizar para elegir tu cuenta.';}
      }catch{if(!closed)status.textContent='No se pudo preparar la conexión. Revisa la configuración y tu conexión a Internet.';}
    })();
  });
}
