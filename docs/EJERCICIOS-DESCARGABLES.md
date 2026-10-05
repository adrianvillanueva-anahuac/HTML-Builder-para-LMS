# Ejercicios descargables — entrega HTML

## Flujo del diseñador

Inserta «Ejercicio descargable» y configura su nombre. Si no tiene contenido, pulsar el botón abre directamente el editor; si ya tiene contenido, permite descargarlo o seguir editando. La página básica incluye título y footer. Añade campos «Texto alumno». El bloque «Enviar ejercicio» es opcional; si lo incluyes, configura un correo del profesor o un enlace HTTPS de entrega en Brightspace. Guarda y vuelve a la página principal.

El nombre se edita desde Configurar o por doble clic. La descarga usa «Nombre del ejercicio para editar.html». Izquierda, centro y derecha alinean el conjunto del botón y su nombre. Las notas de diseño no se publican.

## Entrega del alumno

El alumno escribe en sus campos, guarda progreso en HTML y al finalizar descarga otra copia HTML con los campos bloqueados. Debe adjuntarla manualmente al correo. No se genera PDF y no se confirma un envío real. El bloqueo es de interfaz, no una garantía contra modificaciones externas. Una copia anterior sigue siendo editable.

Chrome puede solicitar permiso para escribir en un archivo seleccionado. La alternativa descarga una copia. El aviso al cerrar con cambios pendientes es el nativo del navegador.

## Recursos y tamaño

- El documento del ejercicio y su diseño se almacenan como texto, no base64.
- La descarga en el Builder se crea con Blob. La página publicada incorpora el ejercicio en una URL de datos HTML con codificación porcentual (no base64), sin requerir un manejador de clic.
- Solo las fuentes se convierten a base64: familias usadas, subconjuntos latinos para futuras respuestas y alfabetos presentes en el contenido. Otros caracteres podrán usar fuentes de respaldo del sistema.
- Las imágenes son URL públicas HTTP/HTTPS y requieren conexión. Las imágenes del catálogo local se resuelven al repositorio GitHub conocido; deben existir allí y permanecer accesibles.
- Las imágenes antiguas data/base64, blob o file bloquean la exportación con un aviso para sustituirlas por URL. No se borran automáticamente.
- Los patrones decorativos SVG existentes son texto vectorial, no imágenes base64.
- Copiar HTML excluye el estado interno del editor y bloquea contenido superior a 2.000.000 de caracteres.
- El proyecto editable se guarda localmente como `.lmsproject`, con sus espacios y ejercicios. Copiar a Brightspace requiere guardar los últimos cambios y copia únicamente el espacio activo, sin el estado interno del editor. La barra toma el nombre del archivo al abrir o guardar.

## Compatibilidad y validación

Los ejercicios antiguos deben abrirse y guardarse nuevamente para regenerarlos sin PDF. Se conserva la lectura del estado antiguo base64 para migración; no se generan nuevos documentos en ese formato.

Verificado: crear, guardar, volver a abrir y descargar un ejercicio HTML; título, footer, respuesta y entrega. Ejercicio de prueba: aproximadamente 562.000 caracteres, sin biblioteca PDF ni imágenes base64. Pruebas automatizadas de selección de fuentes y política de imágenes: 3 correctas. TypeScript y compilación verificados.

Pendiente: guardar/reabrir respuestas y entrega final en Chrome real, y comprobar en Brightspace que se permitan scripts, JSON y descargas Blob. No se garantiza compatibilidad hasta validar ambas rutas de publicación en el curso. La copia al portapapeles no pudo confirmarse con el navegador integrado.

La auditoría npm conserva siete avisos en dependencias previas; no se ejecutó una actualización global automática.
