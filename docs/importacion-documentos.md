# Documentos a páginas — diagnóstico y diseño

Fecha de consulta: 12 de noviembre de 2026.

## Arquitectura observada

React 19/TypeScript/Vite; catálogo y registro de plantillas; lienzo basado en HTML con `.lms-element`, `.editable-text`, zonas Sortable, historial y exportación a Brightspace. Los proyectos `.lmsproject` guardan páginas editables. Existe dependencia `@google/genai`, pero no un servicio de IA operativo. El despliegue actual puede ser estático: no hay backend autenticado de usuarios.

Se agregarán módulos separados de extracción, planificación validada y renderizado con plantillas existentes, un diálogo fuera del HTML guardado y un bloque de entrada en el catálogo. La clave no debe formar parte del navegador, del proyecto ni del HTML exportado.

## Alternativas y decisión previa a implementación

| Alternativa | Costo y límites | Privacidad | Integración / mantenimiento |
|---|---|---|---|
| Extracción + composición local por reglas | Sin API; límites de memoria y tamaño de la app | Archivos en el navegador | Sencilla; funciona en hosting estático. No interpreta semánticamente con IA |
| Gemini con clave propia en servidor local | Posible nivel gratuito según modelo/proyecto; cuotas RPM/TPM/RPD; facturación si está activada | El texto autorizado sale a Google; revisar términos del nivel gratuito | Recomendación para IA en primera versión local; requiere configuración |
| Gemini compartido | Operador asume cuota/costo agregado | Documentos pasan por servidor y proveedor | Requiere cuentas, aislamiento, presupuestos, controles de abuso, borrado y operación; aplazado |
| Ollama local | Sin cargo de API local; equipo, memoria, descarga, energía y licencia del modelo | Inferencia local si se usa un modelo local | Alternativa futura para IA privada; instalación y rendimiento variables |

Recomendación: extracción local y composición por reglas disponible siempre, con Gemini opcional mediante servicio exclusivamente local. No se promete gratuidad ilimitada ni se activa facturación. La calidad semántica y latencia de IA requieren prueba con un modelo disponible y autorizado; no son hechos verificados por instalar una biblioteca.

MCP es una posible interfaz adicional para estas funciones, no un modelo ni una tarifa de inferencia. Servir herramientas del Builder a asistentes externos puede ser útil; para el flujo integrado añade cliente/servidor y autenticación. Mantener el contrato de planes independiente permite incorporarlo posteriormente. Esta versión no implementa MCP.

## Alcance inicial

DOCX (texto, listas, tablas e imágenes PNG/JPEG/GIF compatibles), Markdown, TXT UTF-8 y CSV separado por comas. Google Docs: exportar DOCX/Markdown/TXT; Sheets: exportar una hoja a CSV. No se descargan enlaces arbitrarios ni se accede a Drive privado. Drive directo exige autorización, permisos y configuración; un enlace no equivale a permiso. PPTX, XLSX, PDF/OCR, macros y formatos binarios antiguos quedan fuera. No se conserva la maquetación exacta de Office ni se interpretan gráficos o fórmulas de hojas.

Los documentos se mantienen en orden de carga, con procedencia; se cuentan repeticiones exactas, sin eliminarlas. Las contradicciones se conservan: esta versión no adjudica cuál fuente es correcta. La IA devuelve solamente agrupaciones de IDs para cuatro composiciones; no puede introducir hechos o HTML. Se valida que cada propuesta cubra todos los bloques exactamente una vez. Los rótulos se derivan del contenido original.

## Fuentes oficiales y primarias consultadas

- [Gemini precios](https://aistudio.google.com/docs/pricing): nivel gratuito limitado a ciertos modelos; condiciones diferentes de tratamiento de datos respecto de pago.
- [Cuotas](https://aistudio.google.com/docs/rate-limits): por proyecto, no por clave; RPM, TPM y RPD; consultar valores activos en AI Studio, no fijar una cifra universal.
- [Claves API](https://aistudio.google.com/docs/api-key): autenticación de la API y protección de claves.
- [Salida estructurada](https://aistudio.google.com/docs/structured-output): JSON Schema; sigue siendo necesaria validación semántica propia.
- [Google Identity](https://developers.google.com/identity/gsi/web/guides/overview): iniciar sesión identifica al usuario. No incluye por sí mismo permisos Drive ni cuota Gemini.
- [Exportación Drive](https://developers.google.com/workspace/drive/api/guides/manage-downloads) y [formatos](https://developers.google.com/workspace/drive/api/guides/ref-export-formats): documentos Workspace exportables; exportación API limitada a 10 MB. La exportación manual evita integrar OAuth inicialmente.
- [Mammoth](https://github.com/mwilliamson/mammoth.js): conversión semántica DOCX, imágenes y tablas; no sanitiza su salida.
- [Marked](https://marked.js.org/): Markdown; tampoco sanitiza su salida.
- [Ollama](https://docs.ollama.com/api/introduction): API local disponible, instalación/modelo necesarios.
- [MCP](https://modelcontextprotocol.io/docs/learn/architecture): protocolo de intercambio de contexto y herramientas, separado de inferencia.

Usar Gemini como consumidor y tener una cuenta Google no constituye acceso a la API: esta función requiere credenciales de API y cuotas del proyecto correspondiente.

## Uso y configuración de la primera versión

1. En **Páginas**, la primera plantilla **Documentos a página** crea una página vacía con pie institucional y área de importación. En **Medios**, debajo de **Funciones externas**, el mismo nombre agrega solo el área a una página existente.
2. Arrastra archivos o pulsa **Seleccionar archivos**, después **Procesar**. Revisa el resultado y pulsa **Aceptar e insertar**. Un error rechaza el lote completo para evitar omisiones silenciosas. El apartado avanzado ofrece un ejemplo ficticio y las opciones de IA.
3. **Convertir a lectura continua (local)** funciona sin credenciales ni conexión a un proveedor. **Generar 4 propuestas con Gemini** exige marcar autorización de envío; envía solo IDs, tipo y texto, nunca los archivos originales, imágenes, nombres de archivo o HTML.
4. El modo local ofrece únicamente lectura continua; Gemini ofrece cuatro propuestas. Explora la vista previa y **Vista completa**, que permite abrir pestañas y acordeones en las propuestas de IA. Elige e inserta. Se reemplaza solo el bloque importador. Se puede deshacer/rehacer; los textos usan las herramientas existentes.
5. Guarda el proyecto `.lmsproject`. Solo el resultado insertado se guarda; cerrar el diálogo descarta la extracción y propuestas temporales. El bloque vacío se excluye del HTML para alumnos.

### Gemini opcional, solo en servidor local

Configura en `.env.local` (ignorado por Git):

```dotenv
GEMINI_API_KEY=tu_clave_de_API
GEMINI_MODEL=identificador_de_un_modelo_Gemini_disponible_en_tu_proyecto
```

Consulta el [catálogo oficial](https://aistudio.google.com/docs/models), precios y las cuotas activas de tu proyecto. Debe admitir `generateContent` y salida JSON Schema; no se selecciona un modelo de pago automáticamente. No uses variables `VITE_` para claves. Reinicia con:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 3003 --strictPort
```

La ruta `/__document-ai` es un plugin **solo de desarrollo**: solo admite clientes loopback, Host local y POST del mismo origen con JSON. No habilitar este servidor como proxy público. Una publicación estática conserva la composición local; Gemini requiere diseñar un backend de producción antes de publicar esa capacidad. Nunca se incorporan claves al bundle, registros o proyecto. La clave permanece en el archivo de configuración local y memoria del proceso hasta que se apaga.

Una petición produce las cuatro propuestas. Máximo una activa, 15 segundos entre solicitudes y 20 por día UTC durante la vida del proceso; reiniciar restablece el contador (control de desarrollo, no presupuesto financiero). Tiempo de espera 60 segundos, salida máxima 8192 tokens; no hay reintentos automáticos. Los errores de credenciales, modelo, cuotas o JSON inválido permiten usar composición local sin enviar otra petición.

## Límites y preservación

- Máximo **35 elementos `.lms-element` por propuesta**, incluidos los anidados. Cuando excedería ese número, se agrupan los bloques de origen por sección en campos de texto enriquecido, preservando contenido y procedencia. En ese caso las tablas agrupadas son editables dentro del texto, sin su barra independiente de tabla dinámica.
- 5 archivos; 5 MB cada uno y 12 MB juntos; 60 000 caracteres y 180 bloques extraídos. No se trunca automáticamente. DOCX: máximo 20 MB descomprimidos declarados y 1500 entradas; imágenes base64 limitadas a 2 MB individual y 6 MB por documento. SVG, imágenes externas y formatos no compatibles se sustituyen por aviso, sin descargarlos.
- CSV: coma como separador, 300 filas/30 columnas; UTF-8. Las fórmulas no se ejecutan. Para hojas complejas exportar valores revisados.
- Markdown: formato semántico y enlaces seguros, sin scripts, atributos, estilos o contenido activo del archivo. Los estilos del Builder prevalecen.
- La presencia de tablas e imágenes puede aumentar el tamaño del `.lmsproject` y del HTML; siguen aplicando los límites existentes del exportador. No hay OCR ni comprensión visual de imágenes.
- La IA decide agrupación/orden, no reescribe hechos, sintetiza información ni arbitra contradicciones. La vista completa es imprescindible para revisión humana.

## Validación

Pruebas reproducibles: `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build` y `document-import-check.html` en un origen separado de los proyectos del usuario. Los tests del servicio simulan respuestas del proveedor: comprueban autenticación, origen, cuotas y rechazo de planes incompletos, sin llamadas reales ni cargos. La prueba real de Gemini está pendiente de configurar una clave y modelo autorizados; no se afirma validación de calidad semántica en vivo.

La auditoría de npm del 12/11/2026 reportó 9 avisos en dependencias existentes (Vite, Express y herramientas transitivas); no reportó avisos para Mammoth, Marked o fflate añadidos. Su actualización general queda fuera de esta función. El build conserva el aviso conocido de chunks grandes.

Resultados de ejecución: TypeScript correcto; 305 pruebas automatizadas aprobadas; build de producción correcto. La ruta local reporta `configured: false`: falta configurar Gemini para la prueba real. No se enviaron documentos a ningún proveedor.

Prueba de navegador: 39 comprobaciones aprobadas, incluidas extracción DOCX/Markdown/CSV, rechazo de archivos inválidos, conservación de 180 bloques con máximo 35 elementos, cuatro propuestas, consentimiento, vista completa, inserción, edición, exportación, deshacer/rehacer y limpieza al cerrar. Evidencia: `documentos-cuatro-propuestas.png` en el directorio de visualizaciones de la sesión.

Ajuste solicitado: el modo local solo convierte a lectura continua. Las cuatro composiciones se ofrecen exclusivamente con Gemini. El límite de 35 elementos y la conservación del contenido se mantienen.

### Flujo de importación y nube (13 de noviembre de 2026)

Arrastra los archivos al área o selecciónalos desde PC. **Procesar** abre la vista previa sin modificar la página; **Aceptar e insertar** crea los elementos editables. **Volver** conserva la selección pendiente. Las opciones de Gemini están en el apartado avanzado.

Google Drive y OneDrive privados tienen adaptadores de autorización preparados, pendientes de registrar las aplicaciones. Consulta [Configuración de nubes](configurar-nubes.md). No se han autorizado cuentas reales. Los archivos pendientes permanecen solo en memoria; el proyecto guarda el contenido después de insertarlo.

Validación del flujo actualizado: 24 comprobaciones de arrastre, plantilla, ubicación en Medios, previo, aceptación, edición y configuración pendiente; 39 comprobaciones de extracción, seguridad, exportación y deshacer/rehacer aprobadas en navegador. La suite automatizada tiene 308 pruebas aprobadas. Las pruebas de proveedores no autorizan cuentas reales.
