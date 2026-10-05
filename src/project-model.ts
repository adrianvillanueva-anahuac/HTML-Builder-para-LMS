export interface Workspace { id: string; name: string; html: string; bg: string; style: string }
export const projectNameFromFile = (filename: string) => filename.replace(/\.(lmsproject|json)$/i, '');
// Never derive a new page from the live canvas: it may already contain a project.
export function emptyWorkspace(): Workspace {
  return {id:'',name:'',bg:'blanco',style:'width:100%;max-width:850px;min-height:80vh;',html:
    '<div class="absolute inset-0 overflow-hidden pointer-events-none parallax-bg-wrapper" style="border-radius:inherit;z-index:-1"><div class="parallax-layer bg-layer" style="background-color:#f3f4f6"></div><div class="parallax-layer layer-1" data-speed="0.05"></div><div class="parallax-layer layer-2" data-speed="0.10"></div><div class="parallax-layer layer-3" data-speed="0.15"></div></div><div id="canvas" class="lms-dropzone relative w-full flex-1 min-h-[60vh] border-2 border-dashed border-[#cdd5dc] bg-transparent rounded-lg p-2 pb-2 z-10"><div class="text-center mt-12 pointer-events-none" id="empty-state" aria-hidden="true"><h3>Arrastra plantillas o elementos aquí</h3></div></div><div id="canvas-placeholder" class="absolute inset-0 flex items-center justify-center pointer-events-none z-20 transition-opacity duration-300"><div class="bg-white/80 backdrop-blur-sm rounded-2xl p-10 text-center flex flex-col items-center justify-center m-4 max-w-md w-full mx-auto shadow-md"><div class="w-16 h-16 bg-[#f7f7f7] rounded-full flex items-center justify-center mb-4 text-[#cdd5dc] shadow-inner"><span class="material-symbols-outlined text-4xl">add_to_queue</span></div><p class="text-[#646464] font-bold text-xl font-serif mb-2">Usa Google Chrome</p><p class="text-[#646464]/70 text-[15px] font-sans">Arrastra una plantilla desde el menú lateral para comenzar a diseñar tu página.</p></div></div>'};
}
export interface Project { format: 'lms-builder-project'; version: 1; name: string; activeId: string; spaces: Workspace[] }
export function parseProject(text: string): Project {
  const p = JSON.parse(text);
  if (p?.format !== 'lms-builder-project' || p.version !== 1 || typeof p.name !== 'string' || !Array.isArray(p.spaces) || !p.spaces.length)
    throw new Error('El archivo no es un proyecto compatible del Builder.');
  const ids = new Set<string>();
  for (const s of p.spaces) {
    if (!s || ['id','name','html','bg','style'].some(k => typeof s[k] !== 'string') || !s.id || !s.name.trim() || ids.has(s.id))
      throw new Error('El proyecto contiene espacios inválidos o duplicados.');
    ids.add(s.id);
  }
  if (!ids.has(p.activeId)) throw new Error('El espacio activo del proyecto no existe.');
  return p;
}
// Navigating between spaces does not alter authored content.
export const projectContent = (p: Project) => JSON.stringify({format:p.format,version:p.version,name:p.name,spaces:p.spaces});
