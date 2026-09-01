// URL absoluta de los recursos que deben seguir funcionando en el HTML exportado.
const GITHUB_REQ_IMAGES_URL = "https://raw.githubusercontent.com/adrianvillanueva-anahuac/HTML-Builder-para-LMS/main/public/imagenes/requerimientos";
const DEFAULT_TITLE_IMAGE_URL = `${import.meta.env.BASE_URL}imagenes/titulos/Fondo_naranja_escolar.png`;


// Plantillas y bloques HTML en crudo
export function getBlockToolbar(type: string) {
    let extraButtons = '';
    if (type === 'parrafo_basico') {
        extraButtons = `<button type="button" class="text-gray-400 hover:text-anahuac-purple dark:text-white p-1 rounded hover:bg-purple-50 transition-colors flex items-center justify-center" onclick="toggleColumns(this)" title="Alternar columnas"><span class="material-symbols-outlined text-[18px]">view_column</span></button><div class="w-px h-4 bg-gray-200 mx-1"></div>`;
    } else if (type === 'separador') {
        extraButtons = `
            <div class="flex items-center gap-1 px-1 relative group/sep">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded flex items-center justify-center cursor-default" title="Estilo de línea"><span class="material-symbols-outlined text-[18px]">border_horizontal</span></button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/sep:visible group-hover/sep:opacity-100 transition-all duration-200 delay-500 group-hover/sep:delay-0 z-50">
                    <div class="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1 w-max relative">
                       <button type="button" onclick="changeSeparatorStyle(this, 'solid')" class="w-8 h-8 hover:bg-gray-100 rounded text-gray-700 font-bold border border-gray-100 flex items-center justify-center cursor-pointer">—</button>
                       <button type="button" onclick="changeSeparatorStyle(this, 'dashed')" class="w-8 h-8 hover:bg-gray-100 rounded text-gray-700 font-bold border border-gray-100 flex items-center justify-center cursor-pointer">---</button>
                       <button type="button" onclick="changeSeparatorStyle(this, 'dotted')" class="w-8 h-8 hover:bg-gray-100 rounded text-gray-700 font-bold border border-gray-100 flex items-center justify-center cursor-pointer">...</button>
                       <button type="button" onclick="changeSeparatorStyle(this, 'none')" class="w-8 h-8 hover:bg-gray-100 rounded text-gray-400 font-bold border border-gray-100 flex items-center justify-center cursor-pointer">∅</button>
                    </div>
                </div>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
            <div class="flex items-center gap-1 px-1 relative group/color">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded flex items-center justify-center cursor-default" title="Color de línea"><span class="material-symbols-outlined text-[18px]">palette</span></button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/color:visible group-hover/color:opacity-100 transition-all duration-200 delay-500 group-hover/color:delay-0 z-50">
                    <div class="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1 w-max relative">
                        <button type="button" onclick="changeSeparatorColor(this, '#ff5900')" class="w-5 h-5 rounded-full bg-[#ff5900] border border-transparent hover:ring-2 ring-offset-1 ring-[#ff5900] cursor-pointer" title="Naranja"></button>
                        <button type="button" onclick="changeSeparatorColor(this, '#5d428c')" class="w-5 h-5 rounded-full bg-[#5d428c] border border-transparent hover:ring-2 ring-offset-1 ring-[#5d428c] cursor-pointer" title="Morado"></button>
                        <button type="button" onclick="changeSeparatorColor(this, '#646464')" class="w-5 h-5 rounded-full bg-[#646464] border border-transparent hover:ring-2 ring-offset-1 ring-[#646464] cursor-pointer" title="Gris"></button>
                    </div>
                </div>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
            <div class="flex items-center gap-1 px-1" title="Grosor de Línea">
                <span class="material-symbols-outlined text-[14px] text-gray-400">line_weight</span>
                <input type="range" min="1" max="10" value="1" class="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" oninput="updateSeparatorThickness(this)">
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
            <div class="flex items-center gap-1 px-1" title="Margen Arriba">
                <span class="material-symbols-outlined text-[14px] text-gray-400">vertical_align_top</span>
                <input type="range" min="0" max="100" value="24" class="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" oninput="updateSeparatorMargin(this, 'top')">
            </div>
            <div class="flex items-center gap-1 px-1" title="Margen Abajo">
                <span class="material-symbols-outlined text-[14px] text-gray-400">vertical_align_bottom</span>
                <input type="range" min="0" max="100" value="24" class="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" oninput="updateSeparatorMargin(this, 'bottom')">
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
        `;
    } else if (type === 'titulo_basico') {
        extraButtons = `
            <div class="flex items-center gap-1 border border-gray-100 rounded bg-gray-50 p-0.5">
                <button type="button" class="px-2 py-0.5 text-[10px] font-bold rounded transition-colors hover:bg-white hover:shadow-sm text-gray-500" onclick="switchTitleType(this, 'T1')" title="Título 1 (Centrado)">T1</button>
                <button type="button" class="px-2 py-0.5 text-[10px] font-bold rounded transition-colors hover:bg-white hover:shadow-sm text-gray-500" onclick="switchTitleType(this, 'T2')" title="Título 2 (Izquierda)">T2</button>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
        `;
    } else if (type === 'titulo_imagen') {
        extraButtons = `
            <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded hover:bg-orange-50 transition-colors flex items-center justify-center" onclick="openTitleImageModal(this)" title="Elegir imagen de fondo"><span class="material-symbols-outlined text-[18px]">photo_library</span></button>
            <button type="button" class="text-gray-400 hover:text-anahuac-purple p-1 rounded hover:bg-purple-50 transition-colors flex items-center justify-center" onclick="refreshTitleImageContrast(this)" title="Recalcular contraste"><span class="material-symbols-outlined text-[18px]">contrast</span></button>
            <div class="title-image-size-control flex items-center px-1 relative group/title-size">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded hover:bg-orange-50 transition-colors flex items-center justify-center" onclick="toggleTitleImageSizePanel(this)" title="Ajustar alto y espacio del texto"><span class="material-symbols-outlined text-[18px]">height</span></button>
                <div class="title-image-size-panel absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/title-size:visible group-hover/title-size:opacity-100 transition-all duration-200 delay-300 group-hover/title-size:delay-0 z-50">
                    <div class="bg-white shadow-xl border border-gray-200 rounded-lg p-3 w-56 space-y-3 text-gray-600">
                        <label class="block">
                            <span class="flex items-center justify-between text-[11px] font-semibold mb-1"><span>Alto mínimo</span><output class="title-image-height-value text-anahuac-orange">Auto</output></span>
                            <input type="range" min="0" max="360" step="10" value="0" class="title-image-height-control w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" oninput="updateTitleImageHeight(this)">
                        </label>
                        <label class="block">
                            <span class="flex items-center justify-between text-[11px] font-semibold mb-1"><span>Espacio del texto</span><output class="title-image-padding-value text-anahuac-orange">40 px</output></span>
                            <input type="range" min="8" max="80" step="4" value="40" class="title-image-padding-control w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" oninput="updateTitleImagePadding(this)">
                        </label>
                    </div>
                </div>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
        `;
    } else if (type === 'imagen_suelta' || type === 'profesor_img') {
        extraButtons = `
            <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded hover:bg-orange-50 transition-colors flex items-center justify-center" onclick="triggerStandaloneImage(this)" title="Cambiar imagen"><span class="material-symbols-outlined text-[18px]">find_replace</span></button>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
            
            <div class="flex items-center gap-1 px-1" title="Escalar Tamaño">
                <span class="material-symbols-outlined text-[16px] text-gray-400">zoom_in</span>
                <input type="range" min="10" max="100" value="${type === 'profesor_img' ? '100' : '50'}" class="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" oninput="updateImageSize(this)">
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
            
            <div class="flex items-center gap-1 px-1 relative group/crop">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded flex items-center justify-center cursor-default" title="Recorte y Proporción"><span class="material-symbols-outlined text-[18px]">crop</span></button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/crop:visible group-hover/crop:opacity-100 transition-all duration-200 delay-500 group-hover/crop:delay-0 z-50">
                    <div class="flex bg-white shadow-xl border border-gray-200 rounded-lg p-2 gap-2 flex-col w-max">
                        <div class="flex gap-1 border-b border-gray-100 pb-2">
                           <button type="button" onclick="changeImageAspect(this, 'auto')" class="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 font-bold border border-gray-100">Original</button>
                           <button type="button" onclick="changeImageAspect(this, '1/1')" class="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100">1:1</button>
                           <button type="button" onclick="changeImageAspect(this, '16/9')" class="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100">16:9</button>
                           <button type="button" onclick="changeImageAspect(this, '4/3')" class="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100">4:3</button>
                        </div>
                        <div class="flex items-center gap-2" title="Posición Horizontal">
                           <span class="text-[10px] uppercase text-gray-400 font-bold w-4">X</span>
                           <input type="range" min="0" max="100" value="50" class="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" oninput="updateImagePosition(this, 'x')">
                        </div>
                        <div class="flex items-center gap-2" title="Posición Vertical">
                           <span class="text-[10px] uppercase text-gray-400 font-bold w-4">Y</span>
                           <input type="range" min="0" max="100" value="50" class="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" oninput="updateImagePosition(this, 'y')">
                        </div>
                    </div>
                </div>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>

            <div class="flex items-center gap-1 px-1 relative group/radius">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded flex items-center justify-center cursor-default" title="Bordes Redondeados"><span class="material-symbols-outlined text-[18px]">rounded_corner</span></button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/radius:visible group-hover/radius:opacity-100 transition-all duration-200 delay-500 group-hover/radius:delay-0 z-50">
                    <div class="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1 w-max">
                        <button type="button" onclick="changeImageRadius(this, '0')" class="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200" title="Sin bordes"><div class="w-4 h-4 border-2 border-gray-400"></div></button>
                        <button type="button" onclick="changeImageRadius(this, '0.5rem')" class="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200" title="Suave"><div class="w-4 h-4 border-2 border-gray-400 rounded-lg"></div></button>
                        <button type="button" onclick="changeImageRadius(this, '1rem')" class="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200" title="Medio"><div class="w-4 h-4 border-2 border-gray-400 rounded-2xl"></div></button>
                        <button type="button" onclick="changeImageRadius(this, '9999px')" class="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200" title="Círculo"><div class="w-4 h-4 border-2 border-gray-400 rounded-full"></div></button>
                    </div>
                </div>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>

            <div class="flex items-center gap-1 px-1 relative group/shadow">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded flex items-center justify-center cursor-default" title="Sombras (Drop Shadow)"><span class="material-symbols-outlined text-[18px]">dehaze</span></button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/shadow:visible group-hover/shadow:opacity-100 transition-all duration-200 delay-500 group-hover/shadow:delay-0 z-50">
                    <div class="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1 w-max">
                        <button type="button" onclick="changeImageShadow(this, 'none')" class="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100">Sin sombra</button>
                        <button type="button" onclick="changeImageShadow(this, 'rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.06) 0px 2px 4px -1px')" class="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100 drop-shadow-sm">Suave</button>
                        <button type="button" onclick="changeImageShadow(this, 'rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px')" class="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100 drop-shadow-md">Media</button>
                        <button type="button" onclick="changeImageShadow(this, 'rgba(0, 0, 0, 0.2) 0px 20px 25px -5px, rgba(0, 0, 0, 0.04) 0px 10px 10px -5px')" class="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100 drop-shadow-xl">Fuerte</button>
                    </div>
                </div>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>

            <div class="flex items-center gap-1 px-1" title="Rotar Imagen">
                <button type="button" class="text-gray-400 hover:text-anahuac-purple dark:text-white p-1 flex items-center justify-center" onclick="rotateImage(this, -90)"><span class="material-symbols-outlined text-[18px]">rotate_left</span></button>
                <button type="button" class="text-gray-400 hover:text-anahuac-purple dark:text-white p-1 flex items-center justify-center" onclick="rotateImage(this, 90)"><span class="material-symbols-outlined text-[18px]">rotate_right</span></button>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>`;
    } else if (type === 'calculadora_html') {
        extraButtons = `<button type="button" class="text-gray-400 hover:text-blue-500 p-1 rounded hover:bg-blue-50 transition-colors flex items-center justify-center" onclick="editCalculadora(this)" title="Editar Código"><span class="material-symbols-outlined text-[18px]">code</span></button><div class="w-px h-4 bg-gray-200 mx-1"></div>`;
    } else if (type.startsWith('embed_')) {
        extraButtons = `<button type="button" class="text-gray-400 hover:text-blue-500 p-1 rounded hover:bg-blue-50 transition-colors flex items-center justify-center" onclick="editEmbed(this)" title="Editar Código URL"><span class="material-symbols-outlined text-[18px]">link</span></button><div class="w-px h-4 bg-gray-200 mx-1"></div>`;
    } else if (type === 'grid_2x2') {
        extraButtons = `
            <div class="flex items-center gap-1 px-1 relative group/color">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded flex items-center justify-center cursor-default" title="Color de líneas"><span class="material-symbols-outlined text-[18px]">border_color</span></button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/color:visible group-hover/color:opacity-100 transition-all duration-200 delay-500 group-hover/color:delay-0 z-50">
                    <div class="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1 w-max relative">
                        <button type="button" onclick="window.changeGridBorderColor(this, '#ff5900')" class="w-6 h-6 rounded-full bg-[#ff5900] border border-transparent hover:ring-2 ring-offset-1 ring-[#ff5900] cursor-pointer" title="Naranja"></button>
                        <button type="button" onclick="window.changeGridBorderColor(this, '#5d428c')" class="w-6 h-6 rounded-full bg-[#5d428c] border border-transparent hover:ring-2 ring-offset-1 ring-[#5d428c] cursor-pointer" title="Morado"></button>
                        <button type="button" onclick="window.changeGridBorderColor(this, '#646464')" class="w-6 h-6 rounded-full bg-[#646464] border border-transparent hover:ring-2 ring-offset-1 ring-[#646464] cursor-pointer" title="Gris"></button>
                        <button type="button" onclick="window.changeGridBorderColor(this, '#cdd5dc')" class="w-6 h-6 rounded-full bg-[#cdd5dc] border border-transparent hover:ring-2 ring-offset-1 ring-[#cdd5dc] cursor-pointer" title="Gris Claro"></button>
                        <button type="button" onclick="window.changeGridBorderColor(this, 'transparent')" class="w-6 h-6 rounded-full bg-white border border-gray-300 hover:ring-2 ring-offset-1 ring-gray-300 cursor-pointer flex items-center justify-center text-[10px]" title="Sin borde">∅</button>
                    </div>
                </div>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
            <div class="flex items-center gap-1 px-1 relative group/width">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded flex items-center justify-center cursor-default" title="Grosor de líneas"><span class="material-symbols-outlined text-[18px]">line_weight</span></button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/width:visible group-hover/width:opacity-100 transition-all duration-200 delay-500 group-hover/width:delay-0 z-50">
                    <div class="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1 w-max relative">
                        <button type="button" onclick="window.changeGridBorderWidth(this, '1px')" class="px-2 py-1 hover:bg-gray-100 rounded text-xs font-bold text-gray-700 flex items-center justify-center" title="1px"><div class="w-4 border-t border-gray-700"></div></button>
                        <button type="button" onclick="window.changeGridBorderWidth(this, '2px')" class="px-2 py-1 hover:bg-gray-100 rounded text-xs font-bold text-gray-700 flex items-center justify-center" title="2px"><div class="w-4 border-t-2 border-gray-700"></div></button>
                        <button type="button" onclick="window.changeGridBorderWidth(this, '4px')" class="px-2 py-1 hover:bg-gray-100 rounded text-xs font-bold text-gray-700 flex items-center justify-center" title="4px"><div class="w-4 border-t-4 border-gray-700"></div></button>
                    </div>
                </div>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
            <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded flex items-center justify-center transition-colors" onclick="window.toggleGridDivision(this)" title="Alternar división"><span class="material-symbols-outlined text-[18px]">splitscreen</span></button>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
            <button type="button" class="text-gray-400 hover:text-green-500 p-1 rounded flex items-center justify-center" onclick="addGridRow(this)" title="Añadir fila"><span class="material-symbols-outlined text-[18px]">add_box</span></button><button type="button" class="text-gray-400 hover:text-red-500 p-1 rounded flex items-center justify-center" onclick="removeGridRow(this)" title="Quitar fila"><span class="material-symbols-outlined text-[18px]">indeterminate_check_box</span></button><div class="w-px h-4 bg-gray-200 mx-1"></div>`;
    } else if (type === 'pestanas') {
        extraButtons = `
            <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded flex items-center justify-center" onclick="toggleTabsOrientation(this)" title="Cambiar orientación (H/V)"><span class="material-symbols-outlined text-[18px]">view_quilt</span></button>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
            <button type="button" class="text-gray-400 hover:text-green-500 p-1 rounded flex items-center justify-center" onclick="addTab(this)" title="Añadir pestaña"><span class="material-symbols-outlined text-[18px]">add_box</span></button>
            <button type="button" class="text-gray-400 hover:text-red-500 p-1 rounded flex items-center justify-center" onclick="removeTab(this)" title="Quitar pestaña"><span class="material-symbols-outlined text-[18px]">indeterminate_check_box</span></button>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
        `;
    } else if (type === 'icono_suelto') {
        extraButtons = `
            <div class="flex items-center gap-1">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded hover:bg-orange-50 transition-colors flex items-center justify-center" onclick="changeIconSize(this, -8)" title="Hacer más pequeño"><span class="material-symbols-outlined text-[16px]">remove</span></button>
                <div class="w-px h-4 bg-gray-200 mx-1"></div>
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded hover:bg-orange-50 transition-colors flex items-center justify-center" onclick="changeIconSize(this, 8)" title="Hacer más grande"><span class="material-symbols-outlined text-[16px]">add</span></button>
                <div class="w-px h-4 bg-gray-200 mx-1"></div>
                <button type="button" class="w-5 h-5 rounded-full bg-[#ff5900] border border-transparent hover:ring-2 ring-offset-1 ring-[#ff5900] mx-0.5" onclick="changeIconColor(this, 'text-anahuac-orange')" title="Naranja"></button>
                <button type="button" class="w-5 h-5 rounded-full bg-[#5d428c] border border-transparent hover:ring-2 ring-offset-1 ring-[#5d428c] mx-0.5" onclick="changeIconColor(this, 'text-anahuac-purple')" title="Morado"></button>
                <button type="button" class="w-5 h-5 rounded-full bg-[#646464] border border-transparent hover:ring-2 ring-offset-1 ring-[#646464] mx-0.5" onclick="changeIconColor(this, 'text-gray-600')" title="Gris"></button>
                <button type="button" class="w-5 h-5 rounded-full bg-[#9ca3af] border border-transparent hover:ring-2 ring-offset-1 ring-[#9ca3af] mx-0.5" onclick="changeIconColor(this, 'text-gray-400')" title="Gris Claro"></button>
                <div class="w-px h-4 bg-gray-200 mx-1"></div>
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded hover:bg-orange-50 transition-colors flex items-center justify-center" onclick="alignIconAndContainer(this, 'left')" title="Alinear a la izquierda"><span class="material-symbols-outlined text-[16px]">format_align_left</span></button>
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded hover:bg-orange-50 transition-colors flex items-center justify-center" onclick="alignIconAndContainer(this, 'center')" title="Centrar"><span class="material-symbols-outlined text-[16px]">format_align_center</span></button>
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded hover:bg-orange-50 transition-colors flex items-center justify-center" onclick="alignIconAndContainer(this, 'right')" title="Alinear a la derecha"><span class="material-symbols-outlined text-[16px]">format_align_right</span></button>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
        `;
    } else if (type === 'cuadro_naranja') {
        extraButtons = `
            <div class="flex items-center gap-1 px-1 relative group/color">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded flex items-center justify-center cursor-default" title="Color de Fondo"><span class="material-symbols-outlined text-[18px]">palette</span></button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/color:visible group-hover/color:opacity-100 transition-all duration-200 delay-500 group-hover/color:delay-0 z-50">
                    <div class="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1 w-max relative">
                        <button type="button" onclick="changeCuadroColor(this, 'orange')" class="w-5 h-5 rounded-full bg-[#ff5900] border border-transparent hover:ring-2 ring-offset-1 ring-[#ff5900] cursor-pointer" title="Naranja"></button>
                        <button type="button" onclick="changeCuadroColor(this, 'purple')" class="w-5 h-5 rounded-full bg-[#5d428c] border border-transparent hover:ring-2 ring-offset-1 ring-[#5d428c] cursor-pointer" title="Morado"></button>
                        <button type="button" onclick="changeCuadroColor(this, 'gray-dark')" class="w-5 h-5 rounded-full bg-gray-600 border border-transparent hover:ring-2 ring-offset-1 ring-gray-600 cursor-pointer" title="Gris Oscuro"></button>
                        <button type="button" onclick="changeCuadroColor(this, 'gray-light')" class="w-5 h-5 rounded-full bg-gray-100 border border-gray-300 hover:ring-2 ring-offset-1 ring-gray-300 cursor-pointer" title="Gris Claro"></button>
                    </div>
                </div>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>

            <div class="flex items-center gap-1 px-1 relative group/radius">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded flex items-center justify-center cursor-default" title="Bordes Redondeados"><span class="material-symbols-outlined text-[18px]">rounded_corner</span></button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/radius:visible group-hover/radius:opacity-100 transition-all duration-200 delay-500 group-hover/radius:delay-0 z-50">
                    <div class="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1 w-max">
                        <button type="button" onclick="changeCuadroRadius(this, 'none')" class="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200" title="Sin bordes"><div class="w-4 h-4 border-2 border-gray-400"></div></button>
                        <button type="button" onclick="changeCuadroRadius(this, 'md')" class="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200" title="Medio"><div class="w-4 h-4 border-2 border-gray-400 rounded-md"></div></button>
                        <button type="button" onclick="changeCuadroRadius(this, 'xl')" class="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200" title="Grande"><div class="w-4 h-4 border-2 border-gray-400 rounded-xl"></div></button>
                        <button type="button" onclick="changeCuadroRadius(this, '3xl')" class="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200" title="Extra Grande"><div class="w-4 h-4 border-2 border-gray-400 rounded-3xl"></div></button>
                    </div>
                </div>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>

            <div class="flex items-center gap-1 px-1 relative group/padding">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded flex items-center justify-center cursor-default" title="Espaciado Vertical"><span class="material-symbols-outlined text-[18px]">height</span></button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/padding:visible group-hover/padding:opacity-100 transition-all duration-200 delay-500 group-hover/padding:delay-0 z-50">
                    <div class="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1 w-max">
                        <button type="button" onclick="changeCuadroPadding(this, 'py-2')" class="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100" title="Justo">Justo</button>
                        <button type="button" onclick="changeCuadroPadding(this, 'py-8')" class="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100" title="Normal">Normal</button>
                        <button type="button" onclick="changeCuadroPadding(this, 'py-16')" class="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100" title="Amplio">Amplio</button>
                    </div>
                </div>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
        `;
    } else if (type === 'tabla_dinamica') {
        extraButtons = `
            <button type="button" class="text-gray-400 hover:text-anahuac-purple p-1 rounded hover:bg-purple-50 transition-colors flex items-center justify-center" onclick="window.changeTableStyle(this, 'standard')" title="Estilo Estándar"><span class="material-symbols-outlined text-[18px]">table_rows</span></button>
            <button type="button" class="text-gray-400 hover:text-anahuac-purple p-1 rounded hover:bg-purple-50 transition-colors flex items-center justify-center" onclick="window.changeTableStyle(this, 'striped')" title="Filas Alternas"><span class="material-symbols-outlined text-[18px]">view_list</span></button>
            <button type="button" class="text-gray-400 hover:text-anahuac-purple p-1 rounded hover:bg-purple-50 transition-colors flex items-center justify-center" onclick="window.changeTableStyle(this, 'borderless')" title="Sin Bordes"><span class="material-symbols-outlined text-[18px]">border_clear</span></button>
            <button type="button" class="text-gray-400 hover:text-anahuac-purple p-1 rounded hover:bg-purple-50 transition-colors flex items-center justify-center" onclick="window.changeTableStyle(this, 'anahuac')" title="Estilo Anáhuac"><span class="material-symbols-outlined text-[18px]">palette</span></button>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
            <button type="button" class="text-gray-400 hover:text-green-600 p-1 rounded hover:bg-green-50 transition-colors flex items-center justify-center" onclick="window.pasteTableData(this)" title="Pegar desde Excel/Sheets"><span class="material-symbols-outlined text-[18px]">content_paste_go</span></button>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
            <div class="flex items-center gap-1 px-1 relative group/color">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded flex items-center justify-center cursor-default" title="Color de líneas"><span class="material-symbols-outlined text-[18px]">border_color</span></button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/color:visible group-hover/color:opacity-100 transition-all duration-200 delay-500 group-hover/color:delay-0 z-50">
                    <div class="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1 w-max relative">
                        <button type="button" onclick="window.changeTableBorderColor(this, '#ff5900')" class="w-6 h-6 rounded-full bg-[#ff5900] border border-transparent hover:ring-2 ring-offset-1 ring-[#ff5900] cursor-pointer" title="Naranja"></button>
                        <button type="button" onclick="window.changeTableBorderColor(this, '#5d428c')" class="w-6 h-6 rounded-full bg-[#5d428c] border border-transparent hover:ring-2 ring-offset-1 ring-[#5d428c] cursor-pointer" title="Morado"></button>
                        <button type="button" onclick="window.changeTableBorderColor(this, '#646464')" class="w-6 h-6 rounded-full bg-[#646464] border border-transparent hover:ring-2 ring-offset-1 ring-[#646464] cursor-pointer" title="Gris"></button>
                        <button type="button" onclick="window.changeTableBorderColor(this, '#cdd5dc')" class="w-6 h-6 rounded-full bg-[#cdd5dc] border border-transparent hover:ring-2 ring-offset-1 ring-[#cdd5dc] cursor-pointer" title="Gris Claro"></button>
                        <button type="button" onclick="window.changeTableBorderColor(this, 'transparent')" class="w-6 h-6 rounded-full bg-white border border-gray-300 hover:ring-2 ring-offset-1 ring-gray-300 cursor-pointer flex items-center justify-center text-[10px]" title="Sin borde">∅</button>
                    </div>
                </div>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
            <div class="flex items-center gap-1 px-1 relative group/width">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded flex items-center justify-center cursor-default" title="Grosor de líneas"><span class="material-symbols-outlined text-[18px]">line_weight</span></button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/width:visible group-hover/width:opacity-100 transition-all duration-200 delay-500 group-hover/width:delay-0 z-50">
                    <div class="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1 w-max relative">
                        <button type="button" onclick="window.changeTableBorderWidth(this, '1px')" class="px-2 py-1 hover:bg-gray-100 rounded text-xs font-bold text-gray-700 flex items-center justify-center" title="1px"><div class="w-4 border-t border-gray-700"></div></button>
                        <button type="button" onclick="window.changeTableBorderWidth(this, '2px')" class="px-2 py-1 hover:bg-gray-100 rounded text-xs font-bold text-gray-700 flex items-center justify-center" title="2px"><div class="w-4 border-t-2 border-gray-700"></div></button>
                        <button type="button" onclick="window.changeTableBorderWidth(this, '4px')" class="px-2 py-1 hover:bg-gray-100 rounded text-xs font-bold text-gray-700 flex items-center justify-center" title="4px"><div class="w-4 border-t-4 border-gray-700"></div></button>
                    </div>
                </div>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
        `;
    } else if (type === 'caja_texto') {
        extraButtons = `
            <div class="flex items-center gap-1 px-1 relative group/color">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded flex items-center justify-center cursor-default" title="Color de Borde"><span class="material-symbols-outlined text-[18px]">border_color</span></button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/color:visible group-hover/color:opacity-100 transition-all duration-200 delay-500 group-hover/color:delay-0 z-50">
                    <div class="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1 w-max relative">
                        <button type="button" onclick="changeCajaTextoColor(this, 'orange')" class="w-5 h-5 rounded-full bg-[#ff5900] border border-transparent hover:ring-2 ring-offset-1 ring-[#ff5900] cursor-pointer" title="Naranja"></button>
                        <button type="button" onclick="changeCajaTextoColor(this, 'purple')" class="w-5 h-5 rounded-full bg-[#5d428c] border border-transparent hover:ring-2 ring-offset-1 ring-[#5d428c] cursor-pointer" title="Morado"></button>
                        <button type="button" onclick="changeCajaTextoColor(this, 'gray-dark')" class="w-5 h-5 rounded-full bg-gray-600 border border-transparent hover:ring-2 ring-offset-1 ring-gray-600 cursor-pointer" title="Gris Oscuro"></button>
                        <button type="button" onclick="changeCajaTextoColor(this, 'gray-light')" class="w-5 h-5 rounded-full bg-gray-300 border border-transparent hover:ring-2 ring-offset-1 ring-gray-300 cursor-pointer" title="Gris Claro"></button>
                    </div>
                </div>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>

            <div class="flex items-center gap-1 px-1 relative group/radius">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded flex items-center justify-center cursor-default" title="Bordes Redondeados"><span class="material-symbols-outlined text-[18px]">rounded_corner</span></button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/radius:visible group-hover/radius:opacity-100 transition-all duration-200 delay-500 group-hover/radius:delay-0 z-50">
                    <div class="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1 w-max">
                        <button type="button" onclick="changeCajaTextoRadius(this, 'none')" class="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200" title="Sin bordes"><div class="w-4 h-4 border-2 border-gray-400"></div></button>
                        <button type="button" onclick="changeCajaTextoRadius(this, 'md')" class="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200" title="Medio"><div class="w-4 h-4 border-2 border-gray-400 rounded-md"></div></button>
                        <button type="button" onclick="changeCajaTextoRadius(this, 'xl')" class="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200" title="Grande"><div class="w-4 h-4 border-2 border-gray-400 rounded-xl"></div></button>
                        <button type="button" onclick="changeCajaTextoRadius(this, '3xl')" class="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200" title="Extra Grande"><div class="w-4 h-4 border-2 border-gray-400 rounded-3xl"></div></button>
                    </div>
                </div>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>

            <div class="flex items-center gap-1 px-1 relative group/padding">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded flex items-center justify-center cursor-default" title="Espaciado Vertical"><span class="material-symbols-outlined text-[18px]">height</span></button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/padding:visible group-hover/padding:opacity-100 transition-all duration-200 delay-500 group-hover/padding:delay-0 z-50">
                    <div class="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1 w-max">
                        <button type="button" onclick="changeCajaTextoPadding(this, 'py-2')" class="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100" title="Justo">Justo</button>
                        <button type="button" onclick="changeCajaTextoPadding(this, 'py-6')" class="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100" title="Normal">Normal</button>
                        <button type="button" onclick="changeCajaTextoPadding(this, 'py-12')" class="px-2 py-1 text-xs hover:bg-gray-100 rounded text-gray-700 border border-gray-100" title="Amplio">Amplio</button>
                    </div>
                </div>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
        `;
    } else if (type === 'flipcard') {
        extraButtons = `
            <div class="flex items-center gap-1 px-1 relative group/fc-edit">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded hover:bg-orange-50 transition-colors flex items-center justify-center" title="Editar Dorso/Frente (Girar Todas)" onclick="window.toggleFlipcardsSide(this)">
                    <span class="material-symbols-outlined text-[18px]">flip</span>
                </button>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>

            <div class="flex items-center gap-2 px-2">
                <span class="text-xs text-gray-500 font-bold" title="Ancho">W</span>
                <input type="range" min="150" max="600" value="210" class="w-16 accent-anahuac-orange" oninput="window.changeFlipcardsWidth(this)" title="Ancho">
                <span class="text-xs text-gray-500 font-bold ml-1" title="Alto">H</span>
                <input type="range" min="150" max="600" value="280" class="w-16 accent-anahuac-orange" oninput="window.changeFlipcardsHeight(this)" title="Alto">
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>

            <button type="button" class="text-gray-400 hover:text-green-500 p-1 rounded flex items-center justify-center hover:bg-green-50 transition-colors" title="Agregar Tarjeta Abajo" onclick="window.addFlipcard(this, 'col')">
                <span class="material-symbols-outlined text-[18px]">add_box</span>
            </button>
            <button type="button" class="text-gray-400 hover:text-green-500 p-1 rounded flex items-center justify-center hover:bg-green-50 transition-colors mr-1" title="Agregar Tarjeta a la Derecha" onclick="window.addFlipcard(this, 'row')">
                <span class="material-symbols-outlined text-[18px]">library_add</span>
            </button>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>

            <div class="flex items-center gap-1 px-1 relative group/fc-align">
                <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded flex items-center justify-center cursor-default" title="Alineación">
                    <span class="material-symbols-outlined text-[18px]">format_align_justify</span>
                </button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/fc-align:visible group-hover/fc-align:opacity-100 transition-all duration-200 delay-500 group-hover/fc-align:delay-0 z-50">
                    <div class="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1 w-max">
                        <button type="button" onclick="window.changeFlipcardsAlign(this, 'start')" class="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-100 rounded" title="Izquierda"><span class="material-symbols-outlined">format_align_left</span></button>
                        <button type="button" onclick="window.changeFlipcardsAlign(this, 'center')" class="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-100 rounded" title="Centro"><span class="material-symbols-outlined">format_align_center</span></button>
                        <button type="button" onclick="window.changeFlipcardsAlign(this, 'end')" class="w-8 h-8 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-100 rounded" title="Derecha"><span class="material-symbols-outlined">format_align_right</span></button>
                    </div>
                </div>
            </div>
            <div class="w-px h-4 bg-gray-200 mx-1"></div>
        `;
    }

    if (type === 'profesor_datos') {
        return `<div class="block-toolbar absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full z-50"><div class="bg-white rounded-md px-2 py-1 flex items-center gap-1 border border-gray-200 shadow-md"><div class="drag-handle cursor-grab hover:text-anahuac-orange text-gray-400 p-1 rounded hover:bg-gray-50 flex items-center justify-center" title="Arrastrar para mover"><span class="material-symbols-outlined text-[20px] pointer-events-none">drag_indicator</span></div><div class="w-px h-4 bg-gray-200 mx-1"></div><button type="button" class="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors flex items-center justify-center" onclick="deleteBlock(this)" title="Eliminar elemento"><span class="material-symbols-outlined text-[18px]">delete</span></button></div></div>`;
    }

    return `<div class="block-toolbar absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full z-50"><div class="bg-white rounded-md px-2 py-1 flex items-center gap-1 border border-gray-200 shadow-md"><div class="drag-handle cursor-grab hover:text-anahuac-orange text-gray-400 p-1 rounded hover:bg-gray-50 flex items-center justify-center" title="Arrastrar para mover"><span class="material-symbols-outlined text-[20px] pointer-events-none">drag_indicator</span></div><div class="w-px h-4 bg-gray-200 mx-1"></div>${extraButtons}<button type="button" class="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors flex items-center justify-center" onclick="deleteBlock(this)" title="Eliminar elemento"><span class="material-symbols-outlined text-[18px]">delete</span></button></div></div>`;
}

export function getDynamicFooterHTML(defaultType = 'lineas') {
    const gc = (window as any).globalFooterConfig || {};
    const type = gc.type || defaultType;
    const logoColor = gc.logoColor || 'naranja';
    const blockColor = gc.blockColor || 'naranja';
    const logoIdx = gc.logoId || 1;
    
    let content = '';
    let displayColor = type === 'lineas' ? '#ff5900' : '#ffffff';
    let blocksColor = type === 'lineas' ? '#ff5900' : '#ff5900';

    if (logoColor !== 'naranja' && type === 'lineas') {
        const colors: any = { rosa: '#e83e8c', verde: '#2fb45a', azul: '#005b9f', gris_oscuro: '#333333', morado: '#5d428c', blanco: '#ffffff' };
        displayColor = colors[logoColor] || '#ff5900';
        blocksColor = colors[logoColor] || '#ff5900';
    } else if (type === 'solido') {
        const colors: any = { naranja: '#ff5900', rosa: '#e83e8c', verde: '#2fb45a', azul: '#005b9f', gris_oscuro: '#333333', morado: '#5d428c', blanco: '#ffffff' };
        blocksColor = colors[blockColor] || '#ff5900';
    }

    const displaySvg = (window as any).footerLogoUrls?.[logoIdx] || (window as any).footerLogoUrls?.['1'] || '';
    const logoHtml = `<div class="inline-block mx-2 footer-logo flex items-center justify-center overflow-visible" data-logo-idx="${logoIdx}" style="width: 280px; height: 60px;">
        <div style="width: 100%; height: 100%; mask-image: url('${displaySvg}'); -webkit-mask-image: url('${displaySvg}'); mask-size: contain; -webkit-mask-size: contain; mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat; mask-position: center; -webkit-mask-position: center; background-color: ${displayColor}"></div>
    </div>`;

    if (type === 'lineas') {
        content = `<div class="flex items-center justify-center gap-4 w-full"><div class="flex-1 flex flex-col gap-1"><div class="h-[2px] w-full" style="background-color: ${blocksColor}"></div><div class="h-[2px] w-full" style="background-color: ${blocksColor}"></div><div class="h-[2px] w-full" style="background-color: ${blocksColor}"></div></div>${logoHtml}<div class="flex-1 flex flex-col gap-1"><div class="h-[2px] w-full" style="background-color: ${blocksColor}"></div><div class="h-[2px] w-full" style="background-color: ${blocksColor}"></div><div class="h-[2px] w-full" style="background-color: ${blocksColor}"></div></div></div>`;
    } else {
        content = `<div class="w-full py-6 flex justify-center rounded-b-xl" style="background-color: ${blocksColor}">${logoHtml}</div>`;
    }
    return `
        <div class="lms-footer-wrapper relative group/footer mt-auto w-full opacity-80 hover:opacity-100 transition-all cursor-pointer border-2 border-transparent hover:border-dashed hover:border-anahuac-orange py-4 rounded-xl" ondblclick="openFooterModal(this)" data-footer-type="${type}" data-footer-logo="${logoIdx}" data-footer-logo-color="${logoColor}" data-footer-block-color="${blockColor}">
           <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded opacity-0 group-hover/footer:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">Doble clic para configurar Footer</div>
           <div class="footer-content pointer-events-none w-full flex justify-center">${content}</div>
        </div>
    `;
}

// COMPONENTES INDIVIDUALES
export function getGrid2x2HTML() { return `<div class="relative lms-element is-rendered mb-10 bg-white" data-type="grid_2x2">${getBlockToolbar('grid_2x2')}<div class="grid rounded-md overflow-hidden" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 1px; padding: 1px; background-color: #ff5900;"><div class="p-6 flex gap-5 items-start bg-white group relative"><span class="material-symbols-outlined text-anahuac-orange text-[32px] editable-icon p-3 -m-2">warning</span><div class="editable-text flex-1"><h3 class="text-anahuac-orange font-bold font-serif text-xl mb-1">Title</h3><p class="text-sm text-gray-600">Lorem ipsum dolor sit amet.</p></div></div><div class="p-6 flex gap-5 items-start bg-white group relative"><span class="material-symbols-outlined text-anahuac-orange text-[32px] editable-icon p-3 -m-2">lightbulb</span><div class="editable-text flex-1"><h3 class="text-anahuac-orange font-bold font-serif text-xl mb-1">Title</h3><p class="text-sm text-gray-600">Lorem ipsum dolor sit amet.</p></div></div><div class="p-6 flex gap-5 items-start bg-white group relative"><span class="material-symbols-outlined text-anahuac-orange text-[32px] editable-icon p-3 -m-2">chat</span><div class="editable-text flex-1"><h3 class="text-anahuac-orange font-bold font-serif text-xl mb-1">Title</h3><p class="text-sm text-gray-600">Lorem ipsum dolor sit amet.</p></div></div><div class="p-6 flex gap-5 items-start bg-white group relative"><span class="material-symbols-outlined text-anahuac-orange text-[32px] editable-icon p-3 -m-2">ads_click</span><div class="editable-text flex-1"><h3 class="text-anahuac-orange font-bold font-serif text-xl mb-1">Title</h3><p class="text-sm text-gray-600">Lorem ipsum dolor sit amet.</p></div></div></div></div>`; }
export function getCuadroNaranjaHTML() { return `<div class="relative lms-element is-rendered mb-8" data-type="cuadro_naranja">${getBlockToolbar('cuadro_naranja')}<div class="bg-anahuac-orange text-white rounded-md p-8 shadow-md"><div class="editable-text font-sans text-left text-[15px] leading-relaxed"><p>Escribe aquí una conclusión, advertencia o cita importante.</p></div></div></div>`; }
export function getSeparadorHTML() { return `<div class="relative lms-element is-rendered mb-6 w-full" data-type="separador">${getBlockToolbar('separador')}<div class="w-full separator-wrapper" style="padding-top: 24px; padding-bottom: 24px;"><hr class="separator-line w-full" data-line-style="solid" data-line-color="#646464" data-line-thickness="1" style="border-top-width: 1px; border-top-style: solid; border-top-color: #646464;"></div></div>`; }
export function getAcordeonHTML() { return `<div class="relative lms-element is-rendered mb-1 w-full" data-type="acordeon">${getBlockToolbar('acordeon')}<div class="flex flex-col gap-2 accordion-wrapper w-full"><details class="group border border-gray-300 rounded bg-white [&_summary::-webkit-details-marker]:hidden"><summary class="flex items-center justify-start p-4 cursor-pointer font-serif text-anahuac-orange font-bold text-lg hover:bg-gray-50 rounded-t transition-colors group/summary relative text-left" style="display: flex; align-items: center; justify-content: flex-start; text-align: left;"><div class="flex items-center justify-start gap-4 w-full pr-16" style="display: flex; align-items: center; justify-content: flex-start; width: 100%; text-align: left; gap: 1rem;"><span class="text-anahuac-orange text-[16px] flex-shrink-0 leading-none transition-transform duration-200 group-open:rotate-90" style="margin-right: 1rem; display: inline-block;">▶</span><div class="editable-text flex-1 text-left" style="flex: 1; text-align: left; padding-left: 0.5rem;">Título del Tema</div></div><div class="absolute right-4 top-1/2 -translate-y-1/2 hidden group-hover/summary:flex items-center gap-2"><button type="button" class="text-gray-400 hover:text-green-500 p-1 rounded bg-white shadow-sm border border-gray-200 flex items-center justify-center transition-colors hover:bg-green-50" onclick="event.preventDefault(); event.stopPropagation(); window.addAccordionTopic(this); return false;" title="Añadir nuevo tema"><span class="material-symbols-outlined text-[18px]">add</span></button><button type="button" class="accordion-delete-btn text-gray-400 hover:text-red-500 p-1 rounded bg-white shadow-sm border border-gray-200 flex items-center justify-center transition-colors hover:bg-red-50" onclick="event.preventDefault(); event.stopPropagation(); window.removeAccordionTopic(this); return false;" title="Quitar este tema"><span class="material-symbols-outlined text-[18px]">delete</span></button></div></summary><div class="p-6 border-t border-gray-200 text-gray-700 bg-white lms-dropzone min-h-[50px]" data-sortable-active="false"><div class="editable-text text-[14px] space-y-4 text-left" style="text-align: left;"><p class="text-anahuac-purple font-bold font-serif">Materiales:</p><ol class="list-custom list-numbers pl-4"><li>Lectura: Introducción a la imagen.</li></ol></div></div></details></div></div>`; }
export function getIconoSueltoHTML() { return `<div class="relative lms-element is-rendered mb-6 w-full text-left overflow-visible block transition-transform duration-200" data-type="icono_suelto">${getBlockToolbar('icono_suelto')}<span class="material-symbols-outlined editable-icon text-[64px] text-anahuac-orange drop-shadow-sm cursor-pointer p-2 hover:bg-gray-100 rounded transition-colors inline-flex select-none" style="display:inline-flex; align-items:center; justify-content:center;">star</span></div>`; }
export function getTabsHTML() { const uid = Date.now().toString(36); return `<div class="relative mb-8 lms-element is-rendered" data-type="pestanas" data-orientation="horizontal">${getBlockToolbar('pestanas')}<div class="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-3 md:p-5 tabs-main-container flex flex-col"><div class="flex border-b border-gray-200 mb-3 overflow-x-auto tab-buttons-container"><button type="button" class="px-3 py-1.5 border-b-2 border-anahuac-orange text-anahuac-orange font-bold font-serif text-base transition-colors focus:outline-none flex-shrink-0" onclick="toggleLmsTab(this, 'tab-${uid}-1')"><span class="editable-text inline-block min-w-[30px]">Pestaña 1</span></button><button type="button" class="px-3 py-1.5 border-b-2 border-transparent text-gray-500 font-bold font-serif text-base hover:text-anahuac-orange transition-colors focus:outline-none flex-shrink-0" onclick="toggleLmsTab(this, 'tab-${uid}-2')"><span class="editable-text inline-block min-w-[30px]">Pestaña 2</span></button></div><div class="relative min-h-[120px] flex-1 tabs-panes-wrapper"><div id="tab-${uid}-1" class="lms-tab-pane flex flex-col gap-4 animate-fade-in lms-dropzone min-h-[80px]" style="display: flex;"><div class="text-gray-700 leading-relaxed editable-text font-sans text-left text-[15px]"><p>Contenido pestaña 1.</p></div></div><div id="tab-${uid}-2" class="lms-tab-pane hidden flex-col gap-4 animate-fade-in lms-dropzone min-h-[80px]" style="display: none;"><div class="text-gray-700 leading-relaxed editable-text font-sans text-left text-[15px]"><p>Contenido pestaña 2.</p></div></div></div></div></div>`; }
export function getCajaTextoHTML() { return `<div class="relative mb-6 lms-element is-rendered" data-type="caja_texto">${getBlockToolbar('caja_texto')}<div class="w-full bg-white border border-gray-200 border-l-4 border-l-anahuac-orange rounded-lg shadow-sm pt-6 pl-8 pb-[23px] pr-6 md:p-8 lms-dropzone min-h-[100px] flex flex-col gap-2" data-sortable-active="false"><h3 class="text-xl font-serif text-anahuac-purple dark:text-white font-bold mb-3 editable-text relative group/h3"><button class="absolute -right-2 -top-2 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover/h3:flex items-center justify-center z-50 shadow-sm hover:bg-red-600 transition-colors" onclick="this.parentElement.remove()" title="Eliminar texto"><span class="material-symbols-outlined text-[10px]">close</span></button>Título de la Caja (Opcional)</h3><div class="text-gray-700 leading-relaxed editable-text font-sans text-left text-[15px] relative group/p -mt-[9px]"><button class="absolute -right-2 -top-2 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover/p:flex items-center justify-center z-50 shadow-sm hover:bg-red-600 transition-colors" onclick="this.parentElement.remove()" title="Eliminar texto"><span class="material-symbols-outlined text-[10px]">close</span></button><p style="padding-top: 0px; margin-left: 0px; margin-top: 0px;">Escribe aquí el contenido destacado. Usa esta caja para notas importantes.</p></div></div></div>`; }
export function getTituloBasicoHTML() { return `<div class="relative mb-6 lms-element is-rendered">${getBlockToolbar('titulo_basico')}<h2 class="text-4xl font-serif text-anahuac-orange text-center font-bold editable-text">Escribe tu título aquí</h2></div>`; }
export function getTituloImagenHTML() {
    return `<div class="relative mb-8 lms-element is-rendered title-image-element" data-type="titulo_imagen" data-title-contrast="dark" data-title-min-height="0" data-title-padding="40">
        ${getBlockToolbar('titulo_imagen')}
        <div class="title-image-surface relative w-full rounded-xl overflow-hidden bg-cover bg-center flex items-center justify-center px-8 md:px-12" data-background-url="${DEFAULT_TITLE_IMAGE_URL}" style="background-image: url('${DEFAULT_TITLE_IMAGE_URL}'); background-size: cover; background-position: center; min-height: 0px; height: auto; padding-top: 40px; padding-bottom: 40px;">
            <div class="absolute inset-0 pointer-events-none" style="background: linear-gradient(90deg, rgba(0,0,0,0.04), transparent 30%, transparent 70%, rgba(0,0,0,0.04));"></div>
            <h2 class="title-image-text relative z-10 text-[32px] font-serif text-center font-bold editable-text leading-tight" style="color: #ffffff; font-size: 32px; text-shadow: 0 2px 2px rgba(0,0,0,0.9), 0 4px 8px rgba(0,0,0,0.72), 0 0 18px rgba(0,0,0,0.58);">Escribe tu título aquí</h2>
        </div>
    </div>`;
}
export function getParrafoBasicoHTML() { return `<div class="relative mb-6 lms-element is-rendered">${getBlockToolbar('parrafo_basico')}<div class="text-gray-700 leading-relaxed editable-text font-sans text-left text-[15px]"><p>Escribe tu párrafo aquí. Haz doble clic para editar o añadir viñetas.</p></div></div>`; }
export function getFlipcardHTML() {
    return `<div class="relative lms-element is-rendered mb-10 w-full flex justify-center" data-type="flipcard">
        ${getBlockToolbar('flipcard')}
        <div class="flipcards-wrapper flex flex-row flex-wrap justify-center gap-6 w-full items-stretch transition-all duration-300">
            ${getSingleFlipcardItemHTML()}
        </div>
    </div>`;
}

export function getSingleFlipcardItemHTML() {
    return `
    <div class="flipcard-item relative hover:z-50 group/fc w-[210px] min-h-[280px] [perspective:1000px] cursor-pointer flex-shrink-0" style="width: 210px; min-height: 280px;">
        <!-- Inner Controls -->
        <div class="flipcard-item-controls absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-[100] opacity-0 group-hover/fc:opacity-100 transition-opacity">
            <div class="relative group/valign">
                <button type="button" class="bg-white text-gray-400 hover:text-anahuac-orange p-1 rounded shadow-md border border-gray-100" title="Alineación Vertical">
                    <span class="material-symbols-outlined text-[16px] pointer-events-none">align_vertical_center</span>
                </button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/valign:visible group-hover/valign:opacity-100 transition-all duration-200 delay-500 group-hover/valign:delay-0 z-[100]">
                    <div class="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1">
                        <div onclick="event.stopPropagation(); window.changeSideVerticalAlign(this, 'start')" class="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded cursor-pointer" title="Arriba"><span class="material-symbols-outlined text-[16px] pointer-events-none">align_vertical_top</span></div>
                        <div onclick="event.stopPropagation(); window.changeSideVerticalAlign(this, 'center')" class="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded cursor-pointer" title="Centro"><span class="material-symbols-outlined text-[16px] pointer-events-none">align_vertical_center</span></div>
                        <div onclick="event.stopPropagation(); window.changeSideVerticalAlign(this, 'end')" class="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded cursor-pointer" title="Abajo"><span class="material-symbols-outlined text-[16px] pointer-events-none">align_vertical_bottom</span></div>
                    </div>
                </div>
            </div>
            <div class="relative group/color">
                <button type="button" class="bg-white text-gray-400 hover:text-anahuac-orange p-1 rounded shadow-md border border-gray-100" title="Color de Fondo">
                    <span class="material-symbols-outlined text-[16px] pointer-events-none">palette</span>
                </button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/color:visible group-hover/color:opacity-100 transition-all duration-200 delay-500 group-hover/color:delay-0 z-[100]">
                    <div class="flex bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 gap-1">
                        <div onclick="event.stopPropagation(); window.changeSideColor(this, 'orange')" class="w-5 h-5 rounded-full bg-[#ff5900] hover:ring-2 ring-offset-1 ring-[#ff5900] cursor-pointer"></div>
                        <div onclick="event.stopPropagation(); window.changeSideColor(this, 'purple')" class="w-5 h-5 rounded-full bg-[#5d428c] hover:ring-2 ring-offset-1 ring-[#5d428c] cursor-pointer"></div>
                        <div onclick="event.stopPropagation(); window.changeSideColor(this, 'gray-dark')" class="w-5 h-5 rounded-full bg-gray-600 hover:ring-2 ring-offset-1 ring-gray-600 cursor-pointer"></div>
                        <div onclick="event.stopPropagation(); window.changeSideColor(this, 'gray-light')" class="w-5 h-5 rounded-full bg-gray-200 hover:ring-2 ring-offset-1 ring-gray-200 cursor-pointer"></div>
                        <div onclick="event.stopPropagation(); window.changeSideColor(this, 'white')" class="w-5 h-5 rounded-full bg-white border border-gray-300 hover:ring-2 ring-offset-1 ring-gray-300 cursor-pointer"></div>
                    </div>
                </div>
            </div>
            <div class="relative group/img">
                <button type="button" class="bg-white text-gray-400 hover:text-anahuac-orange p-1 rounded shadow-md border border-gray-100" title="Imagen">
                    <span class="material-symbols-outlined text-[16px] pointer-events-none">image</span>
                </button>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 pb-1 opacity-0 invisible group-hover/img:visible group-hover/img:opacity-100 transition-all duration-200 delay-500 group-hover/img:delay-0 z-[100]">
                    <div class="w-32 bg-white p-2 text-gray-700 rounded-lg shadow-xl border border-gray-200 flex flex-col gap-2">
                        <div onclick="event.stopPropagation(); window.promptSideImage(this)" class="text-xs hover:bg-gray-100 p-1 rounded cursor-pointer font-bold text-anahuac-purple">URL Imagen...</div>
                        <div onclick="event.stopPropagation(); window.removeSideImage(this)" class="text-xs hover:bg-gray-100 p-1 rounded cursor-pointer text-red-500">Quitar</div>
                        <div class="h-px bg-gray-200 w-full"></div>
                        <div class="text-[10px] text-gray-400 uppercase tracking-wider text-center">Posición</div>
                        <div class="grid grid-cols-3 gap-1">
                            <div onclick="event.stopPropagation(); window.changeSideImagePos(this, 'top left')" class="h-4 bg-gray-100 hover:bg-gray-300 cursor-pointer rounded-sm" title="Arriba Izquierda"></div>
                            <div onclick="event.stopPropagation(); window.changeSideImagePos(this, 'top center')" class="h-4 bg-gray-100 hover:bg-gray-300 cursor-pointer rounded-sm" title="Arriba Centro"></div>
                            <div onclick="event.stopPropagation(); window.changeSideImagePos(this, 'top right')" class="h-4 bg-gray-100 hover:bg-gray-300 cursor-pointer rounded-sm" title="Arriba Derecha"></div>
                            <div onclick="event.stopPropagation(); window.changeSideImagePos(this, 'center left')" class="h-4 bg-gray-100 hover:bg-gray-300 cursor-pointer rounded-sm" title="Centro Izquierda"></div>
                            <div onclick="event.stopPropagation(); window.changeSideImagePos(this, 'center center')" class="h-4 bg-gray-200 hover:bg-gray-400 cursor-pointer rounded-sm" title="Centro"></div>
                            <div onclick="event.stopPropagation(); window.changeSideImagePos(this, 'center right')" class="h-4 bg-gray-100 hover:bg-gray-300 cursor-pointer rounded-sm" title="Centro Derecha"></div>
                            <div onclick="event.stopPropagation(); window.changeSideImagePos(this, 'bottom left')" class="h-4 bg-gray-100 hover:bg-gray-300 cursor-pointer rounded-sm" title="Abajo Izquierda"></div>
                            <div onclick="event.stopPropagation(); window.changeSideImagePos(this, 'bottom center')" class="h-4 bg-gray-100 hover:bg-gray-300 cursor-pointer rounded-sm" title="Abajo Centro"></div>
                            <div onclick="event.stopPropagation(); window.changeSideImagePos(this, 'bottom right')" class="h-4 bg-gray-100 hover:bg-gray-300 cursor-pointer rounded-sm" title="Abajo Derecha"></div>
                        </div>
                    </div>
                </div>
            </div>
            <button type="button" class="bg-white text-gray-400 hover:text-red-500 p-1 rounded shadow-md border border-gray-100" onclick="event.stopPropagation(); window.removeFlipcardItem(this)" title="Eliminar Tarjeta">
                <span class="material-symbols-outlined text-[16px] pointer-events-none">delete</span>
            </button>
        </div>

        <div class="flipcard-inner relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d]" onclick="if(event.target.closest('.editable-text') || event.target.closest('button')) return; this.closest('.flipcard-item').classList.toggle('is-flipped');">
            <!-- Front -->
            <div class="flipcard-front lms-dropzone absolute inset-0 w-full h-full [backface-visibility:hidden] bg-anahuac-orange text-white rounded-xl shadow-lg border border-gray-200 p-6 flex flex-col items-center justify-center overflow-hidden bg-cover bg-center">
                <div class="flipcard-overlay absolute inset-0 bg-black/50 hidden pointer-events-none"></div>
                <h2 class="relative z-10 text-2xl font-bold font-serif mb-2 w-full text-center editable-text">Frente</h2>
                <div class="relative z-10 font-sans text-[15px] opacity-90 w-full text-center editable-text"><p>Haga clic o use los controles para voltear la carta.</p></div>
            </div>
            <!-- Back -->
            <div class="flipcard-back lms-dropzone absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-white text-gray-800 rounded-xl shadow-lg border border-gray-200 p-6 flex flex-col items-center justify-center overflow-hidden bg-cover bg-center">
                <div class="flipcard-overlay absolute inset-0 bg-black/50 hidden pointer-events-none"></div>
                <h2 class="relative z-10 text-2xl font-bold font-serif mb-2 text-anahuac-orange w-full text-center editable-text">Dorso</h2>
                <div class="relative z-10 font-sans text-[15px] text-gray-600 w-full text-center editable-text"><p>Al voltear la carta verás esta información extendida.</p></div>
            </div>
        </div>
    </div>
    `;
}

export function getTablaDinamicaHTML() { 
    return `<div class="relative mb-6 lms-element is-rendered w-full group/table" data-type="tabla_dinamica" data-table-style="standard">
        ${getBlockToolbar('tabla_dinamica')}
        <div class="relative w-full overflow-x-auto overflow-y-hidden table-container p-4" onpaste="if(window.handleTablePaste) window.handleTablePaste(event, this)">
            <table class="w-full border-collapse border border-gray-300 text-sm font-sans theme-standard transition-colors break-words" style="word-wrap: break-word; overflow-wrap: break-word;">
                <thead>
                    <tr>
                        <th class="border border-gray-300 p-3 bg-gray-100 text-left font-bold text-gray-800 relative group/th">
                            <div class="editable-text min-h-[1.5em]">Encabezado 1</div>
                        </th>
                        <th class="border border-gray-300 p-3 bg-gray-100 text-left font-bold text-gray-800 relative group/th">
                            <div class="editable-text min-h-[1.5em]">Encabezado 2</div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="group/tr relative">
                        <td class="border border-gray-300 p-3 text-gray-700 relative group/td">
                            <div class="editable-text min-h-[1.5em]">Celda 1</div>
                        </td>
                        <td class="border border-gray-300 p-3 text-gray-700 relative group/td">
                            <div class="editable-text min-h-[1.5em]">Celda 2</div>
                        </td>
                    </tr>
                    <tr class="group/tr relative">
                        <td class="border border-gray-300 p-3 text-gray-700 relative group/td">
                            <div class="editable-text min-h-[1.5em]">Celda 3</div>
                        </td>
                        <td class="border border-gray-300 p-3 text-gray-700 relative group/td">
                            <div class="editable-text min-h-[1.5em]">Celda 4</div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>`;
}
export function getImagenSueltaHTML() { 
    return `<div class="relative mb-6 lms-element is-rendered w-full overflow-visible group/image" tabindex="0" onpaste="handleImagePaste(event, this)" data-type="imagen_suelta">
        ${getBlockToolbar('imagen_suelta')}
        <div class="image-placeholder w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-10 text-center transition-colors">
            <span class="material-symbols-outlined text-5xl text-gray-400 mb-2">image</span>
            <span class="text-gray-500 font-bold font-sans block mb-4">Inserta una imagen</span>
            <div class="flex flex-col items-center justify-center gap-4">
                <div class="flex items-center justify-center gap-4">
                    <button class="bg-white border hover:bg-gray-100 text-gray-700 px-4 py-2 rounded shadow-sm text-sm font-bold flex items-center gap-2" onclick="window.triggerStandaloneImage(this)">
                        <span class="material-symbols-outlined text-base">upload_file</span> Subir PC
                    </button>
                    <div class="bg-white border text-gray-500 px-4 py-2 rounded shadow-sm text-sm font-bold flex items-center gap-2" title="Selecciona este recuadro y presiona Ctrl+V">
                        <span class="material-symbols-outlined text-base">content_paste</span> Ctrl+V
                    </div>
                    <button class="bg-anahuac-orange hover:bg-orange-600 text-white px-4 py-2 rounded shadow-sm text-sm font-bold flex items-center gap-2" onclick="window.openGalleryModal(this.closest('.lms-element'))">
                        <span class="material-symbols-outlined text-base">photo_library</span> Galería
                    </button>
                </div>
                <div class="flex items-center justify-center gap-2">
                    <input type="text" placeholder="Pega URL de la imagen..." class="px-3 py-2 border rounded-md text-sm w-64 focus:outline-none focus:ring-1 focus:ring-anahuac-orange" onkeydown="window.handleImageUrl(this, event)">
                    <button class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded shadow-sm text-sm font-bold" onclick="window.handleImageUrl(this.previousElementSibling)">Aplicar</button>
                </div>
            </div>
        </div>
        <input type="file" accept="image/*" class="hidden" onchange="handleStandaloneImage(this)">
        <div class="flex justify-center flex-col items-center w-full py-2">
            <div class="image-wrapper overflow-hidden transition-all ease-out" style="width: 50%; border-radius: 0.5rem; box-shadow: none; aspect-ratio: auto; display: none;">
                <img src="" class="uploaded-image block transition-all ease-out w-full h-full object-cover" style="transform: rotate(0deg); object-position: 50% 50%;" data-rotation="0">
            </div>
        </div>
    </div>`; 
}

export function getCalculadoraHTML() {
    return `<div class="relative mb-6 lms-element is-rendered w-full group/calc" data-type="calculadora_html">
        ${getBlockToolbar('calculadora_html')}
        <div class="calc-placeholder w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors hover:bg-gray-100" onpaste="window.handleCalculadoraPaste(event, this)">
            <span class="material-symbols-outlined text-5xl mb-3 text-gray-400">functions</span>
            <h3 class="text-lg font-bold text-gray-700 mb-2 font-serif">Insertar Funciones Externas (HTML/JS)</h3>
            <p class="text-sm text-gray-500 mb-4">Sube un archivo .html o pega (Ctrl+V) tu código aquí.</p>
            <div class="flex items-center justify-center gap-4">
                <input type="file" accept=".html,.htm" class="hidden" onchange="window.handleCalculadoraUpload(this)">
                <button type="button" class="bg-white border hover:bg-gray-100 text-gray-700 px-4 py-2 rounded shadow-sm text-sm font-bold flex items-center gap-2" onclick="this.previousElementSibling.click()">
                    <span class="material-symbols-outlined text-base">upload_file</span> Subir archivo
                </button>
                <div class="bg-white border text-gray-500 px-4 py-2 rounded shadow-sm text-sm font-bold flex items-center gap-2" title="Selecciona este recuadro y presiona Ctrl+V">
                    <span class="material-symbols-outlined text-base">content_paste</span> Ctrl+V
                </div>
            </div>
            <textarea class="hidden calc-raw-code"></textarea>
            <button type="button" class="bg-anahuac-orange text-white px-6 py-2 rounded font-bold shadow hover:bg-orange-600 transition-colors mt-4 hidden calc-process-btn" onclick="window.processCalculadora(this.closest('.lms-element'))">Procesar e Insertar</button>
        </div>
        <div class="calc-result hidden w-full rounded-lg bg-white relative p-4 pt-8 group/iframe">
            <div class="absolute top-0 left-0 right-0 h-6 bg-gray-50 border-b border-gray-200 rounded-t-lg drag-handle cursor-grab flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-50" title="Arrastrar para mover">
                <span class="material-symbols-outlined text-gray-400 text-[18px] pointer-events-none">drag_indicator</span>
            </div>
        </div>
    </div>`;
}

export function getEmbedHTML(platform: string) {
    let icon = 'link'; let pName = 'Contenido Externo';
    if (platform === 'embed_youtube') { icon = 'smart_display'; pName = 'YouTube'; }
    if (platform === 'embed_vimeo') { icon = 'videocam'; pName = 'Vimeo'; }
    if (platform === 'embed_genially') { icon = 'auto_awesome'; pName = 'Genially'; }
    if (platform === 'embed_canva') { icon = 'palette'; pName = 'Canva'; }
    if (platform === 'embed_sketchfab') { icon = 'view_in_ar'; pName = 'Sketchfab'; }
    if (platform === 'embed_gamma') { icon = 'view_carousel'; pName = 'Gamma'; }

    return `<div class="relative mb-6 lms-element is-rendered w-full" data-type="${platform}">${getBlockToolbar(platform)}<div class="w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center embed-placeholder transition-colors hover:bg-gray-100"><span class="material-symbols-outlined text-5xl mb-3 text-gray-400">${icon}</span><h3 class="text-lg font-bold text-gray-700 mb-2 font-serif">Insertar contenido de ${pName}</h3><p class="text-sm text-gray-500 mb-4">Pega la URL directa o el código iframe de incrustación.</p><input type="text" placeholder="Ej. https://www.youtube.com/watch?v=..." class="w-full max-w-lg p-3 border border-gray-300 rounded mb-4 text-sm embed-input focus:outline-none focus:ring-2 focus:ring-anahuac-orange" onkeydown="if(event.key === 'Enter') processEmbed(this, '${platform}')"><br><button type="button" onclick="processEmbed(this, '${platform}')" class="bg-anahuac-orange text-white px-6 py-2 rounded font-bold shadow hover:bg-orange-600 transition-colors">Incrustar</button></div><div class="embed-result hidden w-full rounded-lg overflow-hidden shadow-lg bg-black relative pt-6 group/iframe">
            <div class="absolute top-0 left-0 right-0 h-6 bg-gray-800 border-b border-gray-700 drag-handle cursor-grab flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-50" title="Arrastrar para mover">
                <span class="material-symbols-outlined text-gray-400 text-[18px] pointer-events-none">drag_indicator</span>
            </div>
        </div></div>`;
}

// Para PÁGINAS MAESTRAS - simplificadas un poco
export function getBienvenidaHTML() {
    return `
        <div class="relative w-full rounded-lg flex flex-col items-center lms-element is-rendered mb-8">
            <div class="block-toolbar absolute top-4 right-4 z-40 flex gap-2"><div class="drag-handle cursor-grab bg-white text-gray-500 p-2 rounded shadow-md border border-gray-200 hover:text-anahuac-orange flex items-center justify-center"><span class="material-symbols-outlined pointer-events-none">drag_indicator</span></div><button type="button" class="bg-red-500 text-white w-10 h-10 rounded flex items-center justify-center shadow-md hover:bg-red-600" onclick="deleteBlock(this)"><span class="material-symbols-outlined">delete</span></button></div>
            <div class="lms-dropzone bg-white rounded-xl shadow-2xl z-20 w-full p-10 md:p-16 relative min-h-[400px] flex flex-col">
                ${getTituloBasicoHTML().replace('Escribe tu título aquí', 'Nombre del curso')}
                ${getParrafoBasicoHTML()}
                <div class="relative lms-element is-rendered mb-8">${getBlockToolbar('hr')}<hr class="border-t border-gray-200 w-full"></div>
                ${getTituloBasicoHTML().replace('Escribe tu título aquí', 'Metodología del curso')}
                ${getParrafoBasicoHTML()}
                <div class="relative lms-element is-rendered mb-10">${getBlockToolbar('lista')}<div class="editable-text"><ul class="list-custom list-numbers text-gray-700 space-y-4 font-sans"><li>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</li><li>Ut quis libero sit amet nulla ullamcorper venenatis.</li></ul></div></div>
                ${getGrid2x2HTML()}
                ${getDynamicFooterHTML('lineas')}
            </div>
        </div>
    `;
}

export function getReferenciasImporterHTML() {
    return `<div class="relative lms-element is-rendered mb-8 references-importer-container" data-type="referencias_importer">
        ${getBlockToolbar('referencias_importer')}
        <div class="w-full mt-2 mb-2 p-6 border-2 border-dashed border-gray-300 rounded bg-gray-50 flex flex-col items-center justify-center gap-4 transition-all hover:bg-gray-100 relative overflow-hidden group/paste">
            <span class="material-symbols-outlined text-4xl text-gray-400 pointer-events-none group-focus-within/paste:text-anahuac-orange">content_paste</span>
            <p class="text-sm text-gray-500 font-sans text-center pointer-events-none"><b>Haz clic aquí y presiona Ctrl+V / Cmd+V</b><br>para pegar tus referencias. Se separarán automáticamente.</p>
            <button type="button" onclick="window.pasteReferencesClick(this)" class="px-5 py-2.5 bg-anahuac-orange text-white rounded font-bold hover:bg-orange-600 shadow-md flex items-center justify-center gap-2 transition-colors relative z-20">
                <span class="material-symbols-outlined text-[20px] pointer-events-none">content_paste_go</span> Pegar usando botón
            </button>
            <textarea class="absolute inset-0 w-full h-full opacity-0 cursor-pointer resize-none z-10" onpaste="window.handleReferencesPasteArea(event, this)" placeholder="Pega aquí..."></textarea>
        </div>
    </div>`;
}

export function getReferenciaItemHTML(text = "Referencia", url = "") {
    let linkHTML = '';
    if (url) {
        linkHTML = `<div class="mt-1 flex items-center gap-2 reference-link-container group/link"><a href="${url}" target="_blank" class="text-anahuac-orange hover:underline font-serif font-bold reference-link" title="${url}">Link</a><button type="button" onclick="event.preventDefault(); event.stopPropagation(); window.editReferenceLink(this);" class="opacity-0 group-hover/link:opacity-100 transition-opacity bg-gray-100 hover:bg-gray-200 text-gray-500 rounded flex items-center justify-center p-0.5 cursor-pointer z-10 relative" title="Editar enlace"><span class="material-symbols-outlined text-[16px] pointer-events-none">edit</span></button></div>`;
    }
    return `<div class="relative lms-element is-rendered hover:border-anahuac-orange" style="margin-bottom: 2px;" data-type="referencia_item">
        ${getBlockToolbar('referencia_item')}
        <div class="flex items-start gap-4 p-4 border border-gray-200 rounded-lg bg-white group/ref hover:border-anahuac-orange transition-colors">
            <span class="material-symbols-outlined text-anahuac-orange editable-icon select-none flex-shrink-0 cursor-pointer hover:bg-orange-50 rounded transition-colors" style="font-size: 70px; line-height: 1;" title="Doble clic para cambiar icono">description</span>
            <div class="flex-1 font-sans text-anahuac-dark leading-relaxed text-[16px]">
                <div class="editable-text min-h-[1.5em] break-words">${text}</div>
                ${linkHTML}
            </div>
        </div>
    </div>`;
}

export function getReferenciasHTML() {
    return `
        <div class="relative w-full rounded-lg flex flex-col items-center lms-element is-rendered mb-8">
            <div class="block-toolbar absolute top-4 right-4 z-40 flex gap-2"><div class="drag-handle cursor-grab bg-white text-gray-500 p-2 rounded shadow-md border border-gray-200 hover:text-anahuac-orange flex items-center justify-center"><span class="material-symbols-outlined pointer-events-none">drag_indicator</span></div><button type="button" class="bg-red-500 text-white w-10 h-10 rounded flex items-center justify-center shadow-md hover:bg-red-600" onclick="deleteBlock(this)"><span class="material-symbols-outlined">delete</span></button></div>
            <div class="lms-dropzone bg-white rounded-xl shadow-2xl z-20 w-full p-10 md:p-16 relative min-h-[400px] flex flex-col">
                ${getTituloBasicoHTML().replace('Escribe tu título aquí', 'Referencias')}
                ${getReferenciasImporterHTML()}
                ${getDynamicFooterHTML('solido')}
            </div>
        </div>
    `;
}

export function getConclusionesHTML() {
    return `
        <div class="relative w-full rounded-lg flex flex-col items-center lms-element is-rendered mb-8">
            <div class="block-toolbar absolute top-4 right-4 z-40 flex gap-2"><div class="drag-handle cursor-grab bg-white text-gray-500 p-2 rounded shadow-md border border-gray-200 hover:text-anahuac-orange flex items-center justify-center"><span class="material-symbols-outlined pointer-events-none">drag_indicator</span></div><button type="button" class="bg-red-500 text-white w-10 h-10 rounded flex items-center justify-center shadow-md hover:bg-red-600" onclick="deleteBlock(this)"><span class="material-symbols-outlined">delete</span></button></div>
            <div class="lms-dropzone bg-white rounded-xl shadow-2xl z-20 w-full p-10 md:p-16 relative min-h-[400px] flex flex-col">
                ${getTituloBasicoHTML().replace('Escribe tu título aquí', 'Conclusiones')}
                ${getParrafoBasicoHTML()}
                <div class="relative lms-element is-rendered mb-6 mt-10">${getBlockToolbar('titulo_basico')}<h2 class="text-2xl font-serif text-anahuac-orange text-left font-bold editable-text">Referencias</h2></div>
                <div class="relative lms-element is-rendered mb-10">${getBlockToolbar('lista')}<div class="editable-text"><ul class="list-custom list-disc text-gray-700 space-y-2 font-sans"><li>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</li><li>Ut quis libero sit amet nulla ullamcorper venenatis.</li></ul></div></div>
                ${getCuadroNaranjaHTML()}
                ${getDynamicFooterHTML('solido')}
            </div>
        </div>
    `;
}

export function getProfesorDatosHTML() { return `<div class="relative lms-element is-rendered w-full group/datos outline-none focus:ring-2 focus:ring-anahuac-orange rounded-md transition-all cursor-pointer" data-type="profesor_datos" ondblclick="window.openProfesorDatosModal(this)" title="Doble clic para editar datos">${getBlockToolbar('profesor_datos')}<div class="profesor-datos-container text-gray-700 font-sans text-sm space-y-3 w-full pl-2"><div class="flex gap-3 items-center group/card relative"><button type="button" class="absolute top-1/2 -translate-y-1/2 right-2 bg-white text-gray-400 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity z-10 p-0.5 rounded shadow-sm border border-gray-100" onclick="event.stopPropagation(); this.parentElement?.remove()" title="Eliminar"><span class="material-symbols-outlined text-[16px]">delete</span></button><span class="material-symbols-outlined text-gray-400 text-lg editable-icon select-none">school</span> <p>Grado de estudios</p></div><div class="flex gap-3 items-center group/card relative"><button type="button" class="absolute top-1/2 -translate-y-1/2 right-2 bg-white text-gray-400 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity z-10 p-0.5 rounded shadow-sm border border-gray-100" onclick="event.stopPropagation(); this.parentElement?.remove()" title="Eliminar"><span class="material-symbols-outlined text-[16px]">delete</span></button><span class="material-symbols-outlined text-gray-400 text-lg editable-icon select-none">call</span> <p>+52 442 000 0000</p></div><div class="flex gap-3 items-center group/card relative"><button type="button" class="absolute top-1/2 -translate-y-1/2 right-2 bg-white text-gray-400 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity z-10 p-0.5 rounded shadow-sm border border-gray-100" onclick="event.stopPropagation(); this.parentElement?.remove()" title="Eliminar"><span class="material-symbols-outlined text-[16px]">delete</span></button><span class="material-symbols-outlined text-gray-400 text-lg editable-icon select-none">mail</span> <p>correo@anahuac.mx</p></div><div class="flex gap-3 items-center group/card relative"><button type="button" class="absolute top-1/2 -translate-y-1/2 right-2 bg-white text-gray-400 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity z-10 p-0.5 rounded shadow-sm border border-gray-100" onclick="event.stopPropagation(); this.parentElement?.remove()" title="Eliminar"><span class="material-symbols-outlined text-[16px]">delete</span></button><span class="material-symbols-outlined text-gray-400 text-lg editable-icon select-none">pin_drop</span> <p>Querétaro, México</p></div><div class="flex gap-3 items-center group/card relative"><button type="button" class="absolute top-1/2 -translate-y-1/2 right-2 bg-white text-gray-400 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity z-10 p-0.5 rounded shadow-sm border border-gray-100" onclick="event.stopPropagation(); this.parentElement?.remove()" title="Eliminar"><span class="material-symbols-outlined text-[16px]">delete</span></button><span class="material-symbols-outlined text-gray-400 text-lg editable-icon select-none">link</span> <p class="text-blue-600 underline cursor-pointer">Linkedin / Web</p></div></div></div>`; }

export function getProfesorHTML() {
    return `
        <div class="relative w-full rounded-lg flex flex-col items-center lms-element is-rendered mb-8">
            <div class="block-toolbar absolute top-4 right-4 z-40 flex gap-2"><div class="drag-handle cursor-grab bg-white text-gray-500 p-2 rounded shadow-md border border-gray-200 hover:text-anahuac-orange flex items-center justify-center"><span class="material-symbols-outlined pointer-events-none">drag_indicator</span></div><button type="button" class="bg-red-500 text-white w-10 h-10 rounded flex items-center justify-center shadow-md hover:bg-red-600" onclick="deleteBlock(this)"><span class="material-symbols-outlined">delete</span></button></div>
            <div class="lms-dropzone bg-white rounded-xl shadow-2xl z-20 w-full p-10 md:p-16 relative min-h-[400px] flex flex-col">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-10 w-full mb-10">
                    <div class="min-w-0 flex flex-col items-center lms-dropzone" style="min-height: 200px;">
                        <div class="relative mb-6 lms-element is-rendered w-full overflow-visible" tabindex="0" onpaste="handleImagePaste(event, this)" data-type="profesor_img">
                            ${getBlockToolbar('profesor_img')}
                            <input type="file" accept="image/*" class="hidden" onchange="handleStandaloneImage(this)">
                            <img src="" class="uploaded-image hidden w-full aspect-square object-cover shadow-sm" data-rotation="0">
                            <div class="image-placeholder w-full aspect-square bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors cursor-pointer" onclick="this.parentElement.querySelector('input[type=file]').click()"><span class="material-symbols-outlined text-5xl text-gray-400">photo_camera</span></div>
                        </div>
                        <div class="relative lms-element is-rendered w-full mb-4">${getBlockToolbar('titulo_basico')}<h2 class="text-3xl font-serif text-anahuac-orange text-center font-bold editable-text leading-tight">Nombre del<br>profesor</h2></div>
                        ${getProfesorDatosHTML()}
                    </div>
                    <div class="min-w-0 flex flex-col gap-6 lms-dropzone" style="min-height: 200px;">
                        ${getParrafoBasicoHTML()}
                        ${getParrafoBasicoHTML()}
                    </div>
                </div>
                ${getDynamicFooterHTML('solido')}
            </div>
        </div>
    `;
}

export function getIndiceHTML() {
    return `
        <div class="relative w-full rounded-lg flex flex-col items-center lms-element is-rendered mb-8">
            <div class="block-toolbar absolute top-4 right-4 z-40 flex gap-2"><div class="drag-handle cursor-grab bg-white text-gray-500 p-2 rounded shadow-md border border-gray-200 hover:text-anahuac-orange flex items-center justify-center"><span class="material-symbols-outlined pointer-events-none">drag_indicator</span></div><button type="button" class="bg-red-500 text-white w-10 h-10 rounded flex items-center justify-center shadow-md hover:bg-red-600" onclick="deleteBlock(this)"><span class="material-symbols-outlined">delete</span></button></div>
            <div class="lms-dropzone bg-white rounded-xl shadow-2xl z-20 w-full p-10 md:p-16 relative min-h-[400px] flex flex-col">
                ${getTituloBasicoHTML().replace('Escribe tu título aquí', 'Índice')}
                ${getParrafoBasicoHTML()}
                <div class="w-full flex flex-col mt-8 lms-dropzone min-h-[100px]">
                    ${getAcordeonHTML().replace('Título del Tema', 'Tema 1')}
                </div>
                ${getDynamicFooterHTML('lineas')}
            </div>
        </div>
    `;
}

export function getRequerimientosHTML() {
    return `
        <div class="relative w-full rounded-lg flex flex-col items-center lms-element is-rendered mb-8">
            <div class="block-toolbar absolute top-4 right-4 z-40 flex gap-2"><div class="drag-handle cursor-grab bg-white text-gray-500 p-2 rounded shadow-md border border-gray-200 hover:text-anahuac-orange flex items-center justify-center"><span class="material-symbols-outlined pointer-events-none">drag_indicator</span></div><button type="button" class="bg-red-500 text-white w-10 h-10 rounded flex items-center justify-center shadow-md hover:bg-red-600" onclick="deleteBlock(this)"><span class="material-symbols-outlined">delete</span></button></div>
            <div class="lms-dropzone bg-white rounded-xl shadow-2xl z-20 w-full p-10 md:p-16 relative min-h-[400px] flex flex-col">
                ${getTituloBasicoHTML().replace('Escribe tu título aquí', 'Requerimientos del sistema')}
                <div class="relative lms-element is-rendered mb-4 mt-8">${getBlockToolbar('titulo_basico')}<h2 class="text-xl font-serif text-anahuac-orange text-left font-bold editable-text">Computadoras / Laptops</h2></div>
                <div class="relative lms-element is-rendered mb-4">${getBlockToolbar('parrafo_basico')}<div class="text-gray-700 editable-text font-sans text-[15px]"><p>Brightspace es compatible con los principales sistemas operativos de escritorio:</p></div></div>
                
                <div class="relative lms-element is-rendered mb-10 bg-white">${getBlockToolbar('grid_2x2')}<div class="border border-gray-300 rounded-md grid overflow-hidden bg-gray-200 gap-[1px]" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));"><div class="p-6 bg-white flex flex-col items-center justify-center text-center group/card relative"><button type="button" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity z-10" onclick="this.parentElement?.remove()" title="Eliminar"><span class="material-symbols-outlined text-[18px]">delete</span></button><img src="${GITHUB_REQ_IMAGES_URL}/windows.png" alt="Windows" class="w-12 h-12 mb-3 object-contain" /><div class="editable-text"><p class="text-xs text-gray-400">Microsoft</p><p class="text-sm font-bold text-gray-700">Windows 10 o superior</p></div></div><div class="p-6 bg-white flex flex-col items-center justify-center text-center group/card relative"><button type="button" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity z-10" onclick="this.parentElement?.remove()" title="Eliminar"><span class="material-symbols-outlined text-[18px]">delete</span></button><img src="${GITHUB_REQ_IMAGES_URL}/MacOS_logo.png" alt="Apple" class="w-12 h-12 mb-3 object-contain" /><div class="editable-text"><p class="text-xs text-gray-400">Apple</p><p class="text-sm font-bold text-gray-700">macOS 10 o superior</p></div></div></div></div>

                <div class="relative lms-element is-rendered mb-10 mt-8">${getBlockToolbar('titulo_basico')}<h2 class="text-xl font-serif text-anahuac-orange text-left font-bold editable-text">Dispositivos móviles</h2></div>
                <div class="relative lms-element is-rendered mb-4">${getBlockToolbar('parrafo_basico')}<div class="text-gray-700 editable-text font-sans text-[15px]"><p>Brightspace es compatible con los principales sistemas operativos móviles:</p></div></div>
                
                <div class="relative lms-element is-rendered mb-10 bg-white">${getBlockToolbar('grid_2x2')}<div class="border border-gray-300 rounded-md grid overflow-hidden bg-gray-200 gap-[1px]" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));"><div class="p-6 bg-white flex flex-col items-center justify-center text-center group/card relative"><button type="button" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity z-10" onclick="this.parentElement?.remove()" title="Eliminar"><span class="material-symbols-outlined text-[18px]">delete</span></button><img src="${GITHUB_REQ_IMAGES_URL}/android.png" alt="Android" class="w-12 h-12 mb-3 object-contain" /><div class="editable-text"><p class="text-xs text-gray-400">Google</p><p class="text-sm font-bold text-gray-700">Android 5 o superior</p></div></div><div class="p-6 bg-white flex flex-col items-center justify-center text-center group/card relative"><button type="button" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity z-10" onclick="this.parentElement?.remove()" title="Eliminar"><span class="material-symbols-outlined text-[18px]">delete</span></button><img src="${GITHUB_REQ_IMAGES_URL}/IOS.png" alt="Apple" class="w-12 h-12 mb-3 object-contain" /><div class="editable-text"><p class="text-xs text-gray-400">Apple</p><p class="text-sm font-bold text-gray-700">iOS 11 o superior</p></div></div></div></div>

                <div class="relative lms-element is-rendered mb-10 mt-8">${getBlockToolbar('titulo_basico')}<h2 class="text-xl font-serif text-anahuac-orange text-left font-bold editable-text">Navegadores web</h2></div>
                <div class="relative lms-element is-rendered mb-10 bg-white">${getBlockToolbar('grid_2x2')}<div class="border border-gray-300 rounded-md grid overflow-hidden bg-gray-200 gap-[1px]" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));"><div class="p-6 bg-white flex flex-col items-center justify-center text-center group/card relative"><button type="button" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity z-10" onclick="this.parentElement?.remove()" title="Eliminar"><span class="material-symbols-outlined text-[18px]">delete</span></button><img src="${GITHUB_REQ_IMAGES_URL}/chrome.png" alt="Chrome" class="w-12 h-12 mb-3 object-contain" /><div class="editable-text"><p class="text-xs text-gray-400">Google</p><p class="text-sm font-bold text-gray-700">Chrome</p></div></div><div class="p-6 bg-white flex flex-col items-center justify-center text-center group/card relative"><button type="button" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity z-10" onclick="this.parentElement?.remove()" title="Eliminar"><span class="material-symbols-outlined text-[18px]">delete</span></button><img src="${GITHUB_REQ_IMAGES_URL}/firefox.png" alt="Firefox" class="w-12 h-12 mb-3 object-contain" /><div class="editable-text"><p class="text-xs text-gray-400">Mozilla</p><p class="text-sm font-bold text-gray-700">Firefox</p></div></div><div class="p-6 bg-white flex flex-col items-center justify-center text-center group/card relative"><button type="button" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity z-10" onclick="this.parentElement?.remove()" title="Eliminar"><span class="material-symbols-outlined text-[18px]">delete</span></button><img src="${GITHUB_REQ_IMAGES_URL}/edge.png" alt="Edge" class="w-12 h-12 mb-3 object-contain" /><div class="editable-text"><p class="text-xs text-gray-400">Microsoft</p><p class="text-sm font-bold text-gray-700">Edge</p></div></div></div></div>

                <div class="relative lms-element is-rendered mb-8">${getBlockToolbar('caja_texto')}<div class="w-full bg-white border border-anahuac-orange rounded-md p-6 flex gap-4 items-center"><div class="w-12 h-12 rounded border border-anahuac-orange flex items-center justify-center text-anahuac-orange font-bold flex-shrink-0"><span class="material-symbols-outlined text-[24px]">priority_high</span></div><div class="text-gray-700 editable-text font-sans text-sm w-full"><p><b>Internet Explorer</b> no se encuentra soportado y no se recomienda bajo ninguna circunstancia.</p></div></div></div>
                
                ${getDynamicFooterHTML('lineas')}
            </div>
        </div>
    `;
}

export function getPaginaBasicaHTML() {
    return `
        <div class="relative w-full rounded-lg flex flex-col items-center lms-element is-rendered mb-8">
            <div class="block-toolbar absolute top-4 right-4 z-40 flex gap-2"><div class="drag-handle cursor-grab bg-white text-gray-500 p-2 rounded shadow-md border border-gray-200 hover:text-anahuac-orange flex items-center justify-center"><span class="material-symbols-outlined pointer-events-none">drag_indicator</span></div><button type="button" class="bg-red-500 text-white w-10 h-10 rounded flex items-center justify-center shadow-md hover:bg-red-600" onclick="deleteBlock(this)"><span class="material-symbols-outlined">delete</span></button></div>
            <div class="lms-dropzone bg-white rounded-xl shadow-2xl z-20 w-full p-10 md:p-16 relative min-h-[400px] flex flex-col">
                ${getTituloBasicoHTML().replace('Escribe tu título aquí', 'Título de la Página')}
                ${getParrafoBasicoHTML()}
                ${getDynamicFooterHTML('lineas')}
            </div>
        </div>
    `;
}
