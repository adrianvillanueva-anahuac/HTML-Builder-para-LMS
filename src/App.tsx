import { useEffect, useState, useRef, memo } from 'react';
import Sortable from 'sortablejs';
import { setupVanillaGlobals, upgradeTitleImageElements } from './vanilla-setup';
import { TUTORIAL_TOPICS, startTutorial, type TutorialTopicId } from './tutorial';

const GITHUB_REPOSITORY = 'adrianvillanueva-anahuac/HTML-Builder-para-LMS';
const GITHUB_IMAGES_API_URL = `https://api.github.com/repos/${GITHUB_REPOSITORY}/contents/public/imagenes`;
const LOCAL_IMAGES_URL = `${import.meta.env.BASE_URL}imagenes`;
const ASSET_CACHE_PREFIX = 'html_builder_para_lms';

const TIPS = [
  "Consejo: Arrastra y suelta componentes desde la barra lateral izquierda.",
  "Consejo: Haz doble clic en cualquier texto para editarlo directamente.",
  "Consejo: Haz doble clic en el footer para cambiar su diseño y logotipo.",
  "Consejo: Usa el botón 'Exportar HTML' cuando hayas terminado tu diseño.",
  "Consejo: Desde el menú lateral puedes agregar iconos de Material Symbols.",
  "Consejo: Cambia el fondo de los elementos principales usando el botón de 'Fondo'.",
  "Consejo: Elimina cualquier bloque seleccionando el botón rojo de bote de basura.",
  "Consejo: Arrastra un elemento desde la agarradera (icono de puntos) para reordenarlo."
];

// Memoized Canvas component to prevent React re-renders from wiping the DOM
const EditorCanvas = memo(() => {
  console.log("EditorCanvas rendering!");
  return (
    <div className="relative flex-1 flex flex-col justify-start parallax-container ring-1 ring-gray-900/5 dark:ring-white/10 mx-auto" id="canvas-container-outer" data-bg="blanco" data-tour="canvas">
      <div className="absolute inset-0 overflow-hidden pointer-events-none parallax-bg-wrapper" style={{ borderRadius: 'inherit', zIndex: -1 }}>
        <div className="parallax-layer bg-layer" style={{ backgroundColor: '#f3f4f6' }}></div>
        <div className="parallax-layer layer-1" data-speed="0.05"></div>
        <div className="parallax-layer layer-2" data-speed="0.10"></div>
        <div className="parallax-layer layer-3" data-speed="0.15"></div>
      </div>

      <div 
          id="canvas" 
          className="lms-dropzone relative w-full flex-1 min-h-[60vh] border-2 border-dashed border-[#cdd5dc] bg-transparent rounded-lg p-2 pb-2 z-10 transition-all duration-300" 
      >
      </div>
      
      <div id="canvas-placeholder" className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 transition-opacity duration-300">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-10 text-center flex flex-col items-center justify-center m-4 max-w-md w-full mx-auto shadow-md">
              <div className="w-16 h-16 bg-[#f7f7f7] rounded-full flex items-center justify-center mb-4 text-[#cdd5dc] shadow-inner">
                <span className="material-symbols-outlined text-4xl">add_to_queue</span>
              </div>
              <p className="text-[#646464] font-bold text-xl font-serif mb-2">Usa Google Chrome</p>
              <p className="text-[#646464]/70 text-[15px] font-sans">Arrastra una plantilla desde el menú lateral para comenzar a diseñar tu página.</p>
          </div>
      </div>
    </div>
  );
});

EditorCanvas.displayName = 'EditorCanvas';


export interface FooterLogo {
    id: string;
    url: string;
    preserveColors?: boolean;
}

const LOCAL_COLLABORATION_LOGO: FooterLogo = {
    id: '6',
    url: `${LOCAL_IMAGES_URL}/Logotipos/logo6.png`,
    preserveColors: true
};

const includeLocalFooterLogos = (logos: FooterLogo[]): FooterLogo[] => {
    const normalized: FooterLogo[] = logos.map(logo => ({
        ...logo,
        preserveColors: logo.id === '6' || logo.preserveColors
    }));
    if (!normalized.some(logo => logo.id === LOCAL_COLLABORATION_LOGO.id)) {
        normalized.push(LOCAL_COLLABORATION_LOGO);
    }
    return normalized.sort((a, b) => Number(a.id) - Number(b.id));
};

const TipOfTheDay = memo(() => {
    const [currentTipIndex, setCurrentTipIndex] = useState(0);
    
    useEffect(() => {
      // Rotar consejos cada 1 minuto (60000ms)
      const interval = setInterval(() => {
        setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
      }, 60000);
      return () => clearInterval(interval);
    }, []);

    return (
        <div className="text-gray-600 dark:text-gray-300 text-[11px] flex items-center gap-2 font-medium bg-orange-50 dark:bg-gray-700 border border-orange-100 dark:border-gray-600 py-2 pr-4 pl-[14px] mr-7 rounded-lg">
            <span className="material-symbols-outlined text-anahuac-orange text-[20px]">lightbulb</span>
            {TIPS[currentTipIndex]}
        </div>
    );
});

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [previewMode, setPreviewMode] = useState<'lms' | 'mobile_v' | 'mobile_h' | 'custom' | 'fullscreen'>('lms');
  const [customWidth, setCustomWidth] = useState<number>(600);
  const [showPreviewMenu, setShowPreviewMenu] = useState(false);
  const [showTutorialMenu, setShowTutorialMenu] = useState(false);
  const [footerLogos, setFooterLogos] = useState<FooterLogo[]>([]);
  const [bgImages, setBgImages] = useState<{name: string, url: string}[]>([]);
  const [titleBgImages, setTitleBgImages] = useState<{name: string, url: string}[]>([]);
  const [user, setUser] = useState<any | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
  }, []);

  useEffect(() => {
    // Fetch logs from github
    const fetchLogos = async () => {
        try {
            const cached = localStorage.getItem(`${ASSET_CACHE_PREFIX}_footer_logos`);
            const cacheTime = localStorage.getItem(`${ASSET_CACHE_PREFIX}_footer_logos_time`);
            if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 1000 * 60 * 60) {
                const logos = includeLocalFooterLogos(JSON.parse(cached));
                setFooterLogos(logos);
                (window as any).footerLogoUrls = logos.reduce((acc: any, curr: FooterLogo) => { acc[curr.id] = curr.url; return acc; }, {});
                return;
            }

            const res = await fetch(`${GITHUB_IMAGES_API_URL}/Logotipos`);
            const data = await res.json();
            if (Array.isArray(data)) {
                const imageFiles = data.filter((f: any) => f.type === 'file' && f.name.match(/\.(png|svg|jpg)$/i)).sort((a:any, b:any) => a.name.localeCompare(b.name));
                const logos = includeLocalFooterLogos(imageFiles.map((f: any, i: number) => {
                    // try to extract number if logo1.png, logo2.png
                    const m = f.name.match(/\d+/);
                    const id = m ? m[0] : (i+1).toString();
                    return { id, url: f.download_url, preserveColors: id === '6' };
                }));
                setFooterLogos(logos);
                (window as any).footerLogoUrls = logos.reduce((acc: any, curr: FooterLogo) => { acc[curr.id] = curr.url; return acc; }, {});
                
                localStorage.setItem(`${ASSET_CACHE_PREFIX}_footer_logos`, JSON.stringify(logos));
                localStorage.setItem(`${ASSET_CACHE_PREFIX}_footer_logos_time`, Date.now().toString());
            } else {
                const logos = includeLocalFooterLogos([]);
                setFooterLogos(logos);
                (window as any).footerLogoUrls = logos.reduce((acc: any, curr: FooterLogo) => { acc[curr.id] = curr.url; return acc; }, {});
            }
        } catch (err) {
            console.error("Error fetching logos", err);
            const logos = includeLocalFooterLogos([]);
            setFooterLogos(logos);
            (window as any).footerLogoUrls = logos.reduce((acc: any, curr: FooterLogo) => { acc[curr.id] = curr.url; return acc; }, {});
        }
    };
    fetchLogos();

    // Fetch backgrounds from github and local
    const fetchBgs = async () => {
        let githubBgs = [];
        try {
            const cached = localStorage.getItem(`${ASSET_CACHE_PREFIX}_bg_images`);
            const cacheTime = localStorage.getItem(`${ASSET_CACHE_PREFIX}_bg_images_time`);
            // Cache muy reducido a 1 minuto para ver actualizaciones casi instantáneas
            if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 1000 * 60 * 1) {
                githubBgs = JSON.parse(cached);
            } else {
                const res = await fetch(`${GITHUB_IMAGES_API_URL}/fondos`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    const imageFiles = data.filter((f: any) => f.type === 'file' && f.name.match(/\.(png|svg|jpg|jpeg|webp)$/i)).sort((a:any, b:any) => a.name.localeCompare(b.name));
                    githubBgs = imageFiles.map((f: any) => { 
                        let cleanName = f.name.replace(/\.[^/.]+$/, "");
                        cleanName = cleanName.replace(/([a-zA-Z])(\d)/g, '$1 $2');
                        cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                        return { name: cleanName, url: f.download_url };
                    });
                    localStorage.setItem(`${ASSET_CACHE_PREFIX}_bg_images`, JSON.stringify(githubBgs));
                    localStorage.setItem(`${ASSET_CACHE_PREFIX}_bg_images_time`, Date.now().toString());
                }
            }
        } catch (err) {
            console.error("Error fetching bgs from github API:", err);
        }

        // Búsqueda local secuencial para fondos añadidos manualmente (sin GitHub) o si Github API falla
        const localBgs = [];
        let index = 1;
        let found = true;
        while(found && index <= 30) {
            try {
                const url = `${LOCAL_IMAGES_URL}/fondos/fondo${index}.jpg`;
                const res = await fetch(url, { method: 'HEAD' });
                if (res.ok) {
                    localBgs.push({ name: `Fondo ${index}`, url });
                    index++;
                } else {
                    found = false;
                }
            } catch (e) {
                found = false;
            }
        }

        // Combinar y eliminar duplicados por nombre
        const combined = [...localBgs, ...githubBgs];
        const uniqueBgs = Array.from(new Map(combined.map(item => [item.name, item])).values());
        
        if (uniqueBgs.length > 0) {
            setBgImages(uniqueBgs.sort((a,b) => a.name.localeCompare(b.name)));
        } else {
            setBgImages([
                { name: 'Fondo 1', url: `${LOCAL_IMAGES_URL}/fondos/fondo1.jpg`}
            ]);
        }
    };
    fetchBgs();

    // Los fondos de títulos se descubren desde una carpeta dedicada. Al agregar
    // nuevas imágenes en GitHub, el selector se actualiza sin cambios de código.
    const fetchTitleBgs = async () => {
        const localDefault = {
            name: 'Fondo naranja escolar',
            url: `${LOCAL_IMAGES_URL}/titulos/Fondo_naranja_escolar.png`
        };
        let githubTitleBgs: {name: string, url: string}[] = [];

        try {
            const cached = localStorage.getItem(`${ASSET_CACHE_PREFIX}_title_bg_images`);
            const cacheTime = localStorage.getItem(`${ASSET_CACHE_PREFIX}_title_bg_images_time`);
            if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 1000 * 60) {
                githubTitleBgs = JSON.parse(cached);
            } else {
                const res = await fetch(`${GITHUB_IMAGES_API_URL}/titulos`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    githubTitleBgs = data
                        .filter((file: any) => file.type === 'file' && file.name.match(/\.(png|svg|jpg|jpeg|webp)$/i))
                        .sort((a: any, b: any) => a.name.localeCompare(b.name))
                        .map((file: any) => {
                            const cleanName = file.name
                                .replace(/\.[^/.]+$/, '')
                                .replace(/[_-]+/g, ' ')
                                .replace(/^./, (letter: string) => letter.toUpperCase());
                            return { name: cleanName, url: file.download_url };
                        });
                    localStorage.setItem(`${ASSET_CACHE_PREFIX}_title_bg_images`, JSON.stringify(githubTitleBgs));
                    localStorage.setItem(`${ASSET_CACHE_PREFIX}_title_bg_images_time`, Date.now().toString());
                }
            }
        } catch (err) {
            console.error('Error fetching title backgrounds from GitHub API:', err);
        }

        const combined = [...githubTitleBgs, localDefault];
        const unique = Array.from(new Map(combined.map(item => [item.name.toLowerCase(), item])).values());
        setTitleBgImages(unique);
    };
    fetchTitleBgs();
  }, []);

  useEffect(() => {
    const outer = document.getElementById('canvas-container-outer');
    if (!outer) return;

    // Control de desbordamiento (word-wrap / overflow-wrap)
    outer.style.wordWrap = 'break-word';
    outer.style.overflowWrap = 'break-word';

    // Reset de clases de layout y sombras
    outer.classList.remove('fixed', 'inset-0', 'z-[100]', 'max-w-none', 'overflow-y-auto', 'bg-white', 'dark:bg-[#323232]');
    outer.classList.add('relative', 'mt-4', 'mb-16', 'shadow-xl');
    
    // Alto ajustado dinámicamente
    outer.style.height = 'auto';

    if (previewMode === 'fullscreen') {
        outer.classList.add('fixed', 'inset-0', 'z-[100]', 'max-w-none', 'overflow-y-auto', 'bg-white', 'dark:bg-[#323232]');
        outer.classList.remove('relative', 'mt-4', 'mb-16', 'shadow-xl');
        outer.style.width = '100%';
        outer.style.maxWidth = '100%';
        outer.style.minWidth = '100%';
        outer.style.minHeight = '100vh';
    } else if (previewMode === 'lms') {
        outer.style.width = '100%';
        outer.style.maxWidth = '850px';
        outer.style.minWidth = '520px';
        outer.style.minHeight = '80vh';
    } else if (previewMode === 'mobile_v') {
        outer.style.width = '375px';
        outer.style.maxWidth = '375px';
        outer.style.minWidth = '375px';
        outer.style.minHeight = '812px';
    } else if (previewMode === 'mobile_h') {
        outer.style.width = '812px';
        outer.style.maxWidth = '812px';
        outer.style.minWidth = '812px';
        outer.style.minHeight = '375px';
    } else if (previewMode === 'custom') {
        outer.style.width = `${customWidth}px`;
        outer.style.maxWidth = '850px';
        outer.style.minWidth = '420px';
        outer.style.minHeight = '80vh';
    }
    
    // Transición fluida
    outer.style.transition = 'width 0.3s ease, max-width 0.3s ease, min-width 0.3s ease';
  }, [previewMode, customWidth]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && previewMode === 'fullscreen') {
            setPreviewMode('lms');
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewMode]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (window.updateHistoryButtons) window.updateHistoryButtons();
    upgradeTitleImageElements();
    setFooterLogos(currentLogos => {
      if (currentLogos.some(logo => logo.id === LOCAL_COLLABORATION_LOGO.id)) return currentLogos;
      const logos = includeLocalFooterLogos(currentLogos);
      (window as any).footerLogoUrls = logos.reduce((acc: any, curr: FooterLogo) => { acc[curr.id] = curr.url; return acc; }, {});
      return logos;
    });
  });

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // 1. Iniciar Globales y Funciones
    setupVanillaGlobals();

    const canvas = document.getElementById('canvas');
    
    // Set initial canvas content if empty
    if (canvas && canvas.children.length === 0) {
        canvas.innerHTML = '<div class="text-center mt-12 pointer-events-none" id="empty-state"><h3 class="text-xl text-gray-400 font-bold">Arrastra plantillas o elementos aquí</h3></div>';
    }

    // 2. Iniciar Catálogos Sortable (Menú lateral)
    const catOpts = { 
        group: { name: 'shared', pull: 'clone', put: false }, 
        animation: 150, 
        sort: false,
        forceFallback: true,
        fallbackOnBody: true,
        fallbackTolerance: 3,
        ghostClass: 'ghost-element',
        dragClass: 'drag-item',
        onStart: (evt: any) => {
            document.body.classList.add('is-dragging');
            if (window.lmsOnSortableStart) window.lmsOnSortableStart(evt);
        },
        onEnd: (evt: any) => {
            document.body.classList.remove('is-dragging');
            if (window.lmsOnSortableEnd) window.lmsOnSortableEnd(evt);
        },
        onMove: (evt: any, originalEvent: MouseEvent) => window.lmsOnSortableMove && window.lmsOnSortableMove(evt, originalEvent)
    };
    const catalogPages = document.getElementById('catalog-pages');
    if (catalogPages) new Sortable(catalogPages, catOpts as any);
    
    document.querySelectorAll('.catalog-list').forEach(el => new Sortable(el as HTMLElement, catOpts as any));
    
    const catalogContainers = document.getElementById('catalog-containers');
    if (catalogContainers) new Sortable(catalogContainers, catOpts as any);

    // 3. Iniciar Zonas de Drop
    window.initNestedDropzones();

    // 4. Iniciar Íconos de Google en el Modal
    const gridContainer = document.getElementById('icon-grid');
    const googleIconsByCategory = {
        "Referencias y Recursos": ['play_circle', 'menu_book', 'devices', 'article', 'language', 'description', 'book', 'public', 'web', 'smart_display'],
        "Educación y Aprendizaje": ['school', 'menu_book', 'article', 'assignment', 'quiz', 'library_books', 'history_edu', 'science', 'psychology', 'import_contacts', 'workspace_premium', 'calculate', 'draw', 'functions'],
        "Alertas y Estados": ['warning', 'error', 'check_circle', 'info', 'help_center', 'new_releases', 'priority_high', 'task_alt', 'fact_check', 'report_problem', 'campaign', 'tips_and_updates', 'verified', 'block'],
        "Comunicación": ['chat', 'forum', 'mail', 'support_agent', 'perm_phone_msg', 'contact_mail', 'question_answer', 'alternate_email', 'speaker_notes', 'record_voice_over'],
        "Media y Multimedia": ['play_circle', 'videocam', 'image', 'mic', 'headset', 'movie', 'photo_camera', 'headphones', 'volume_up', 'volume_off', 'palette', 'music_note', 'collections', 'art_track'],
        "Acciones e Interactividad": ['ads_click', 'touch_app', 'mouse', 'pan_tool_alt', 'drag_indicator', 'swipe', 'pinch', 'open_in_new', 'search', 'settings', 'build', 'download', 'cloud_download', 'upload', 'edit', 'delete', 'share', 'reply', 'save', 'filter_alt'],
        "General y Varios": ['lightbulb', 'star', 'flag', 'group', 'insights', 'timeline', 'table_chart', 'language', 'attach_money', 'emoji_objects', 'public', 'bolt', 'rocket_launch', 'extension', 'visibility', 'lock', 'explore', 'event'],
        "Tecnología y Dispositivos": ['laptop_mac', 'smartphone', 'computer', 'desktop_mac', 'window', 'keyboard', 'memory', 'sd_card', 'cast', 'print', 'developer_mode', 'devices']
    };

    if (gridContainer && gridContainer.children.length === 0) {
        Object.entries(googleIconsByCategory).forEach(([category, icons]) => {
            const catDiv = document.createElement('div');
            const title = document.createElement('h3');
            title.className = "text-sm font-bold text-gray-500 mb-2 border-b border-gray-100 pb-1";
            title.innerText = category;
            catDiv.appendChild(title);
            
            const grid = document.createElement('div');
            grid.className = "grid grid-cols-8 gap-2";
            
            icons.forEach(icon => {
                let span = document.createElement('span');
                span.className = "material-symbols-outlined text-[32px] p-2 cursor-pointer text-anahuac-orange hover:bg-orange-50 hover:text-anahuac-purple dark:hover:bg-gray-700 dark:text-white rounded transition-colors text-center";
                span.innerText = icon;
                span.title = icon;
                span.onclick = () => { 
                    if(window.currentIconTarget) { window.currentIconTarget.innerText = icon; }
                    document.getElementById('icon-modal')?.classList.add('hidden'); 
                };
                grid.appendChild(span);
            });

            catDiv.appendChild(grid);
            gridContainer.appendChild(catDiv);
        });
    }

    // 5. Configurar eventos de texto Editable
    const handleSelectionChange = () => {
        const sel = window.getSelection(); 
        if (sel && sel.rangeCount > 0 && window.currentEditableText && window.currentEditableText.contains(sel.anchorNode)) { 
            window.lastKnownRange = sel.getRangeAt(0); 
        }
    };
    document.addEventListener('selectionchange', handleSelectionChange);

    const workspaceContainer = document.getElementById('scroll-container');
    if (workspaceContainer) {
        workspaceContainer.addEventListener('keydown', function(e) {
            let target = e.target as HTMLElement;
            let textTarget = target.closest('.editable-text') as HTMLElement; 
            if(textTarget && e.key === 'Tab') { 
                e.preventDefault(); 
                if(e.shiftKey) { document.execCommand('outdent', false, undefined); } 
                else { document.execCommand('indent', false, undefined); } 
            }
        });

        workspaceContainer.addEventListener('dblclick', function(e) {
            let target = e.target as HTMLElement;
            let textTarget = target.closest('.editable-text') as HTMLElement;
            const rtfToolbar = document.getElementById('rtf-toolbar');
            
            if(textTarget && rtfToolbar) {
                textTarget.contentEditable = "true"; 
                textTarget.focus(); 
                window.currentEditableText = textTarget;
                const rect = textTarget.getBoundingClientRect(); 
                rtfToolbar.style.top = (rect.top - 15) + 'px'; 
                rtfToolbar.style.left = (rect.left + rect.width / 2) + 'px'; 
                rtfToolbar.classList.remove('hidden');
                
                const blurHandler = (ev: Event) => { 
                    setTimeout(() => { 
                        if(!rtfToolbar.contains(document.activeElement) && document.activeElement?.id !== "rtf-image-input") { 
                            textTarget.contentEditable = "false"; 
                            rtfToolbar.classList.add('hidden'); 
                            textTarget.removeEventListener('blur', blurHandler); 
                        } else { 
                            textTarget.addEventListener('blur', blurHandler, {once:true}); 
                        } 
                    }, 100); 
                };
                textTarget.addEventListener('blur', blurHandler, {once:true});
            }
            
            let iconTarget = target.closest('.editable-icon') as HTMLElement;
            if(iconTarget) { 
                window.currentIconTarget = iconTarget; 
                document.getElementById('icon-modal')?.classList.remove('hidden'); 
            }
        });

        workspaceContainer.addEventListener('click', function(e) {
            let target = e.target as HTMLElement;
            const imgToolbar = document.getElementById('image-toolbar');
            if(target.classList.contains('editorial-image')) {
                window.selectedEditorialImage = target; 
                const rect = target.getBoundingClientRect(); 
                if(imgToolbar) {
                    imgToolbar.style.top = (rect.top - 10) + 'px'; 
                    imgToolbar.style.left = (rect.left + rect.width / 2) + 'px'; 
                    imgToolbar.classList.remove('hidden');
                }
                document.querySelectorAll('.editorial-image').forEach(img => img.classList.remove('selected-img')); 
                target.classList.add('selected-img');
            } else { 
                if(imgToolbar) imgToolbar.classList.add('hidden'); 
                document.querySelectorAll('.editorial-image').forEach(img => img.classList.remove('selected-img')); 
            }
        });

        // Imágenes Drag & Drop (Editorial)
        document.addEventListener('dragstart', function(e) { 
            let target = e.target as HTMLElement;
            if(target.classList && target.classList.contains('editorial-image')) { 
                window.draggedEditorialImage = target; 
                if(e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; 
            } 
        });
        document.addEventListener('dragend', function(e) { 
            setTimeout(() => { window.draggedEditorialImage = null; }, 50); 
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });
        workspaceContainer.addEventListener('dragover', function(e: any) { 
            let editableText = e.target.closest('.editable-text'); 
            if (editableText) { e.preventDefault(); editableText.classList.add('drag-over'); } 
        });
        workspaceContainer.addEventListener('dragleave', function(e: any) { 
            let editableText = e.target.closest('.editable-text'); 
            if (editableText) editableText.classList.remove('drag-over'); 
        });
        workspaceContainer.addEventListener('drop', function(e: any) {
            let editableText = e.target.closest('.editable-text');
            if (editableText) {
                editableText.classList.remove('drag-over');
            }
            if (window.draggedEditorialImage && editableText) {
                e.preventDefault(); let range;
                if ((document as any).caretRangeFromPoint) { 
                    range = (document as any).caretRangeFromPoint(e.clientX, e.clientY); 
                } else if ((document as any).caretPositionFromPoint) { 
                    const pos = (document as any).caretPositionFromPoint(e.clientX, e.clientY); 
                    if(pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); } 
                }
                if (range && editableText.contains(range.startContainer)) { 
                    range.insertNode(window.draggedEditorialImage); 
                    const sel = window.getSelection(); 
                    if(sel) sel.removeAllRanges(); 
                    document.getElementById('image-toolbar')?.classList.add('hidden'); 
                    document.querySelectorAll('.editorial-image').forEach(img => img.classList.remove('selected-img')); 
                }
                window.draggedEditorialImage = null; return;
            }
            if (editableText && e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                e.preventDefault(); const file = e.dataTransfer.files[0];
                if (file.type.startsWith('image/')) { 
                    const reader = new FileReader(); 
                    reader.onload = function(evt) { 
                        if(evt.target?.result) window.insertDOMImage(evt.target.result.toString(), editableText); 
                    }; 
                    reader.readAsDataURL(file); 
                }
            }
        });
    }

    return () => {
        document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const handleStartTutorial = (topicId: TutorialTopicId) => {
    setShowTutorialMenu(false);
    startTutorial(topicId);
  };

  useEffect(() => {
    if (!showTutorialMenu) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowTutorialMenu(false);
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [showTutorialMenu]);

  return (
    <div className="h-full flex font-sans text-gray-800 dark:text-gray-200 overflow-hidden relative transition-colors">
      <input type="file" id="rtf-image-input" accept="image/*" className="hidden" onChange={(e) => window.insertRTFImage(e.target)} />

      {/* BARRA FLOTANTE RICH TEXT */}
      <div id="rtf-toolbar" onMouseDown={(e) => e.preventDefault()} className="fixed hidden bg-white shadow-xl border border-gray-200 rounded-lg p-2 flex gap-1 z-50 transform -translate-x-1/2 -translate-y-full items-center flex-wrap">
          <div className="flex bg-gray-50 rounded border border-gray-100 p-1 gap-1">
              <button onClick={() => window.applyTextFormat('titulo')} className="px-2 h-7 hover:bg-white rounded text-sm text-gray-800 font-bold" style={{fontFamily: "'Zilla Slab', serif"}} title="Título">T1</button>
              <button onClick={() => window.applyTextFormat('subtitulo')} className="px-2 h-7 hover:bg-white rounded text-sm text-gray-800 font-bold" style={{fontFamily: "'Zilla Slab', serif"}} title="Subtítulo">T2</button>
              <button onClick={() => window.applyTextFormat('cuerpo')} className="px-2 h-7 hover:bg-white rounded text-sm text-gray-800" style={{fontFamily: "'Roboto', sans-serif"}} title="Cuerpo Texto">P</button>
          </div>
          <div className="w-px h-6 bg-gray-300 my-auto mx-1"></div>
          <div className="flex items-center gap-1 px-1 bg-gray-50 rounded border border-gray-100 p-1">
              <button onClick={() => document.execCommand('fontName', false, 'Zilla Slab')} className="px-2 h-7 hover:bg-white rounded text-sm text-gray-800" style={{fontFamily: "'Zilla Slab', serif"}}>Zilla</button>
              <button onClick={() => document.execCommand('fontName', false, 'Roboto')} className="px-2 h-7 hover:bg-white rounded text-sm text-gray-800" style={{fontFamily: "'Roboto', sans-serif"}}>Roboto</button>
              <button onClick={() => document.execCommand('fontName', false, 'Lato')} className="px-2 h-7 hover:bg-white rounded text-sm text-gray-800" style={{fontFamily: "'Lato', sans-serif"}}>Lato</button>
          </div>
          <div className="w-px h-6 bg-gray-300 my-auto mx-1"></div>
          <button onClick={() => document.execCommand('bold', false, undefined)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-700" title="Negrita"><span className="material-symbols-outlined text-[18px]">format_bold</span></button>
          <button onClick={() => document.execCommand('italic', false, undefined)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-700" title="Cursiva"><span className="material-symbols-outlined text-[18px]">format_italic</span></button>
          <button onClick={() => document.execCommand('underline', false, undefined)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-700" title="Subrayado"><span className="material-symbols-outlined text-[18px]">format_underlined</span></button>
          <div className="w-px h-6 bg-gray-300 my-auto mx-1"></div>
          <button onClick={() => document.execCommand('justifyLeft', false, undefined)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-700"><span className="material-symbols-outlined text-[18px]">format_align_left</span></button>
          <button onClick={() => document.execCommand('justifyCenter', false, undefined)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-700"><span className="material-symbols-outlined text-[18px]">format_align_center</span></button>
          <button onClick={() => document.execCommand('justifyRight', false, undefined)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-700"><span className="material-symbols-outlined text-[18px]">format_align_right</span></button>
          <div className="w-px h-6 bg-gray-300 my-auto mx-1"></div>
          <div className="flex gap-1.5 items-center px-2">
              <button onClick={() => document.execCommand('foreColor', false, '#ff5900')} className="w-5 h-5 rounded-full bg-[#ff5900] border border-transparent hover:ring-2 ring-offset-1 ring-[#ff5900]" title="Naranja Anáhuac"></button>
              <button onClick={() => document.execCommand('foreColor', false, '#5d428c')} className="w-5 h-5 rounded-full bg-[#5d428c] border border-transparent hover:ring-2 ring-offset-1 ring-[#5d428c]" title="Morado Anáhuac"></button>
              <button onClick={() => document.execCommand('foreColor', false, '#646464')} className="w-5 h-5 rounded-full bg-[#646464] border border-transparent hover:ring-2 ring-offset-1 ring-[#646464]" title="Gris Oscuro"></button>
              <button onClick={() => document.execCommand('foreColor', false, '#374151')} className="w-5 h-5 rounded-full bg-[#374151] border border-transparent hover:ring-2 ring-offset-1 ring-[#374151]" title="Texto Párrafo Oscuro"></button>
              <button onClick={() => document.execCommand('foreColor', false, '#f7f7f7')} className="w-5 h-5 rounded-full bg-[#f7f7f7] border border-gray-300 hover:ring-2 ring-offset-1 ring-gray-400" title="Blanco/Gris Claro"></button>
          </div>
          <div className="w-px h-6 bg-gray-300 my-auto mx-1"></div>
          <div className="relative group">
              <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-700 text-lg"><span className="material-symbols-outlined text-[18px]">format_list_bulleted</span></button>
              <div className="absolute bottom-full -left-12 opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all duration-200 delay-500 group-hover:delay-0 pb-1 z-50">
                  <div className="bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 flex gap-1 w-max items-center">
                      <button onClick={() => window.applyList('numbers')} className="w-8 h-8 hover:bg-gray-100 rounded text-anahuac-orange font-bold font-serif text-sm border border-gray-100">1.</button>
                      <button onClick={() => window.applyList('letters')} className="w-8 h-8 hover:bg-gray-100 rounded text-anahuac-orange font-bold font-serif text-sm border border-gray-100">a.</button>
                      <button onClick={() => window.applyList('disc')} className="w-8 h-8 hover:bg-gray-100 rounded text-anahuac-orange font-bold text-xl border border-gray-100">•</button>
                      <button onClick={() => window.applyList('circle')} className="w-8 h-8 hover:bg-gray-100 rounded text-anahuac-orange font-bold text-sm border border-gray-100">○</button>
                      <button onClick={() => window.applyList('triangle')} className="w-8 h-8 hover:bg-gray-100 rounded text-anahuac-orange font-bold text-xs border border-gray-100">▶</button>
                      <button onClick={() => window.applyList('plus')} className="w-8 h-8 hover:bg-gray-100 rounded text-anahuac-orange font-bold text-lg border border-gray-100">+</button>
                      <button onClick={() => window.applyList('minus')} className="w-8 h-8 hover:bg-gray-100 rounded text-anahuac-orange font-bold text-lg border border-gray-100">-</button>
                      <div className="w-px h-6 bg-gray-300 my-auto mx-1"></div>
                      <button onClick={() => window.applyListColor('list-color-orange')} className="w-5 h-5 rounded-full bg-[#ff5900] border border-transparent hover:ring-2 ring-offset-1 ring-[#ff5900]" title="Viñetas Naranjas"></button>
                      <button onClick={() => window.applyListColor('list-color-purple')} className="w-5 h-5 rounded-full bg-[#5d428c] border border-transparent hover:ring-2 ring-offset-1 ring-[#5d428c]" title="Viñetas Moradas"></button>
                      <button onClick={() => window.applyListColor('list-color-gray')} className="w-5 h-5 rounded-full bg-[#646464] border border-transparent hover:ring-2 ring-offset-1 ring-[#646464]" title="Viñetas Grises"></button>
                  </div>
              </div>
          </div>
          <div className="w-px h-6 bg-gray-300 my-auto mx-1"></div>
          <button onClick={() => {
              document.execCommand('insertHTML', false, '&nbsp;<span class="material-symbols-outlined editable-icon inline-block align-middle cursor-pointer hover:bg-gray-100 rounded text-anahuac-orange text-[32px] p-1" contenteditable="false" title="Haz doble clic para cambiar icono">star</span>&nbsp;');
          }} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-700 text-lg" title="Insertar Ícono Embebido"><span className="material-symbols-outlined text-[18px]">add_reaction</span></button>
          <button onClick={() => window.triggerRtfImageClick()} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-700 text-lg" title="Insertar Imagen Editorial"><span className="material-symbols-outlined text-[18px]">image</span></button>
      </div>

      {/* BARRA FLOTANTE IMÁGENES */}
      <div id="image-toolbar" onMouseDown={(e) => e.preventDefault()} className="fixed hidden bg-white shadow-xl border border-gray-200 rounded-lg p-2 flex gap-1 z-50 transform -translate-x-1/2 -translate-y-full items-center pointer-events-auto">
          <div className="flex bg-gray-50 rounded border border-gray-100 p-1">
              <button onClick={() => window.setImageStyle('left')} className="px-2 h-7 hover:bg-white rounded text-xs font-bold text-gray-600 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">format_align_left</span></button>
              <button onClick={() => window.setImageStyle('center')} className="px-2 h-7 hover:bg-white rounded text-xs font-bold text-gray-600 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">format_align_center</span></button>
              <button onClick={() => window.setImageStyle('right')} className="px-2 h-7 hover:bg-white rounded text-xs font-bold text-gray-600 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">format_align_right</span></button>
          </div>
          <div className="w-px h-6 bg-gray-300 my-auto mx-1"></div>
          <div className="flex bg-gray-50 rounded border border-gray-100 p-1">
              <button onClick={() => window.setImageSize('w-1/4')} className="w-7 h-7 hover:bg-white rounded font-bold text-gray-600 text-xs">25</button>
              <button onClick={() => window.setImageSize('w-1/2')} className="w-7 h-7 hover:bg-white rounded font-bold text-gray-600 text-xs">50</button>
              <button onClick={() => window.setImageSize('w-3/4')} className="w-7 h-7 hover:bg-white rounded font-bold text-gray-600 text-xs">75</button>
              <button onClick={() => window.setImageSize('w-full')} className="w-7 h-7 hover:bg-white rounded font-bold text-gray-600 text-[10px]">100</button>
          </div>
          <div className="w-px h-6 bg-gray-300 my-auto mx-1"></div>
          
          <div className="flex items-center gap-1 px-1 relative group/crop">
              <button type="button" className="text-gray-400 hover:text-anahuac-orange w-7 h-7 rounded flex items-center justify-center cursor-default bg-gray-50" title="Recorte y Proporción"><span className="material-symbols-outlined text-[18px]">crop</span></button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/crop:visible group-hover/crop:opacity-100 transition-all duration-200 delay-500 group-hover/crop:delay-0 z-50">
                  <div className="flex bg-white shadow-xl border border-gray-200 rounded-lg p-2 gap-2 flex-col w-max">
                      <div className="flex gap-1 border-b border-gray-100 pb-2">
                         <button type="button" onClick={() => window.setEditorialImageAspect('auto')} className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 font-bold border border-gray-100">Original</button>
                         <button type="button" onClick={() => window.setEditorialImageAspect('1/1')} className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100">1:1</button>
                         <button type="button" onClick={() => window.setEditorialImageAspect('16/9')} className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100">16:9</button>
                         <button type="button" onClick={() => window.setEditorialImageAspect('4/3')} className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100">4:3</button>
                      </div>
                      <div className="flex items-center gap-2" title="Posición Horizontal">
                         <span className="text-[10px] uppercase text-gray-400 font-bold w-4">X</span>
                         <input type="range" min="0" max="100" defaultValue="50" className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" onInput={(e) => window.setEditorialImagePosition(e.currentTarget, 'x')} />
                      </div>
                      <div className="flex items-center gap-2" title="Posición Vertical">
                         <span className="text-[10px] uppercase text-gray-400 font-bold w-4">Y</span>
                         <input type="range" min="0" max="100" defaultValue="50" className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" onInput={(e) => window.setEditorialImagePosition(e.currentTarget, 'y')} />
                      </div>
                  </div>
              </div>
          </div>

          <div className="flex items-center gap-1 px-1 relative group/radius">
              <button type="button" className="text-gray-400 hover:text-anahuac-orange w-7 h-7 rounded flex items-center justify-center cursor-default bg-gray-50" title="Bordes Redondeados"><span className="material-symbols-outlined text-[18px]">rounded_corner</span></button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/radius:visible group-hover/radius:opacity-100 transition-all duration-200 delay-500 group-hover/radius:delay-0 z-50">
                  <div className="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1 w-max">
                      <button type="button" onClick={() => window.setEditorialImageRadius('0')} className="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200" title="Sin bordes"><div className="w-4 h-4 border-2 border-gray-400"></div></button>
                      <button type="button" onClick={() => window.setEditorialImageRadius('0.5rem')} className="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200" title="Suave"><div className="w-4 h-4 border-2 border-gray-400 rounded-lg"></div></button>
                      <button type="button" onClick={() => window.setEditorialImageRadius('1rem')} className="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200" title="Medio"><div className="w-4 h-4 border-2 border-gray-400 rounded-2xl"></div></button>
                      <button type="button" onClick={() => window.setEditorialImageRadius('9999px')} className="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200" title="Círculo"><div className="w-4 h-4 border-2 border-gray-400 rounded-full"></div></button>
                  </div>
              </div>
          </div>

          <div className="flex items-center gap-1 px-1 relative group/shadow bg-gray-50 rounded">
              <button type="button" className="text-gray-400 hover:text-anahuac-orange w-7 h-7 rounded flex items-center justify-center cursor-default" title="Sombras (Drop Shadow)"><span className="material-symbols-outlined text-[18px]">dehaze</span></button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/shadow:visible group-hover/shadow:opacity-100 transition-all duration-200 delay-500 group-hover/shadow:delay-0 z-50">
                  <div className="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1 w-max">
                      <button type="button" onClick={() => window.setEditorialImageShadow('none')} className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100">Sin sombra</button>
                      <button type="button" onClick={() => window.setEditorialImageShadow('rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.06) 0px 2px 4px -1px')} className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100 drop-shadow-sm">Suave</button>
                      <button type="button" onClick={() => window.setEditorialImageShadow('rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px')} className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100 drop-shadow-md">Media</button>
                      <button type="button" onClick={() => window.setEditorialImageShadow('rgba(0, 0, 0, 0.2) 0px 20px 25px -5px, rgba(0, 0, 0, 0.04) 0px 10px 10px -5px')} className="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100 drop-shadow-xl">Fuerte</button>
                  </div>
              </div>
          </div>
          <div className="w-px h-6 bg-gray-300 my-auto mx-1"></div>

          <div className="flex items-center gap-1 bg-gray-50 rounded" title="Rotar Imagen">
              <button type="button" className="text-gray-400 hover:text-anahuac-purple dark:text-white w-7 h-7 flex items-center justify-center hover:bg-white rounded" onClick={() => window.rotateEditorialImage(-90)}><span className="material-symbols-outlined text-[18px]">rotate_left</span></button>
              <button type="button" className="text-gray-400 hover:text-anahuac-purple dark:text-white w-7 h-7 flex items-center justify-center hover:bg-white rounded" onClick={() => window.rotateEditorialImage(90)}><span className="material-symbols-outlined text-[18px]">rotate_right</span></button>
          </div>

          <div className="w-px h-6 bg-gray-300 my-auto mx-1"></div>
          <button onClick={() => window.deleteSelectedImage()} className="w-7 h-7 flex items-center justify-center hover:bg-red-50 text-red-500 rounded"><span className="material-symbols-outlined text-[18px]">delete</span></button>
      </div>

      {/* Panel Lateral: Catálogo */}
      <aside className="relative w-[340px] bg-white dark:bg-gray-800 border-r border-anahuac-gray dark:border-gray-700 flex flex-col h-full shadow-lg z-20 transition-colors" data-tour="sidebar">
          <div className="p-6 bg-anahuac-purple dark:bg-[#3f2f5b] text-white border-b-4 border-anahuac-orange flex-shrink-0 flex items-start justify-between gap-3">
              <div>
                  <h1 className="text-xl font-serif font-bold tracking-wide text-white dark:text-[#9980c3]">HTML Builder para LMS</h1>
                  <p className="text-xs text-white/80 mt-1 font-sans">Diseño Instruccional</p>
              </div>
              <button
                  type="button"
                  onClick={() => setShowTutorialMenu(true)}
                  className="w-10 h-10 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/70 flex-shrink-0"
                  title="Abrir tutorial"
                  aria-label="Abrir tutorial por temas"
                  data-tour="tutorial-launcher"
              >
                  <span className="material-symbols-outlined text-[23px]">school</span>
              </button>
          </div>

          <div className="flex border-b border-anahuac-gray dark:border-gray-700 bg-gray-50 dark:bg-[#2f2f2f] flex-shrink-0 px-1 transition-colors" data-tour="catalog-tabs">
              <button onClick={() => window.switchTab('pages')} className="btn-tab flex-1 py-3 px-1 text-[13px] font-bold border-b-2 border-anahuac-orange text-anahuac-orange transition-colors" data-target="pages" data-tour="pages-tab">Páginas</button>
              <button onClick={() => window.switchTab('elements')} className="btn-tab flex-1 py-3 px-1 text-[13px] font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" data-target="elements" data-tour="elements-tab">Elementos</button>
              <button onClick={() => window.switchTab('containers')} className="btn-tab flex-1 py-3 px-1 text-[13px] font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" data-target="containers" data-tour="media-tab">Medios</button>
          </div>

          <div className="flex-1 overflow-y-auto relative bg-white dark:bg-[#454545]">
              <div id="tab-pages" className="tab-content active p-5 bg-white dark:bg-[#454545]">
                  <div className="text-xs text-gray-500 dark:text-gray-300 mb-4 leading-tight">Plantillas maestras completas.</div>
                  <div id="catalog-pages" className="space-y-3" data-tour="pages-catalog">
                      <div className="p-3 bg-anahuac-light dark:bg-[#2f2f2f] dark:text-gray-200 text-gray-800 border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center justify-between hover:border-anahuac-orange transition-colors cursor-grab shadow-sm group" data-type="bienvenida" data-tour="page-template">
                          <div className="flex items-center gap-3"><span className="material-symbols-outlined text-anahuac-orange">home</span> <span className="text-sm font-medium">Bienvenida</span></div>
                          <button onClick={() => window.insertTemplate('bienvenida')} className="text-gray-400 hover:text-anahuac-orange transition-colors opacity-0 group-hover:opacity-100" title="Añadir al final del documento"><span className="material-symbols-outlined">add_circle</span></button>
                      </div>
                      <div className="p-3 bg-anahuac-light dark:bg-[#2f2f2f] dark:text-gray-200 text-gray-800 border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center justify-between hover:border-anahuac-orange transition-colors cursor-grab shadow-sm group" data-type="requerimientos">
                          <div className="flex items-center gap-3"><span className="material-symbols-outlined text-anahuac-orange">settings</span> <span className="text-sm font-medium">Requerimientos</span></div>
                          <button onClick={() => window.insertTemplate('requerimientos')} className="text-gray-400 hover:text-anahuac-orange transition-colors opacity-0 group-hover:opacity-100" title="Añadir al final del documento"><span className="material-symbols-outlined">add_circle</span></button>
                      </div>
                      <div className="p-3 bg-anahuac-light dark:bg-[#2f2f2f] dark:text-gray-200 text-gray-800 border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center justify-between hover:border-anahuac-orange transition-colors cursor-grab shadow-sm group" data-type="referencias">
                          <div className="flex items-center gap-3"><span className="material-symbols-outlined text-anahuac-orange">library_books</span> <span className="text-sm font-medium">Referencias</span></div>
                          <button onClick={() => window.insertTemplate('referencias')} className="text-gray-400 hover:text-anahuac-orange transition-colors opacity-0 group-hover:opacity-100" title="Añadir al final del documento"><span className="material-symbols-outlined">add_circle</span></button>
                      </div>
                      <div className="p-3 bg-anahuac-light dark:bg-[#2f2f2f] dark:text-gray-200 text-gray-800 border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center justify-between hover:border-anahuac-orange transition-colors cursor-grab shadow-sm group" data-type="indice">
                          <div className="flex items-center gap-3"><span className="material-symbols-outlined text-anahuac-orange">view_list</span> <span className="text-sm font-medium">Índice</span></div>
                          <button onClick={() => window.insertTemplate('indice')} className="text-gray-400 hover:text-anahuac-orange transition-colors opacity-0 group-hover:opacity-100" title="Añadir al final del documento"><span className="material-symbols-outlined">add_circle</span></button>
                      </div>
                      <div className="p-3 bg-anahuac-light dark:bg-[#2f2f2f] dark:text-gray-200 text-gray-800 border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center justify-between hover:border-anahuac-orange transition-colors cursor-grab shadow-sm group" data-type="profesor">
                          <div className="flex items-center gap-3"><span className="material-symbols-outlined text-anahuac-orange">school</span> <span className="text-sm font-medium">Profesor</span></div>
                          <button onClick={() => window.insertTemplate('profesor')} className="text-gray-400 hover:text-anahuac-orange transition-colors opacity-0 group-hover:opacity-100" title="Añadir al final del documento"><span className="material-symbols-outlined">add_circle</span></button>
                      </div>
                      <div className="p-3 bg-anahuac-light dark:bg-[#2f2f2f] dark:text-gray-200 text-gray-800 border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center justify-between hover:border-anahuac-orange transition-colors cursor-grab shadow-sm group" data-type="conclusiones">
                          <div className="flex items-center gap-3"><span className="material-symbols-outlined text-anahuac-orange">flag</span> <span className="text-sm font-medium">Conclusiones</span></div>
                          <button onClick={() => window.insertTemplate('conclusiones')} className="text-gray-400 hover:text-anahuac-orange transition-colors opacity-0 group-hover:opacity-100" title="Añadir al final del documento"><span className="material-symbols-outlined">add_circle</span></button>
                      </div>
                      <div className="p-3 bg-anahuac-light dark:bg-[#2f2f2f] dark:text-gray-200 text-gray-800 border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center justify-between hover:border-anahuac-orange transition-colors cursor-grab shadow-sm group" data-type="pagina_basica">
                          <div className="flex items-center gap-3"><span className="material-symbols-outlined text-anahuac-orange">web</span> <span className="text-sm font-medium">Página Básica</span></div>
                          <button onClick={() => window.insertTemplate('pagina_basica')} className="text-gray-400 hover:text-anahuac-orange transition-colors opacity-0 group-hover:opacity-100" title="Añadir al final del documento"><span className="material-symbols-outlined">add_circle</span></button>
                      </div>
                  </div>
              </div>
              
              <div id="tab-elements" className="tab-content p-5">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-tight">Bloques interactivos anidables.</div>
                  <div className="space-y-4">
                      <details open className="group text-sm">
                          <summary className="font-bold text-gray-600 dark:text-gray-300 mb-2 cursor-pointer flex items-center justify-between outline-none">
                              Textos <span className="material-symbols-outlined text-[18px] transform group-open:rotate-180 transition-transform">expand_more</span>
                          </summary>
                          <div className="space-y-3 catalog-list pt-1">
                              <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="titulo_basico" data-tour="element-template"><span className="material-symbols-outlined text-anahuac-purple dark:text-white">title</span> <span className="text-sm font-medium">Título Suelto</span></div>
                              <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center justify-between gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab group" data-type="titulo_imagen">
                                  <div className="flex items-center gap-3"><span className="material-symbols-outlined text-anahuac-orange">image</span> <span className="text-sm font-medium">Título con Imagen</span></div>
                                  <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); window.insertTemplate('titulo_imagen'); }} className="text-gray-400 hover:text-anahuac-orange transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="Añadir al final del documento"><span className="material-symbols-outlined">add_circle</span></button>
                              </div>
                              <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="parrafo_basico"><span className="material-symbols-outlined text-anahuac-purple dark:text-white">segment</span> <span className="text-sm font-medium">Párrafo Suelto</span></div>
                              <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="cuadro_naranja"><span className="material-symbols-outlined text-anahuac-orange">crop_square</span> <span className="text-sm font-medium">Cuadro Naranja Sólido</span></div>
                              <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="caja_texto"><span className="material-symbols-outlined text-anahuac-purple dark:text-white">article</span> <span className="text-sm font-medium">Caja Destacada (Línea)</span></div>
                              <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="separador"><span className="material-symbols-outlined text-anahuac-purple dark:text-white">horizontal_rule</span> <span className="text-sm font-medium">Separador de Espacio</span></div>
                          </div>
                      </details>

                      <details open className="group text-sm">
                          <summary className="font-bold text-gray-600 dark:text-gray-300 mb-2 cursor-pointer flex items-center justify-between outline-none">
                              Tablas <span className="material-symbols-outlined text-[18px] transform group-open:rotate-180 transition-transform">expand_more</span>
                          </summary>
                          <div className="space-y-3 catalog-list pt-1">
                              <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="grid_2x2"><span className="material-symbols-outlined text-anahuac-purple dark:text-white">grid_view</span> <span className="text-sm font-medium">Tabla Grid (Íconos)</span></div>
                              <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="tabla_dinamica"><span className="material-symbols-outlined text-anahuac-purple dark:text-white">table</span> <span className="text-sm font-medium">Tabla Dinámica</span></div>
                              <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="profesor_datos"><span className="material-symbols-outlined text-anahuac-purple dark:text-white">contact_mail</span> <span className="text-sm font-medium">Lista de Contactos</span></div>
                              <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="referencias_importer"><span className="material-symbols-outlined text-anahuac-purple dark:text-white">content_paste</span> <span className="text-sm font-medium">Elemento Referencia</span></div>
                          </div>
                      </details>

                      <details open className="group text-sm">
                          <summary className="font-bold text-gray-600 dark:text-gray-300 mb-2 cursor-pointer flex items-center justify-between outline-none">
                              Interactivos <span className="material-symbols-outlined text-[18px] transform group-open:rotate-180 transition-transform">expand_more</span>
                          </summary>
                          <div className="space-y-3 catalog-list pt-1">
                              <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="pestanas"><span className="material-symbols-outlined text-anahuac-purple dark:text-white">tab</span> <span className="text-sm font-medium">Pestañas (Tabs)</span></div>
                              <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="acordeon"><span className="material-symbols-outlined text-anahuac-purple dark:text-white">arrow_drop_down_circle</span> <span className="text-sm font-medium">Tema Desplegable (Acordeón)</span></div>
                              <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="flipcard"><span className="material-symbols-outlined text-anahuac-orange">flip</span> <span className="text-sm font-medium">Flipcard (Girable)</span></div>
                              <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="icono_suelto"><span className="material-symbols-outlined text-anahuac-orange">star</span> <span className="text-sm font-medium">Ícono Suelto</span></div>
                              <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="imagen_suelta"><span className="material-symbols-outlined text-anahuac-purple dark:text-white">image</span> <span className="text-sm font-medium">Imagen Dinámica</span></div>
                          </div>
                      </details>

                      <details open className="group text-sm">
                          <summary className="font-bold text-gray-600 dark:text-gray-300 mb-2 cursor-pointer flex items-center justify-between outline-none">
                              Gráficas <span className="material-symbols-outlined text-[18px] transform group-open:rotate-180 transition-transform">expand_more</span>
                          </summary>
                          <div className="space-y-3 catalog-list pt-1">
                              <div className="p-3 text-gray-400 text-xs italic">Aún no hay gráficas disponibles.</div>
                          </div>
                      </details>
                  </div>
              </div>

              <div id="tab-containers" className="tab-content p-5">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-tight">Recursos externos por URL o Iframe.</div>
                  <div id="catalog-containers" className="space-y-3" data-tour="media-catalog">
                      <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="calculadora_html"><span className="material-symbols-outlined text-green-600">functions</span> <span className="text-sm font-medium">Funciones externas</span></div>
                      <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="embed_youtube"><span className="material-symbols-outlined text-[#FF0000]">smart_display</span> <span className="text-sm font-medium">YouTube</span></div>
                      <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="embed_vimeo"><span className="material-symbols-outlined text-[#1ab7ea]">videocam</span> <span className="text-sm font-medium">Vimeo</span></div>
                      <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="embed_genially"><span className="material-symbols-outlined text-[#051C42]">auto_awesome</span> <span className="text-sm font-medium">Genially</span></div>
                      <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="embed_canva"><span className="material-symbols-outlined text-[#00C4CC]">palette</span> <span className="text-sm font-medium">Canva</span></div>
                      <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="embed_sketchfab"><span className="material-symbols-outlined text-[#1CAAD9]">view_in_ar</span> <span className="text-sm font-medium">Sketchfab</span></div>
                      <div className="p-3 bg-white dark:bg-[#2f2f2f] shadow-sm border border-anahuac-gray dark:border-transparent rounded-lg catalog-item flex items-center gap-3 hover:border-anahuac-orange dark:hover:border-anahuac-orange transition-colors cursor-grab" data-type="embed_gamma"><span className="material-symbols-outlined text-[#8B5CF6]">view_carousel</span> <span className="text-sm font-medium">Gamma</span></div>
                  </div>
              </div>
          </div>

          <div id="pages-floating-actions" className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-4" data-tour="canvas-style-actions">
              <button 
                  onClick={() => window.openBgModal()} 
                  className="bg-anahuac-purple hover:bg-purple-800 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_14px_0_rgba(93,66,140,0.39)] hover:shadow-[0_6px_20px_rgba(93,66,140,0.23)] hover:-translate-y-1 transition-all"
                  title="Fondo del Canvas"
              >
                  <span className="material-symbols-outlined text-[28px]">wallpaper</span>
              </button>
              <button 
                  onClick={() => window.openGlobalFooterModal()} 
                  className="bg-anahuac-orange text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_14px_0_rgba(255,89,0,0.39)] hover:bg-orange-600 hover:shadow-[0_6px_20px_rgba(255,89,0,0.23)] hover:-translate-y-1 transition-all"
                  title="Configurar diseño de Footer por defecto"
              >
                  <span className="material-symbols-outlined text-[28px]">design_services</span>
              </button>
          </div>
      </aside>

      {/* Área Principal: El Lienzo */}
      <main className="flex-1 flex flex-col relative dark:bg-gray-900 bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20cx%3D%222%22%20cy%3D%222%22%20r%3D%221%22%20fill%3D%22%23e5e7eb%22%2F%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20cx%3D%222%22%20cy%3D%222%22%20r%3D%221%22%20fill%3D%22%234b5563%22%2F%3E%3C%2Fsvg%3E')] transition-colors">
          <header className="h-16 bg-white dark:bg-[#454545] border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-8 shadow-sm z-10 transition-colors" data-tour="top-toolbar">
              <TipOfTheDay />
              <div className="flex items-center gap-4">
                  <div className="relative">
                      <button 
                        onClick={() => setShowPreviewMenu(!showPreviewMenu)} 
                        className="flex items-center justify-center w-10 h-10 rounded-full text-white hover:opacity-90 transition-opacity" 
                        style={{backgroundColor: '#646464'}}
                        title="Simulador de Vista Previa"
                        data-tour="preview"
                      >
                        <span className="material-symbols-outlined text-[20px]">devices</span>
                      </button>

                      {showPreviewMenu && (
                        <div className="absolute right-0 top-12 mt-2 w-64 bg-white dark:bg-[#323232] rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 z-50">
                          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 mb-2">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Vista Previa</h3>
                          </div>
                          
                          <button onClick={() => { setPreviewMode('lms'); setShowPreviewMenu(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-[#454545] transition-colors ${previewMode === 'lms' ? 'text-anahuac-orange font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                            <span className="material-symbols-outlined text-[18px]">web</span>
                            LMS (Responsive)
                          </button>

                          <button onClick={() => { setPreviewMode('mobile_v'); setShowPreviewMenu(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-[#454545] transition-colors ${previewMode === 'mobile_v' ? 'text-anahuac-orange font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                            <span className="material-symbols-outlined text-[18px]">smartphone</span>
                            Mobile Vertical
                          </button>

                          <button onClick={() => { setPreviewMode('mobile_h'); setShowPreviewMenu(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-[#454545] transition-colors ${previewMode === 'mobile_h' ? 'text-anahuac-orange font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                            <span className="material-symbols-outlined text-[18px] rotate-90">smartphone</span>
                            Mobile Horizontal
                          </button>

                          <div className="px-4 py-3 border-t border-b border-gray-100 dark:border-gray-700 my-1">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 cursor-pointer" onClick={() => setPreviewMode('custom')}>
                                <input type="radio" checked={previewMode === 'custom'} readOnly className="text-anahuac-orange focus:ring-anahuac-orange" />
                                Ancho Custom
                              </label>
                              <span className="text-xs text-gray-500 font-mono">{customWidth}px</span>
                            </div>
                            <input 
                              type="range" 
                              min="420" max="850" 
                              value={customWidth} 
                              onChange={(e) => {
                                setCustomWidth(parseInt(e.target.value));
                                if (previewMode !== 'custom') setPreviewMode('custom');
                              }}
                              className="w-full accent-anahuac-orange" 
                            />
                          </div>

                          <button onClick={() => { setPreviewMode('fullscreen'); setShowPreviewMenu(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-[#454545] transition-colors ${previewMode === 'fullscreen' ? 'text-anahuac-orange font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                            <span className="material-symbols-outlined text-[18px]">fullscreen</span>
                            Pantalla Completa
                          </button>
                        </div>
                      )}
                  </div>
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-[#2f2f2f] text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#3f3f3f] transition-colors" title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
                      <span className="material-symbols-outlined text-[20px]">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
                  </button>
                  <button onClick={() => window.importHTML()} className="bg-gray-100 dark:bg-[#2f2f2f] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] text-gray-700 dark:text-gray-200 px-5 py-2 rounded-full font-medium shadow-sm hover:shadow transition-all active:scale-95 flex items-center gap-2 text-sm tracking-wide" title="Subir desde archivo HTML" data-tour="import-file">HTML <span className="material-symbols-outlined text-[18px]">upload</span></button>
                  <button onClick={() => {
                      const modal = document.getElementById('paste-modal');
                      if (modal) {
                          modal.classList.remove('hidden');
                          const txt = document.getElementById('paste-html-textarea') as HTMLTextAreaElement;
                          if (txt) { txt.value = ''; txt.focus(); }
                      }
                  }} className="bg-gray-100 dark:bg-[#2f2f2f] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] text-gray-700 dark:text-gray-200 p-2 w-10 h-10 rounded-full font-medium shadow-sm hover:shadow transition-all active:scale-95 flex items-center justify-center" title="Pegar HTML del portapapeles" data-tour="import-paste">
                      <span className="material-symbols-outlined text-[18px]">content_paste</span>
                  </button>
                  
                  <div className="flex items-center gap-2" data-tour="history">
                      <button id="btn-undo" onClick={() => window.undo()} className="bg-gray-100 dark:bg-[#2f2f2f] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] text-gray-700 dark:text-gray-200 p-2 w-10 h-10 rounded-full font-medium shadow-sm hover:shadow transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed" title="Deshacer (Ctrl+Z)">
                          <span className="material-symbols-outlined text-[18px]">undo</span>
                      </button>
                      <button id="btn-redo" onClick={() => window.redo()} className="bg-gray-100 dark:bg-[#2f2f2f] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] text-gray-700 dark:text-gray-200 p-2 w-10 h-10 rounded-full font-medium shadow-sm hover:shadow transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed" title="Rehacer (Ctrl+Y)">
                          <span className="material-symbols-outlined text-[18px]">redo</span>
                      </button>
                  </div>
                  
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>

                  <button onClick={() => window.exportHTML()} className="bg-anahuac-orange hover:bg-orange-600 text-white px-5 py-2 rounded-full font-medium shadow-sm hover:shadow transition-all active:scale-95 flex items-center gap-2 text-sm tracking-wide" title="Descargar archivo HTML" data-tour="export-file">HTML <span className="material-symbols-outlined text-[18px]">download</span></button>
                  <button onClick={() => window.copyHTMLToClipboard()} className="bg-anahuac-orange hover:bg-orange-600 text-white p-2 w-10 h-10 rounded-full font-medium shadow-sm hover:shadow transition-all active:scale-95 flex items-center justify-center" title="Copiar HTML al portapapeles" data-tour="export-copy">
                      <span className="material-symbols-outlined text-[18px]">content_copy</span>
                  </button>
              </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 relative bg-transparent dark:bg-[#6c6c6c]" id="scroll-container">
              <EditorCanvas />
          </div>
      </main>

      {showTutorialMenu && (
          <div
              className="modal-bg fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="tutorial-menu-title"
              onMouseDown={(event) => {
                  if (event.currentTarget === event.target) setShowTutorialMenu(false);
              }}
          >
              <div className="bg-white dark:bg-gray-800 dark:text-gray-200 rounded-2xl shadow-2xl w-full max-w-[820px] max-h-[90vh] overflow-y-auto transition-colors">
                  <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-start justify-between gap-6">
                      <div>
                          <div className="inline-flex items-center gap-2 text-anahuac-orange text-xs font-bold uppercase tracking-[0.14em] mb-2">
                              <span className="material-symbols-outlined text-[18px]">explore</span>
                              Centro de aprendizaje
                          </div>
                          <h2 id="tutorial-menu-title" className="text-2xl sm:text-3xl font-serif font-bold text-anahuac-purple dark:text-white">¿Qué quieres aprender?</h2>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-2xl">Elige un recorrido breve. Puedes cerrarlo en cualquier momento y volver a este menú desde el botón de ayuda.</p>
                      </div>
                      <button
                          type="button"
                          onClick={() => setShowTutorialMenu(false)}
                          className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center flex-shrink-0 transition-colors"
                          aria-label="Cerrar selector de tutoriales"
                      >
                          <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>

                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {TUTORIAL_TOPICS.map((topic, index) => (
                          <button
                              key={topic.id}
                              type="button"
                              onClick={() => handleStartTutorial(topic.id)}
                              className="group text-left border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-[#373737] hover:border-anahuac-orange hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-anahuac-orange transition-all"
                          >
                              <div className="flex items-start gap-4">
                                  <span className={`material-symbols-outlined w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-[23px] ${index % 2 === 0 ? 'bg-purple-50 dark:bg-purple-950/40 text-anahuac-purple dark:text-purple-200' : 'bg-orange-50 dark:bg-orange-950/40 text-anahuac-orange'}`}>{topic.icon}</span>
                                  <span className="min-w-0 flex-1">
                                      <span className="flex items-center justify-between gap-3">
                                          <span className="font-bold text-gray-800 dark:text-gray-100 group-hover:text-anahuac-orange transition-colors">{topic.title}</span>
                                          <span className="text-[11px] text-gray-400 whitespace-nowrap">{topic.duration}</span>
                                      </span>
                                      <span className="block text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{topic.description}</span>
                                  </span>
                                  <span className="material-symbols-outlined text-gray-300 group-hover:text-anahuac-orange group-hover:translate-x-0.5 transition-all mt-2">arrow_forward</span>
                              </div>
                          </button>
                      ))}
                  </div>

                  <div className="px-6 sm:px-8 py-4 bg-gray-50 dark:bg-[#303030] border-t border-gray-100 dark:border-gray-700 rounded-b-2xl text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-anahuac-purple dark:text-purple-300">info</span>
                      El tutorial solo señala controles: no cambia ni elimina el contenido de tu diseño.
                  </div>
              </div>
          </div>
      )}

      {/* Modales */}
      <div id="paste-modal" className="modal-bg fixed inset-0 bg-black/60 hidden z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 dark:text-gray-200 rounded-xl shadow-2xl p-8 w-[95%] sm:w-[90%] max-w-[700px] max-h-[90vh] overflow-y-auto flex flex-col transition-colors">
              <h2 className="text-xl font-bold text-anahuac-purple dark:text-white mb-2 font-serif flex items-center gap-2"><span className="material-symbols-outlined">content_paste</span> Pegar Código HTML</h2>
              <p className="text-sm text-gray-500 mb-6">Pega aquí el código HTML generado previamente por este Builder LMS.</p>
              
              <div className="relative flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                  <textarea id="paste-html-textarea" className="w-full h-64 p-4 bg-transparent outline-none resize-none font-mono text-sm text-gray-700 dark:text-gray-300" placeholder="Pega el código aquí..."></textarea>
                  <button onClick={async () => {
                      try {
                          const text = await navigator.clipboard.readText();
                          const txt = document.getElementById('paste-html-textarea') as HTMLTextAreaElement;
                          if (txt) txt.value = text;
                      } catch (e) {
                          alert("Asegúrate de haber otorgado los permisos al portapapeles.");
                      }
                  }} className="absolute top-2 right-2 flex items-center gap-1 bg-white dark:bg-gray-700 text-xs px-3 py-1.5 rounded-full shadow border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 active:scale-95 transition-all"><span className="material-symbols-outlined text-[14px]">content_paste_go</span> Pegar del Portapapeles</button>
              </div>

              <div className="mt-8 text-right flex justify-end gap-2">
                  <button onClick={() => document.getElementById('paste-modal')?.classList.add('hidden')} className="px-6 py-2 bg-gray-100 dark:bg-gray-700 dark:text-gray-200 text-gray-700 font-bold rounded hover:bg-gray-200 dark:hover:bg-gray-600 border border-transparent transition-colors">Cancelar</button>
                  <button onClick={() => {
                      const val = (document.getElementById('paste-html-textarea') as HTMLTextAreaElement).value;
                      if (!val || val.trim().length === 0) {
                           alert('El campo está vacío.');
                           return;
                      }
                      if(window.processImportedHTML) {
                           window.processImportedHTML(val);
                           document.getElementById('paste-modal')?.classList.add('hidden');
                      }
                  }} className="px-8 py-2 bg-anahuac-orange text-white font-bold rounded hover:bg-orange-600 shadow-lg transition-all active:scale-95 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">check_circle</span> Procesar e Insertar</button>
              </div>
          </div>
      </div>

      <div id="title-image-modal" className="modal-bg fixed inset-0 bg-black/60 hidden z-[60] flex items-center justify-center">
          <div className="bg-white dark:bg-[#323232] dark:text-gray-200 rounded-xl shadow-2xl p-6 w-[95%] sm:w-[90%] max-w-[760px] max-h-[90vh] overflow-y-auto transition-colors">
              <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                      <h2 className="text-xl font-bold text-anahuac-purple dark:text-white font-serif">Imagen para el título</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">El color y la sombra del texto se ajustan automáticamente al fondo.</p>
                  </div>
                  <button type="button" onClick={() => document.getElementById('title-image-modal')?.classList.add('hidden')} className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded" title="Cerrar"><span className="material-symbols-outlined">close</span></button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {titleBgImages.map((bg, idx) => (
                      <button key={`${bg.name}-${idx}`} type="button" onClick={() => window.selectTitleBackground(bg.url)} className="group text-left p-3 rounded-xl border-2 border-gray-200 hover:border-anahuac-orange focus:border-anahuac-orange focus:outline-none transition-colors">
                          <div className="w-full aspect-[4.6/1] min-h-[90px] bg-cover bg-center rounded-lg shadow-inner border border-gray-100" style={{backgroundImage: `url('${bg.url}')`}}></div>
                          <span className="block mt-3 text-sm font-bold text-gray-700 dark:text-white group-hover:text-anahuac-orange transition-colors">{bg.name}</span>
                      </button>
                  ))}
              </div>

              {titleBgImages.length === 0 && (
                  <div className="py-12 text-center text-gray-400">No hay fondos de título disponibles.</div>
              )}
          </div>
      </div>

      <div id="bg-modal" className="modal-bg fixed inset-0 bg-black/60 hidden z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-[#323232] dark:text-gray-200 rounded-xl shadow-2xl p-8 w-[95%] sm:w-[90%] max-w-[700px] max-h-[90vh] overflow-y-auto transition-colors">
              <h2 className="text-xl font-bold text-anahuac-purple dark:text-white mb-6 font-serif">Selecciona un Fondo</h2>
              
              <div className="flex flex-col md:flex-row gap-8">
                  {/* Left Column: Solid Colors */}
                  <div className="md:w-1/4 border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-4 flex flex-col">
                      <h3 className="text-sm font-bold text-gray-700 dark:text-white mb-4">Color Sólido</h3>
                      <div className="flex flex-row md:flex-col items-center md:items-start gap-4">
                          <button className="bg-option-btn w-10 h-10 rounded shadow hover:scale-110 transition-transform flex-shrink-0" style={{backgroundColor: '#ff5900'}} onClick={(e) => window.selectBackground(e.currentTarget, 'color_solido', '#ff5900')} title="Naranja Anáhuac"></button>
                          <button className="bg-option-btn w-10 h-10 rounded shadow hover:scale-110 transition-transform flex-shrink-0" style={{backgroundColor: '#5d428c'}} onClick={(e) => window.selectBackground(e.currentTarget, 'color_solido', '#5d428c')} title="Morado Anáhuac"></button>
                          <button className="bg-option-btn w-10 h-10 rounded shadow hover:scale-110 transition-transform flex-shrink-0" style={{backgroundColor: '#cdd5dc'}} onClick={(e) => window.selectBackground(e.currentTarget, 'color_solido', '#cdd5dc')} title="Gris Claro Anáhuac"></button>
                          <button className="bg-option-btn w-10 h-10 rounded shadow hover:scale-110 transition-transform flex-shrink-0" style={{backgroundColor: '#646464'}} onClick={(e) => window.selectBackground(e.currentTarget, 'color_solido', '#646464')} title="Gris Oscuro Anáhuac"></button>
                          <button className="bg-option-btn w-10 h-10 border border-gray-200 rounded shadow hover:scale-110 transition-transform flex-shrink-0" style={{backgroundColor: '#f7f7f7'}} onClick={(e) => window.selectBackground(e.currentTarget, 'color_solido', '#f7f7f7')} title="Fondo Claro LMS"></button>
                      </div>
                  </div>

                  {/* Right Column: Images */}
                  <div className="md:w-3/4">
                      <h3 className="text-sm font-bold text-gray-700 dark:text-white mb-4">Imágenes y Patrones</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {bgImages.map((bg, idx) => (
                              <button key={idx} onClick={(e) => window.selectBackground(e.currentTarget, 'imagen', bg.url)} className="bg-option-btn flex flex-col items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded border-2 border-transparent"><div className="w-full h-24 bg-cover bg-center rounded-md shadow-inner border border-gray-200 dark:border-gray-600 relative overflow-hidden" style={{ backgroundImage: `url('${bg.url}')` }}><div className="absolute inset-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center -z-10"><span className="text-xs text-gray-400 dark:text-gray-500">{bg.name}</span></div></div><span className="text-sm font-bold text-gray-700 dark:text-white">{bg.name}</span></button>
                          ))}
                          <button onClick={(e) => window.selectBackground(e.currentTarget, 'blanco')} className="bg-option-btn flex flex-col items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded border-2 border-transparent"><div className="w-full h-24 bg-white dark:bg-gray-200 rounded-md shadow-inner border border-gray-200 dark:border-gray-600"></div><span className="text-sm font-bold text-gray-700 dark:text-white">Blanco Limpio</span></button>
                      </div>
                  </div>
              </div>

              <div className="mt-6 border-t border-gray-100 dark:border-gray-600 pt-6">
                  <div>
                      <h3 className="font-bold text-gray-700 dark:text-white mb-2">Margen del Fondo (px)</h3>
                      <input type="range" id="bg-margin-slider" min="5" max="60" defaultValue="15" onChange={(e) => window.updateBgMargin(e.target.value)} className="w-full accent-anahuac-orange" />
                      <div className="text-xs text-gray-500 dark:text-gray-300 mt-1 flex justify-between"><span>5px</span><span id="bg-margin-val">15px</span></div>
                  </div>
              </div>

              <div className="mt-8 text-right flex justify-end gap-2">
                  <button onClick={() => document.getElementById('bg-modal')?.classList.add('hidden')} className="px-6 py-2 bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 hover:dark:bg-black font-bold rounded hover:bg-gray-200 transition-colors">Cancelar</button>
                  <button onClick={() => window.applyBgSettings()} className="px-8 py-2 bg-anahuac-orange text-white font-bold rounded hover:bg-orange-600 shadow-lg transition-all active:scale-95">Aplicar Cambios</button>
              </div>
          </div>
      </div>
      
      {/* Modal de Galería LMS */}
      <div id="gallery-modal" className="modal-bg fixed inset-0 bg-black/60 hidden z-[60] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[95%] sm:w-[90%] max-w-[800px] max-h-[90vh] overflow-y-auto flex flex-col transition-colors">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-serif text-anahuac-orange font-bold">Galería de Imágenes LMS</h2>
                  <div className="flex items-center gap-4">
                      
                      <button onClick={() => document.getElementById('gallery-modal')?.classList.add('hidden')} className="text-gray-400 hover:text-gray-600 ml-4">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>
              </div>
              <div className="mb-4 flex-1 overflow-y-auto min-h-[250px] border border-gray-100 p-4 rounded-lg bg-gray-50">
                  <div id="gallery-thumbnails" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {/* Las imágenes se inyectarán aquí mediante JS */}
                  </div>
                  <div id="gallery-empty-state" className="hidden flex-col items-center justify-center py-10 text-gray-400">
                      <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">image_not_supported</span>
                      <p>Aún no hay imágenes subidas</p>
                  </div>
              </div>

              <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between gap-3">
                  <div className="flex gap-2 items-center flex-1 pr-4">
                      <input id="gallery-url-input" type="text" placeholder="Pega URL de imagen y presiona Enter..." className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-anahuac-orange text-sm" onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                             (window as any).applyGalleryImage();
                          }
                      }} />
                      <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded transition-colors whitespace-nowrap" onClick={() => (window as any).applyGalleryImage()}>Aplicar</button>
                  </div>
                  <div className="flex gap-3">
                      <button onClick={() => document.getElementById('gallery-modal')?.classList.add('hidden')} className="px-4 py-2 bg-white text-gray-500 hover:bg-gray-100 rounded font-bold transition-colors">Cancelar</button>
                      <button onClick={() => (window as any).confirmGallerySelection()} id="gallery-confirm-btn" className="px-6 py-2 bg-gray-200 text-gray-500 rounded font-bold cursor-not-allowed transition-colors pointer-events-none">Insertar Imagen</button>
                  </div>
              </div>
          </div>
      </div>

      <div id="footer-modal" className="modal-bg fixed inset-0 bg-black/60 hidden z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 dark:text-gray-200 rounded-xl shadow-2xl p-6 w-[95%] sm:w-[90%] max-w-[600px] max-h-[90vh] overflow-y-auto transition-colors">
              <h2 className="text-lg font-bold text-anahuac-purple dark:text-white mb-4 font-serif">Configuración del Footer</h2>
              <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">1. Tipo de Diseño</label>
                  <div className="flex gap-4">
                      <button id="btn-footer-lineas" className="flex-1 py-2 border-2 border-anahuac-orange text-anahuac-orange rounded font-bold" onClick={() => { window.tempFooterType='lineas'; window.updateFooterModalUI(); }}>Líneas Naranjas</button>
                      <button id="btn-footer-solido" className="flex-1 py-2 border-2 border-gray-200 text-gray-500 rounded font-bold hover:border-anahuac-orange transition-colors" onClick={() => { window.tempFooterType='solido'; window.updateFooterModalUI() }}>Bloque Sólido</button>
                  </div>
              </div>
              
              <div className="mb-6 hidden" id="footer-block-color-container">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Color del Bloque Sólido</label>
                  <div className="flex gap-2">
                      <button className="flex-1 py-2 border-2 rounded font-bold transition-colors block-color-btn" data-color="naranja" onClick={() => { window.tempFooterBlockColor='naranja'; window.updateFooterModalUI(); }}>Naranja</button>
                      <button className="flex-1 py-2 border-2 rounded font-bold transition-colors block-color-btn" data-color="gris" onClick={() => { window.tempFooterBlockColor='gris'; window.updateFooterModalUI(); }}>Gris</button>
                      <button className="flex-1 py-2 border-2 rounded font-bold transition-colors block-color-btn" data-color="gris_oscuro" onClick={() => { window.tempFooterBlockColor='gris_oscuro'; window.updateFooterModalUI(); }}>Gris Oscuro</button>
                      <button className="flex-1 py-2 border-2 rounded font-bold transition-colors block-color-btn" data-color="morado" onClick={() => { window.tempFooterBlockColor='morado'; window.updateFooterModalUI(); }}>Morado</button>
                  </div>
              </div>

              <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">2. Variante de Logotipo</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3" id="footer-logo-grid">
                      { footerLogos.length > 0 ? footerLogos.map(logo => (
                          <div key={logo.id} className={`border-2 rounded p-2 text-center footer-logo-btn cursor-pointer ${
                              (window as any).tempFooterLogo == parseInt(logo.id) ? 'border-anahuac-orange bg-orange-50' : 'border-gray-200 hover:border-anahuac-orange'
                          }`} onClick={() => { (window as any).tempFooterLogo=parseInt(logo.id); (window as any).updateFooterModalUI() }} id={`btn-logo-${logo.id}`} data-id={logo.id}>
                             {logo.preserveColors ? (
                                 <img src={logo.url} alt="Anáhuac Querétaro en colaboración con Coventry University" className="w-full h-[60px] object-contain" />
                             ) : (
                                 <div className="logo-mask inline-block w-full h-[60px]" style={{ maskImage: `url('${logo.url}')`, WebkitMaskImage: `url('${logo.url}')`, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center", WebkitMaskPosition: "center", backgroundColor: "currentColor" }}></div>
                             )}
                          </div>
                      )) : (
                                                    <div className="border-2 border-anahuac-orange rounded p-2 text-center bg-orange-50 footer-logo-btn cursor-pointer" onClick={() => { (window as any).tempFooterLogo=1; (window as any).updateFooterModalUI() }} id="btn-logo-1" data-id="1">
                             <div className="logo-mask inline-block w-full h-[60px]" style={{ maskImage: `url('${''}')`, WebkitMaskImage: `url('${''}')`, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center", WebkitMaskPosition: "center", backgroundColor: "currentColor" }}></div>
                          </div>
                      )}
                  </div>
              </div>

              <div className="mb-6" id="footer-logo-color-container">
                  <label className="block text-sm font-bold text-gray-700 mb-2">3. Color del Logotipo</label>
                  <div className="flex gap-2">
                      <button className="flex-1 py-2 border-2 rounded font-bold transition-colors logo-color-btn" data-color="naranja" onClick={() => { window.tempFooterLogoColor='naranja'; window.updateFooterModalUI(); }}>Naranja</button>
                      <button className="flex-1 py-2 border-2 rounded font-bold transition-colors logo-color-btn" data-color="gris" onClick={() => { window.tempFooterLogoColor='gris'; window.updateFooterModalUI(); }}>Gris</button>
                      <button className="flex-1 py-2 border-2 rounded font-bold transition-colors logo-color-btn" data-color="morado" onClick={() => { window.tempFooterLogoColor='morado'; window.updateFooterModalUI(); }}>Morado</button>
                  </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => document.getElementById('footer-modal')?.classList.add('hidden')} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded font-bold">Cancelar</button>
                  <button onClick={() => window.applyFooterConfig()} className="px-6 py-2 bg-anahuac-orange text-white rounded font-bold hover:bg-orange-600 shadow">Aplicar Footer</button>
              </div>
          </div>
      </div>

      <div id="profesor-datos-modal" className="modal-bg fixed inset-0 bg-black/60 hidden z-[60] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[95%] sm:w-[90%] max-w-[550px] max-h-[90vh] flex flex-col transition-colors">
              <h2 className="text-lg font-bold text-anahuac-purple dark:text-white mb-4 font-serif">Editar Datos del Profesor</h2>
              <div className="overflow-y-auto p-2 space-y-3 flex-1" id="profesor-datos-list">
                  {/* JS will populate list here */}
              </div>
              <div className="mt-4 border-t pt-4">
                  <button type="button" onClick={() => (window as any).addProfesorDato()} className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded hover:border-anahuac-orange hover:text-anahuac-orange transition-colors flex justify-center items-center gap-2 mb-4 font-bold">
                      <span className="material-symbols-outlined text-[18px]">add</span> Agregar Nuevo Campo
                  </button>
                  <div className="flex justify-end gap-2">
                      <button onClick={() => document.getElementById('profesor-datos-modal')?.classList.add('hidden')} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded font-bold">Cancelar</button>
                      <button onClick={() => (window as any).saveProfesorDatos()} className="px-6 py-2 bg-anahuac-orange text-white rounded font-bold hover:bg-orange-600 shadow">Aceptar</button>
                  </div>
              </div>
          </div>
      </div>

      <div id="profesor-link-modal" className="modal-bg fixed inset-0 bg-black/60 hidden z-[65] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[95%] sm:w-[90%] max-w-[450px] max-h-[90vh] flex flex-col transition-colors">
              <h2 className="text-lg font-bold text-anahuac-purple dark:text-white mb-4 font-serif">Hipervínculo</h2>
              <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Enlace (URL)</label>
                  <input type="text" id="profesor-link-url" className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-anahuac-orange" placeholder="https://" />
              </div>
              <div className="flex justify-between items-center mt-2 border-t pt-4">
                  <button type="button" onClick={() => (window as any).clearProfesorLinkModal()} className="text-red-500 hover:text-red-700 font-bold px-3 py-2 rounded hover:bg-red-50 transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">delete</span> Borrar Enlace
                  </button>
                  <div className="flex gap-2">
                      <button onClick={() => document.getElementById('profesor-link-modal')?.classList.add('hidden')} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded font-bold">Cancelar</button>
                      <button onClick={() => (window as any).saveProfesorLinkModal()} className="px-6 py-2 bg-anahuac-orange text-white rounded font-bold hover:bg-orange-600 shadow">Aceptar</button>
                  </div>
              </div>
          </div>
      </div>

      <div id="icon-modal" className="modal-bg fixed inset-0 bg-black/60 hidden z-[70] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[95%] sm:w-[90%] max-w-[550px] max-h-[90vh] overflow-y-auto transition-colors">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-anahuac-purple dark:text-white">Catálogo de Íconos</h2>
                  <p className="text-xs text-gray-400">Material Symbols</p>
              </div>
              <div className="overflow-y-auto max-h-96 p-2 space-y-6" id="icon-grid"></div>
              <button onClick={() => document.getElementById('icon-modal')?.classList.add('hidden')} className="mt-4 px-4 py-2 w-full text-gray-500 hover:bg-gray-100 rounded border border-gray-200">Cancelar</button>
          </div>
      </div>

      {previewMode === 'fullscreen' && (
        <button 
            onClick={() => setPreviewMode('lms')}
            className="fixed bottom-8 right-8 z-[101] bg-gray-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 hover:bg-gray-700 transition-colors opacity-80 hover:opacity-100 animate-in fade-in slide-in-from-bottom-8 duration-300"
        >
            <span className="material-symbols-outlined">fullscreen_exit</span> 
            <span className="font-medium">Salir de Pantalla Completa</span>
        </button>
      )}
    </div>
  );
}
