export type TutorialTopicId='interfaz'|'plantillas'|'disena'|'organiza'|'interactivos'|'imagenes'|'tablas'|'importa'|'exporta'|'medios';
export type CatalogTab='pages'|'elements'|'containers';
export interface TutorialTopic{id:TutorialTopicId;title:string;description:string;icon:string;duration:string}
export interface TutorialStep{id:string;title:string;text:string;selector:string;on:'right'|'left'|'top'|'bottom';tab?:CatalogTab}
export interface TutorialDefinition{tab?:CatalogTab;steps:TutorialStep[]}
const step=(id:string,title:string,text:string,selector:string,on:TutorialStep['on']='right',tab?:CatalogTab):TutorialStep=>({id,title,text,selector,on,tab});
const canvas='#scroll-container',tools='[data-tour="canvas-style-actions"]',workspaces='.project-tab-strip',menu='.project-menu-toggle';
const element=(type:string)=>`#tab-elements .catalog-item[data-type="${type}"]`;
export const TUTORIAL_TOPICS:TutorialTopic[]=[
 {id:'interfaz',title:'Conoce la interfaz',description:'Catálogo, lienzo, páginas del proyecto y vista previa.',icon:'dashboard',duration:'2 min'},
 {id:'plantillas',title:'Usa plantillas',description:'Arrastra estructuras completas y configura el footer global.',icon:'web',duration:'1 min'},
 {id:'disena',title:'Diseña y edita',description:'Textos, hipervínculos, duplicado y separación entre elementos.',icon:'design_services',duration:'2 min'},
 {id:'organiza',title:'Organiza páginas y grupos',description:'Crea páginas en lote y mueve o duplica varios elementos.',icon:'select_all',duration:'2 min'},
 {id:'interactivos',title:'Crea interacciones',description:'Botones, contenido encapsulado, pestañas y ejercicios.',icon:'touch_app',duration:'2 min'},
 {id:'imagenes',title:'Edita imágenes y texto',description:'Recorte libre, ajustes de color y texto sobre la imagen.',icon:'tune',duration:'2 min'},
 {id:'tablas',title:'Personaliza tablas',description:'Tablas dinámicas, retículas modulares, fondos y bordes.',icon:'dashboard_customize',duration:'2 min'},
 {id:'importa',title:'Importa contenido',description:'Continúa un proyecto o recupera un HTML del Builder.',icon:'upload_file',duration:'1 min'},
 {id:'exporta',title:'Guarda y copia a Brightspace',description:'Guarda el proyecto o copia el código del espacio activo.',icon:'content_copy',duration:'1 min'},
 {id:'medios',title:'Incluye medios externos',description:'Videos, Canva, Gamma y ajuste de altura de los recursos.',icon:'perm_media',duration:'2 min'}
];
export const TUTORIALS:Record<TutorialTopicId,TutorialDefinition>={
 interfaz:{tab:'pages',steps:[
  step('interface-help','Tu centro de ayuda','En el menú de tres líneas encontrarás Tutorial. Elige el tema que quieras repasar. Salir, la X o Escape cierran el recorrido.',menu,'bottom'),
  step('interface-tabs','Tu catálogo','Páginas reúne plantillas completas; Elementos, bloques individuales; Medios, recursos externos. Todos se incorporan arrastrándolos al lienzo.','[data-tour="catalog-tabs"]','bottom'),
  step('interface-canvas','Tu lienzo de trabajo','Edita aquí el contenido. Desplázate dentro del lienzo sin perder la barra superior ni el catálogo.',canvas,'left'),
  step('interface-pages','Varias páginas en un proyecto','Estas pestañas son espacios de trabajo independientes que conservan su contenido. No son las pestañas interactivas que ve el alumno.',workspaces,'bottom'),
  step('interface-preview','Comprueba el resultado','El simulador permite revisar distintos anchos antes de copiar el contenido a Brightspace.','[data-tour="preview"]','bottom'),
  step('interface-history','Deshacer y rehacer','Usa estas acciones o Ctrl+Z y Ctrl+Y para recorrer el historial de cambios.','[data-tour="history"]','bottom')
 ]},
 plantillas:{tab:'pages',steps:[
  step('templates-catalog','Elige una estructura','Bienvenida, Requerimientos, Referencias, Índice, Profesor, Conclusiones y Página Básica son puntos de partida editables.','[data-tour="pages-catalog"]'),
  step('templates-drag','Arrastra al lienzo','Mantén el clic en una tarjeta y arrástrala al lugar deseado. El catálogo se usa con drag and drop; no necesitas un botón de inserción.','[data-tour="page-template"]'),
  step('templates-customize','Personaliza los bloques','Cambia textos con doble clic. Los menús al pasar el cursor permiten mover, duplicar, editar y eliminar cada elemento.',canvas,'left'),
  step('templates-footer','Footer para todo el proyecto','El diseño elegido aquí se aplica a los footers de todas las páginas y a las nuevas que crees. Para cambiar solo uno, haz doble clic en ese footer del lienzo.',tools,'right','elements')
 ]},
 disena:{tab:'elements',steps:[
  step('design-catalog','Herramientas comunes y avanzadas','Los iconos morados identifican herramientas comunes y los naranjas, avanzadas. Puedes alternar el catálogo entre lista y cuadrícula.','[data-tour="elements-tab"]','bottom'),
  step('design-drag','Coloca un bloque','Arrastra títulos, párrafos, tablas o interactivos desde el catálogo hasta su posición en la página.',element('titulo_basico')),
  step('design-text','Texto e hipervínculos','Haz doble clic sobre el texto para abrir sus herramientas. Selecciona una frase y usa el enlace para pegar una URL. El rollover de un enlace permite reemplazarlo, quitarlo o cambiar su fuente y color.',element('parrafo_basico')),
  step('design-actions','Mover, duplicar y eliminar','Los seis puntitos arrastran el elemento completo. El icono de copiar lo duplica con su contenido y ajustes; eliminar está al extremo derecho.',canvas,'left'),
  step('design-spacing','Separaciones exactas','Los controles de cada división aparecen fuera del margen. Arriba y abajo ajustan cada mitad; el central ajusta ambas. Por defecto son 10 + 10 px; cada mitad admite de 0 a 30 px y se conserva al exportar.',canvas,'left'),
  step('design-boxes','Contenedores con estilo','Arrastra otros elementos dentro de las cajas. Sus menús ofrecen colores institucionales y opciones de borde; sus textos internos se editan como elementos.',element('caja_texto')),
  step('design-history','Revisa tus cambios','Ctrl+Z deshace y Ctrl+Y rehace. Usa también la vista previa para comprobar la adaptación del diseño.','[data-tour="history"]','bottom')
 ]},
 organiza:{tab:'elements',steps:[
  step('organize-pages','Crea páginas en lote','Usa agregar página. Activa el modo lista para añadir nombres consecutivos; puedes borrar o reordenar los campos antes de aceptar.','.project-tab-add','bottom'),
  step('organize-names','Nombres, colores y notas','Haz doble clic en una pestaña del proyecto para personalizarla. Arrastra las pestañas para cambiar su orden y consulta sus notas y checklist.',workspaces,'bottom'),
  step('organize-transfer','Lleva un elemento a otra página','Arrástralo desde sus seis puntitos y mantén el cursor sobre la pestaña de destino. El espacio cambia automáticamente; suéltalo en su nueva ubicación.',workspaces,'bottom'),
  step('organize-select','Selecciona varios elementos','Empieza a arrastrar en un espacio vacío, fuera de los bloques. El marco selecciona los elementos completos que toca, aunque solo los encierre parcialmente.',canvas,'left'),
  step('organize-group','Mueve o duplica la selección','La caja de selección ofrece seis puntitos más grandes y un botón de duplicar. Mueve el conjunto dentro de la página o a otra pestaña: conserva orden, contenido y separaciones.',canvas,'left'),
  step('organize-release','Libera la selección','Haz clic fuera de la caja para quitar la selección de grupo. Los elementos siguen siendo independientes.',canvas,'left')
 ]},
 interactivos:{tab:'elements',steps:[
  step('interactive-button','Un botón, tres acciones','Arrastra Botón interactivo. Elige encapsular elementos, abrir un hipervínculo o dejar la acción para después.',element('boton_interactivo')),
  step('interactive-encapsulate','Contenido que se despliega','Para encapsular, arrastra uno o varios elementos al área del botón. El alumno abre el contenido con una animación suave y lo cierra con las X superior e inferior.',element('boton_interactivo')),
  step('interactive-settings','Personaliza el botón','El engranaje configura su acción o abre el contenido para editarlo. También puedes cambiar texto, icono y gradiente institucional, mover, duplicar o eliminar el botón.',element('boton_interactivo')),
  step('interactive-tabs','Pestañas con altura dinámica','Arrastra Pestañas y coloca contenido dentro de cada una. Al cambiar de pestaña, el contenedor se expande o contrae suavemente y desplaza el contenido inferior.',element('pestanas')),
  step('interactive-more','Acordeones y tarjetas girables','Añade un tema desplegable o una flipcard. Arrastra los bloques a sus áreas de contenido y edita los textos con doble clic.',element('acordeon')),
  step('interactive-exercise','Ejercicios descargables','Arrastra este elemento para preparar un ejercicio. Sus opciones configuran el recurso que descargará el alumno.',element('ejercicio_descargable'))
 ]},
 imagenes:{tab:'elements',steps:[
  step('image-insert','Una imagen en tu diseño','Arrastra Imagen Dinámica. Elige una imagen de la galería, súbela desde PC o pega su URL.',element('imagen_suelta')),
  step('image-crop','Recorte libre','En el rollover de Recorte elige Libre. Arrastra los lados o las esquinas para ajustar el área; Aplicar guarda el recorte y Cancelar conserva el anterior.',element('imagen_suelta')),
  step('image-adjust','Ajustes no destructivos','El botón de ajustes ofrece sliders de matiz HUE, contraste, brillo, saturación y filtro de color. No reemplaza el archivo original.',element('imagen_suelta')),
  step('image-text','Texto sobre la imagen','El botón de texto permite activarlo, quitarlo y ajustar el tamaño. Para editar el contenido y su formato, haz doble clic directamente en el texto.',element('imagen_suelta')),
  step('image-position','Mueve y redimensiona la caja','Pasa el cursor por el texto para mostrar su caja. Arrástrala para moverla o usa sus bordes y esquinas para cambiar sus dimensiones, siempre dentro de la imagen. Los ajustes se conservan al guardar, duplicar y exportar.',element('imagen_suelta'))
 ]},
 tablas:{tab:'elements',steps:[
  step('table-dynamic','Tabla Dinámica','Arrastra la tabla y usa sus menús de celdas, filas y columnas para editar su estructura. Las opciones de combinar respetan la dirección indicada.',element('tabla_dinamica')),
  step('table-grid','Tabla Grid con iconos','Combina iconos y texto en una retícula. Edita los textos e iconos directamente con doble clic.',element('grid_2x2')),
  step('table-modular','Una retícula modular','Arrastra Tabla modular para crear rectángulos de contenido y sus conexiones. Cada rectángulo tiene su propio menú de edición.',element('tabla_modular')),
  step('table-stroke','Fondos y bordes institucionales','Personaliza el relleno y el stroke de un rectángulo, una fila o una columna. El menú de cada rectángulo aparece sobre su propia área para mantener sus opciones accesibles.',element('tabla_modular'))
 ]},
 importa:{steps:[
  step('import-project','Abre un proyecto','Abrir proyecto o HTML permite recuperar un archivo .lmsproject con todas sus páginas para continuar editando.',menu,'bottom'),
  step('import-html','Recupera un HTML del Builder','Un HTML con estado editable se añade como una página. Un archivo .lmsproject abre el proyecto completo. Guarda después de importar.',menu,'bottom'),
  step('import-continue','Comprueba el resultado','Revisa las páginas y el contenido antes de continuar. El recorrido no añade ni borra elementos de tu diseño.',canvas,'left')
 ]},
 exporta:{steps:[
  step('export-preview','Revisa tu página','Comprueba el contenido en distintos anchos antes de llevarlo a Brightspace.','[data-tour="preview"]','bottom'),
  step('export-save','Conserva tu progreso','Guardar descarga el proyecto con todas sus páginas y ejercicios. Podrás abrirlo después para continuar editando.',menu,'bottom'),
  step('export-copy','Puedes copiar sin guardar','Copiar a Brightspace está siempre disponible. Si hay cambios pendientes, el aviso permite guardar el progreso o continuar sin guardar. Si ya está guardado, se copia directamente.','[data-tour="export-copy"]','bottom'),
  step('export-scope','Se copia el espacio activo','El código contiene la página activa y sus interacciones, sin herramientas del editor. El límite es de 2 millones de caracteres. El proyecto sigue siendo el respaldo editable de todas tus páginas.','[data-tour="export-copy"]','bottom')
 ]},
 medios:{tab:'containers',steps:[
  step('media-catalog','Recursos externos','Arrastra YouTube, Vimeo, Genially, Canva, Sketchfab, Gamma o Funciones externas. Después indica la URL o el código iframe.','[data-tour="media-catalog"]'),
  step('media-links','Abre la plataforma de origen','El icono de abrir en otra pestaña te lleva al sitio de cada plataforma. Para incorporar el recurso al lienzo, arrastra su tarjeta.','[data-tour="media-catalog"]'),
  step('media-height','Altura y ancho del recurso','El ancho respeta el margen de la página. La altura se ajusta automáticamente cuando el recurso lo permite; arrastra el área sensible inferior para ajustarla manualmente.',canvas,'left'),
  step('media-global','Fondo y footer','Personaliza el fondo y elige el footer global. Cambiar ese footer actualiza todas las páginas; un doble clic en un footer del lienzo modifica solo ese caso.',tools,'right','elements'),
  step('media-check','Revisa antes de compartir','Comprueba los recursos en vista previa. Su disponibilidad y el ajuste automático de altura dependen también del proveedor externo.','[data-tour="preview"]','bottom')
 ]}
};
