# Google Drive y OneDrive privados

Guía de configuración del Builder Google. Revisada el **13 de noviembre de 2026**. No se han creado aplicaciones, habilitado facturación ni autorizado cuentas automáticamente. Sin estos registros, los botones muestran un aviso de configuración; la carga desde PC funciona normalmente.

## Flujo y datos

El bloque del lienzo admite arrastrar archivos, seleccionarlos desde PC o elegirlos desde la nube. La nube abre un selector autorizado; descarga únicamente los documentos elegidos al navegador. Luego **Procesar** extrae el contenido y abre el previo. **Volver** conserva la selección pendiente; **Aceptar e insertar** reemplaza el importador con títulos, párrafos y tablas editables. El límite sigue siendo 35 elementos por resultado.

Los originales pendientes solo viven en memoria: no se incluyen en `.lmsproject` ni en el HTML para alumnos. Después de aceptar, guarda el proyecto para conservar el contenido convertido. Si recargas antes de aceptar tendrás que seleccionar nuevamente los archivos. El acceso a la nube no autoriza enviarlos a Gemini; el diseño con IA mantiene su consentimiento independiente.

## Google Cloud

1. En [Google Cloud Console](https://console.cloud.google.com/), selecciona o crea el proyecto que administrará la integración.
2. Activa **Google Drive API**. Configura la pantalla de consentimiento en Google Auth Platform: marca, audiencia y datos de contacto. Si es una aplicación externa en pruebas, registra las cuentas de prueba. Para una organización Workspace, el administrador puede limitar el acceso.
3. Crea un **ID de cliente OAuth 2.0 de tipo Aplicación web**. Para desarrollo registra el origen JavaScript `http://localhost:3003` y utiliza ese origen al abrir el Builder. Si también utilizarás `http://127.0.0.1:3003`, registra ese origen exacto si la consola lo admite. Los orígenes deben coincidir con esquema, host y puerto.
4. Declara el alcance `https://www.googleapis.com/auth/drive.readonly`. El selector consulta nombres/metadatos de Drive y descarga los archivos elegidos; no modifica ni elimina archivos. Este es un alcance **restringido**: revisa los requisitos de verificación y las políticas del administrador antes de distribuir públicamente. No se afirma que una app externa pueda usarse en producción sin esa revisión.
5. Copia únicamente el ID público del cliente a `.env.local` como `VITE_GOOGLE_CLIENT_ID`. **No se necesita secreto de cliente en el navegador.**
6. Reinicia el servidor. En el bloque pulsa Google Drive → Conectar y autorizar. El usuario inicia sesión y aprueba los permisos directamente en Google.

Se utiliza Google Identity Services, con token de acceso en memoria durante el selector. Los documentos nativos de Google Docs se exportan a DOCX. También se admiten archivos DOCX/Markdown/TXT/CSV. Sheets y Slides nativos no se convierten en este selector: descarga una hoja CSV o un formato compatible y usa la carga local. La búsqueda consulta Drive por nombre y ofrece paginación; no abre enlaces arbitrarios ni ejecuta contenido del documento.

## Microsoft Entra / OneDrive

1. En [Microsoft Entra](https://entra.microsoft.com/), abre Registros de aplicaciones → Nuevo registro.
2. Escoge los tipos de cuenta apropiados. Para una sola institución, usa ese tenant. Para organizaciones y cuentas Microsoft personales, el registro debe admitir ambos tipos; `common` por sí mismo no amplía lo permitido por el registro.
3. En Autenticación, agrega una plataforma **Aplicación de página única (SPA)** con URI de redirección exacta:
   `http://localhost:3003/oauth-callback.html`
   Utiliza `http://localhost:3003/` al probar. Si trabajas desde otro origen o publicas bajo una subruta, registra la URI correspondiente con `/oauth-callback.html` dentro de esa subruta. En producción usa HTTPS. Para loopback IP, consulta las restricciones de la consola/manifest de Entra.
4. Agrega el permiso **delegado Microsoft Graph → Files.Read**. No uses permisos de aplicación ni Files.ReadWrite. Puede requerirse aprobación administrativa según las políticas de tu institución.
5. Copia el ID público de aplicación (cliente) a `VITE_MICROSOFT_CLIENT_ID`; define `VITE_MICROSOFT_TENANT_ID` con el tenant institucional o `common` según el registro. No crees ni pegues un secreto de cliente para este flujo SPA.
6. Reinicia y pulsa OneDrive → Conectar y autorizar. El usuario inicia sesión en Microsoft. MSAL Browser gestiona OAuth con PKCE y la página de retorno oficial `redirect-bridge` procesa la respuesta; no se implementa un intercambio manual de credenciales.

El selector navega por las carpetas del OneDrive del usuario y permite buscar. Solo permite archivos compatibles. No es un selector general de sitios SharePoint o de vínculos compartidos de terceros. Las descargas utilizan la URL temporal devuelta por Graph, **sin enviarle el token de acceso**. La caché de MSAL se configura en memoria y se limpia al cerrar el selector. Cerrar no revoca el permiso concedido a la aplicación ni cierra la sesión general de Google/Microsoft; el usuario puede revocarlo desde su cuenta.

## Archivo de configuración

En `.env.local`, ignorado por Git:

```dotenv
VITE_GOOGLE_CLIENT_ID=ID_PUBLICO_DEL_CLIENTE_WEB_GOOGLE
VITE_MICROSOFT_CLIENT_ID=ID_PUBLICO_DE_APLICACION_MICROSOFT
VITE_MICROSOFT_TENANT_ID=common
```

Estas variables `VITE_` son públicas por diseño. Nunca incluyas contraseñas, tokens o secretos. La clave de Gemini continúa siendo `GEMINI_API_KEY` sin prefijo `VITE_` y no es necesaria para convertir documentos localmente.

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 3003 --strictPort
```

Abre [Builder en localhost](http://localhost:3003/). Los proyectos recuperados del navegador en `127.0.0.1` y `localhost` usan almacenamientos distintos: guarda tu `.lmsproject` antes de cambiar de origen y ábrelo en el nuevo.

## Verificación pendiente del administrador

Con cuentas de prueba, comprobar: consentimiento, cancelación de popup, archivo privado accesible/inaccesible, paginación/búsqueda, descarga, sesión caducada y retorno al Builder. Después, Procesar → previo → Volver → Procesar → Aceptar, editar y guardar/reabrir `.lmsproject`. No se han ejecutado estas autorizaciones reales porque todavía no existen los registros OAuth.

Las pruebas locales cubren selección/arrastre, límites, preview antes de insertar, elementos nativos, edición, exportación y mensajes por configuración ausente. Las pruebas automatizadas de descarga verifican límites incluso sin Content-Length y mensajes para 401/403/429. No sustituyen las pruebas de integración de cuentas reales ni acreditan políticas institucionales.

## Fuentes oficiales

- [Google Identity Services: modelo de tokens](https://developers.google.com/identity/oauth2/web/guides/use-token-model).
- [Alcances de Drive y sus categorías](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).
- [Listado de archivos Drive](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list).
- [Descarga y exportación Drive](https://developers.google.com/workspace/drive/api/guides/manage-downloads).
- [Inicialización MSAL Browser](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/initialization).
- [Caché MSAL](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/caching).
- [Listado OneDrive y permiso Files.Read](https://learn.microsoft.com/en-us/graph/api/driveitem-list-children?view=graph-rest-1.0).
- [Descarga Graph desde JavaScript](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0).

La configuración de registro puede estar sujeta a controles y requisitos de verificación del proveedor. No se han activado servicios de pago ni se promete acceso ilimitado a APIs.
