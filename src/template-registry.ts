import {
  getAcordeonHTML,
  getBienvenidaHTML,
  getCajaTextoHTML,
  getCalculadoraHTML,
  getConclusionesHTML,
  getCuadroNaranjaHTML,
  getEmbedHTML,
  getFlipcardHTML,
  getGrid2x2HTML,
  getIconoSueltoHTML,
  getImagenSueltaHTML,
  getIndiceHTML,
  getPaginaBasicaHTML,
  getParrafoBasicoHTML,
  getProfesorDatosHTML,
  getProfesorHTML,
  getReferenciaItemHTML,
  getReferenciasHTML,
  getReferenciasImporterHTML,
  getRequerimientosHTML,
  getSeparadorHTML,
  getTablaDinamicaHTML,
  getTabsHTML,
  getTituloBasicoHTML,
  getTituloImagenHTML,
} from './templates';
import {getModularHTML} from './modular-table';
import {getFlowHTML} from './flow-block';
import {getInteractiveButtonHTML} from './interactive-button';
import {getEjemploContenidoHTML} from './ejemplo-contenido';
import {getExerciseBlock} from './exercise';
export {isPageTemplateType} from './references';

const TEMPLATE_BUILDERS: Record<string, () => string> = {
  bienvenida: getBienvenidaHTML,
  referencias: getReferenciasHTML,
  requerimientos: getRequerimientosHTML,
  indice: getIndiceHTML,
  conclusiones: getConclusionesHTML,
  profesor: getProfesorHTML,
  pagina_basica: getPaginaBasicaHTML,
  ejemplo_contenido: getEjemploContenidoHTML,
  pestanas: getTabsHTML,
  caja_texto: getCajaTextoHTML,
  titulo_basico: getTituloBasicoHTML,
  titulo_imagen: getTituloImagenHTML,
  parrafo_basico: getParrafoBasicoHTML,
  imagen_suelta: getImagenSueltaHTML,
  grid_2x2: getGrid2x2HTML,
  tabla_modular: getModularHTML,
  diagrama_flujo: getFlowHTML,
  cuadro_naranja: getCuadroNaranjaHTML,
  boton_interactivo: getInteractiveButtonHTML,
  acordeon: getAcordeonHTML,
  tabla_dinamica: getTablaDinamicaHTML,
  separador: getSeparadorHTML,
  icono_suelto: getIconoSueltoHTML,
  profesor_datos: getProfesorDatosHTML,
  referencia_item: getReferenciaItemHTML,
  referencias_importer: getReferenciasImporterHTML,
  flipcard: getFlipcardHTML,
  calculadora_html: getCalculadoraHTML,
};

export function createTemplateHtml(type: string): string {
  if (!type) return '';
  const builder = TEMPLATE_BUILDERS[type];
  if (builder) return builder();
  if (type.startsWith('embed_')) return getEmbedHTML(type);
  return getExerciseBlock(type);
}
