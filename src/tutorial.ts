import Shepherd from 'shepherd.js';
import type { StepOptions, StepOptionsButton, Tour } from 'shepherd.js';

export type TutorialTopicId =
  | 'interfaz'
  | 'plantillas'
  | 'disena'
  | 'importa'
  | 'exporta'
  | 'medios';

export interface TutorialTopic {
  id: TutorialTopicId;
  title: string;
  description: string;
  icon: string;
  duration: string;
}

export const TUTORIAL_TOPICS: TutorialTopic[] = [
  {
    id: 'interfaz',
    title: 'Conoce la interfaz',
    description: 'Ubica el catálogo, el lienzo y las herramientas principales.',
    icon: 'dashboard',
    duration: '2 min'
  },
  {
    id: 'plantillas',
    title: 'Usa plantillas',
    description: 'Comienza una página con una estructura completa y editable.',
    icon: 'web',
    duration: '1 min'
  },
  {
    id: 'disena',
    title: 'Diseña tu página',
    description: 'Agrega bloques, edita el contenido y revisa tus cambios.',
    icon: 'design_services',
    duration: '2 min'
  },
  {
    id: 'importa',
    title: 'Importa contenido',
    description: 'Continúa desde un archivo HTML o desde código copiado.',
    icon: 'upload_file',
    duration: '1 min'
  },
  {
    id: 'exporta',
    title: 'Exporta tu trabajo',
    description: 'Descarga o copia el HTML terminado para usarlo en tu LMS.',
    icon: 'download',
    duration: '1 min'
  },
  {
    id: 'medios',
    title: 'Incluye tus medios',
    description: 'Integra videos, recursos externos, fondos y logotipos.',
    icon: 'perm_media',
    duration: '2 min'
  }
];

type CatalogTab = 'pages' | 'elements' | 'containers';

interface TutorialStep {
  id: string;
  title: string;
  text: string;
  selector?: string;
  on?: NonNullable<StepOptions['attachTo']>['on'];
  extraHighlights?: string[];
}

interface TutorialDefinition {
  tab?: CatalogTab;
  steps: TutorialStep[];
}

const TUTORIALS: Record<TutorialTopicId, TutorialDefinition> = {
  interfaz: {
    tab: 'pages',
    steps: [
      {
        id: 'interface-help',
        title: 'Tu centro de ayuda',
        text: 'Desde este botón puedes abrir el tutorial cuando lo necesites y elegir únicamente el tema que quieras repasar.',
        selector: '[data-tour="tutorial-launcher"]',
        on: 'right'
      },
      {
        id: 'interface-sidebar',
        title: 'Catálogo de contenido',
        text: 'La barra lateral reúne plantillas completas, elementos individuales y medios externos.',
        selector: '[data-tour="sidebar"]',
        on: 'right'
      },
      {
        id: 'interface-tabs',
        title: 'Tres formas de comenzar',
        text: 'Cambia entre Páginas, Elementos y Medios según lo que quieras añadir al diseño.',
        selector: '[data-tour="catalog-tabs"]',
        on: 'bottom'
      },
      {
        id: 'interface-canvas',
        title: 'Tu lienzo de trabajo',
        text: 'Aquí se construye la página. Arrastra contenido desde el catálogo y haz doble clic sobre los textos para editarlos.',
        selector: '[data-tour="canvas"]',
        on: 'left'
      },
      {
        id: 'interface-toolbar',
        title: 'Herramientas del documento',
        text: 'La barra superior concentra la vista previa, la importación, el historial y las opciones de salida.',
        selector: '[data-tour="top-toolbar"]',
        on: 'bottom'
      },
      {
        id: 'interface-preview',
        title: 'Comprueba el resultado',
        text: 'Usa el simulador para revisar cómo se adapta tu página a distintos tamaños antes de exportarla.',
        selector: '[data-tour="preview"]',
        on: 'bottom'
      }
    ]
  },
  plantillas: {
    tab: 'pages',
    steps: [
      {
        id: 'templates-tab',
        title: 'Abre Páginas',
        text: 'Las plantillas son estructuras completas para los momentos más comunes de un curso.',
        selector: '[data-tour="pages-tab"]',
        on: 'bottom'
      },
      {
        id: 'templates-catalog',
        title: 'Elige una plantilla',
        text: 'Puedes usar Bienvenida, Requerimientos, Referencias, Profesor y otras páginas maestras.',
        selector: '[data-tour="pages-catalog"]',
        on: 'right'
      },
      {
        id: 'templates-item',
        title: 'Arrastra o añade',
        text: 'Arrastra la tarjeta al lienzo. Al pasar el cursor también aparece un botón “+” para añadirla al final.',
        selector: '[data-tour="page-template"]',
        on: 'right'
      },
      {
        id: 'templates-canvas',
        title: 'Personaliza la estructura',
        text: 'La plantilla se convierte en bloques editables: cambia textos, imágenes, orden y estilos sin afectar el archivo original.',
        selector: '[data-tour="canvas"]',
        on: 'left'
      }
    ]
  },
  disena: {
    tab: 'elements',
    steps: [
      {
        id: 'design-tab',
        title: 'Abre Elementos',
        text: 'Esta sección contiene bloques individuales para construir o complementar una página.',
        selector: '[data-tour="elements-tab"]',
        on: 'bottom'
      },
      {
        id: 'design-element',
        title: 'Añade un bloque',
        text: 'Arrastra títulos, párrafos, tablas o interactivos al lugar exacto donde los necesites.',
        selector: '[data-tour="element-template"]',
        on: 'right'
      },
      {
        id: 'design-canvas',
        title: 'Edita directamente',
        text: 'En el lienzo puedes reordenar bloques y hacer doble clic en textos, imágenes, iconos o el footer para personalizarlos.',
        selector: '[data-tour="canvas"]',
        on: 'left'
      },
      {
        id: 'design-history',
        title: 'Deshaz y rehace',
        text: 'Usa estas acciones —o Ctrl+Z y Ctrl+Y— para recorrer el historial de cambios del diseño.',
        selector: '[data-tour="history"]',
        on: 'bottom'
      },
      {
        id: 'design-preview',
        title: 'Revisa mientras diseñas',
        text: 'Alterna el ancho del lienzo para detectar saltos de línea y ajustes responsivos antes de terminar.',
        selector: '[data-tour="preview"]',
        on: 'bottom'
      }
    ]
  },
  importa: {
    steps: [
      {
        id: 'import-file',
        title: 'Importa un archivo',
        text: 'Selecciona un HTML creado previamente con el Builder para recuperar su contenido y continuar editándolo.',
        selector: '[data-tour="import-file"]',
        on: 'bottom'
      },
      {
        id: 'import-paste',
        title: 'O pega el código',
        text: 'Si ya tienes el HTML en el portapapeles, abre este cuadro y pégalo sin crear un archivo intermedio.',
        selector: '[data-tour="import-paste"]',
        on: 'bottom'
      },
      {
        id: 'import-canvas',
        title: 'Continúa trabajando',
        text: 'El contenido importado aparecerá en el lienzo y conservará sus bloques editables cuando provenga del Builder.',
        selector: '[data-tour="canvas"]',
        on: 'left'
      }
    ]
  },
  exporta: {
    steps: [
      {
        id: 'export-preview',
        title: 'Haz una última revisión',
        text: 'Comprueba el diseño en varios tamaños antes de generar la versión que llevarás a tu LMS.',
        selector: '[data-tour="preview"]',
        on: 'bottom'
      },
      {
        id: 'export-file',
        title: 'Descarga el HTML',
        text: 'Este botón genera un archivo HTML independiente listo para guardar, compartir o subir a la plataforma.',
        selector: '[data-tour="export-file"]',
        on: 'bottom'
      },
      {
        id: 'export-copy',
        title: 'También puedes copiarlo',
        text: 'Copia el HTML completo al portapapeles cuando tu LMS permita pegar código directamente.',
        selector: '[data-tour="export-copy"]',
        on: 'bottom'
      }
    ]
  },
  medios: {
    tab: 'containers',
    steps: [
      {
        id: 'media-tab',
        title: 'Abre Medios',
        text: 'Aquí encontrarás integraciones para contenido alojado fuera del Builder.',
        selector: '[data-tour="media-tab"]',
        on: 'bottom'
      },
      {
        id: 'media-catalog',
        title: 'Integra recursos externos',
        text: 'Añade YouTube, Vimeo, Genially, Canva, Sketchfab, Gamma u otras funciones mediante URL o iframe.',
        selector: '[data-tour="media-catalog"]',
        on: 'right'
      },
      {
        id: 'media-global',
        title: 'Personaliza fondo y footer',
        text: 'Estos controles abren las galerías globales de fondo y de footer, donde puedes elegir imágenes y logotipos.',
        selector: '[data-tour="canvas-style-actions"]',
        on: 'right'
      },
      {
        id: 'media-canvas',
        title: 'Ajusta cada recurso',
        text: 'Una vez añadido al lienzo, usa sus controles para cambiar la fuente, el tamaño y la presentación.',
        selector: '[data-tour="canvas"]',
        on: 'left'
      }
    ]
  }
};

let activeTour: Tour | null = null;

const prepareTutorial = (tab?: CatalogTab) => {
  if (tab) {
    window.switchTab?.(tab);
  }

  document.getElementById('scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
};

const createButtons = (index: number, total: number): StepOptionsButton[] => {
  const buttons: StepOptionsButton[] = [
    {
      text: 'Salir',
      secondary: true,
      classes: 'lms-tour-exit',
      action() {
        void this.cancel();
      }
    }
  ];

  if (index > 0) {
    buttons.push({
      text: 'Anterior',
      secondary: true,
      action() {
        this.back();
      }
    });
  }

  buttons.push({
    text: index === total - 1 ? 'Finalizar' : 'Siguiente',
    action() {
      if (index === total - 1) {
        void this.complete();
      } else {
        void this.next();
      }
    }
  });

  return buttons;
};

export const cancelActiveTutorial = () => {
  if (activeTour?.isActive()) {
    void activeTour.cancel();
  }
  activeTour = null;
};

export const startTutorial = (topicId: TutorialTopicId) => {
  cancelActiveTutorial();

  const definition = TUTORIALS[topicId];
  const topic = TUTORIAL_TOPICS.find(item => item.id === topicId);
  prepareTutorial(definition.tab);

  const tour = new Shepherd.Tour({
    tourName: `lms-${topicId}`,
    useModalOverlay: true,
    keyboardNavigation: true,
    exitOnEsc: true,
    defaultStepOptions: {
      classes: 'lms-shepherd-theme',
      cancelIcon: {
        enabled: true,
        label: 'Cerrar tutorial'
      },
      canClickTarget: false,
      scrollTo: {
        behavior: 'smooth',
        block: 'center'
      },
      modalOverlayOpeningPadding: 8,
      modalOverlayOpeningRadius: 10
    }
  });

  definition.steps.forEach((step, index) => {
    const options: StepOptions = {
      id: step.id,
      title: step.title,
      text: `<span class="lms-tour-topic">${topic?.title ?? 'Tutorial'}</span><p>${step.text}</p><span class="lms-tour-progress">Paso ${index + 1} de ${definition.steps.length}</span>`,
      buttons: createButtons(index, definition.steps.length),
      showOn: () => !step.selector || Boolean(document.querySelector(step.selector)),
      extraHighlights: step.extraHighlights
    };

    if (step.selector) {
      options.attachTo = {
        element: step.selector,
        on: step.on ?? 'auto'
      };
    }

    tour.addStep(options);
  });

  const clearActiveTour = () => {
    if (activeTour === tour) activeTour = null;
  };

  tour.on('cancel', clearActiveTour);
  tour.on('complete', clearActiveTour);
  activeTour = tour;

  window.setTimeout(() => {
    void tour.start();
  }, 120);
};
