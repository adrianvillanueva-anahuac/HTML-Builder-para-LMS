# Constructor de Contenido LMS (HTML Builder para LMS)

Herramienta de diseño instruccional basada en web (SPA estática desplegada en **GitHub Pages**) para crear páginas HTML interactivas, responsivas y accesibles listas para **Brightspace (D2L)** bajo los lineamientos de identidad visual de la **Universidad Anáhuac**.

---

## Características Principales

### 1. Gestión de Proyectos Multipágina (`.lmsproject`)
- **Múltiples páginas de trabajo** con pestañas organizables mediante arrastrar y soltar (*drag & drop*).
- **Historial Undo / Redo por página** (`Ctrl+Z` / `Ctrl+Y`, hasta 20 estados por espacio de trabajo).
- **Lista de pendientes automática y manual** por página para verificar que todos los recursos multimedia, diagramas y ejercicios estén completos antes de publicar.
- **Guardado y apertura** de archivos de proyecto `.lmsproject` o importación directa de archivos `.html` previamente exportados.

### 2. Catálogo de Plantillas y Bloques Interactivos
- **Plantillas de página**: Bienvenida, Índice, Requerimientos, Profesor, Referencias (con importador automático de citas APA/IEEE), Conclusiones y Página Básica.
- **Ejercicios descargables**: Plantillas de Ejercicio y Análisis FODA que generan evidencia descargable para el alumno (ver [`docs/EJERCICIOS-DESCARGABLES.md`](docs/EJERCICIOS-DESCARGABLES.md)).
- **Tablas Modulares y Diagramas de Flujo**:
  - **Tabla Modular**: Celdas personalizables con conectores visuales, insignias perimetrales (*badges*), cajas de texto enriquecido y desbordamiento controlado.
  - **Editor de Diagramas de Flujo**: Lienzo vectorial SVG con carriles (*swimlanes*), figuras estándar, conectores ortogonales/curvos/rectos, iconos vectoriales e imágenes recortables.
- **Componentes interactivos**: Pestañas horizontales/verticales con transición suave, Acordeones, Tarjetas Giratorias (*Flipcards*), Botones Interactivos, Incrustaciones seguras (YouTube, Vimeo, Genially, H5P, Canva, Google Drive, OneDrive) y Calculadora HTML.

---

## Desarrollo Local y Verificación

### Requisitos previos
- **Node.js** 20 o superior.

### Comandos disponibles

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (http://localhost:3000)
npm run dev

# Verificar tipado estático con TypeScript
npm run lint

# Ejecutar la suite de pruebas unitarias
npm test

# Compilar versión de producción en ./dist
npm run build
```

### QA funcional en navegador

Con el servidor local activo, abre `http://localhost:3000/qa-check.html` y pulsa **Ejecutar auditoría funcional**. El panel ejecuta los escenarios `*check.html` en instancias aisladas; permite filtrar por nombre o por varios nombres separados con comas. Los resultados distinguen pruebas aprobadas, fallidas y escenarios manuales. Estas páginas no forman parte de la compilación de producción.

Para una auditoría completa sin recargas de desarrollo, inicia una terminal PowerShell dedicada con `$env:DISABLE_HMR='true'` y ejecuta `npm run dev -- --host 127.0.0.1 --port 3002 --strictPort`. Abre `http://127.0.0.1:3002/qa-check.html`. Reinicia ese servidor después de cambiar código, ya que no observa archivos. El panel conserva el último informe en el almacenamiento local del navegador y señala las ejecuciones interrumpidas; un informe guardado no valida cambios posteriores.

`stability-check.html` comprueba inicializaciones repetidas, diálogos únicos y diez ciclos de restauración con liberación de Sortable y referencias DOM. Es una prueba de ciclo de vida; no sustituye un perfil de heap ni una prueba de carga prolongada.

Validación del 5 de noviembre de 2026: **61 escenarios de navegador aprobados (1413 comprobaciones), 0 fallidos**, más **292 pruebas unitarias**, TypeScript y compilación de producción correctos. Se verificó que el informe sobrevive a una recarga. La compilación mantiene un aviso por el paquete principal de aproximadamente 523 kB antes de gzip; queda por medir el uso de heap en sesiones prolongadas y proyectos grandes.

La selección de bloques permite arrastrar desde un espacio vacío o usar **Shift + clic** para agregar o quitar elementos del mismo contenedor. La barra del grupo permite mover, duplicar y eliminar. **Supr** o **Retroceso** eliminan el grupo cuando no se está editando un campo; **Deshacer** recupera todo el conjunto. **Escape** cancela la selección o el traslado.

Las pruebas de medios están consolidadas en `media-checklist-check.html`; la cobertura de jerarquía de menús y tamaños de ventana está en `modular-context-check.html`. Se conservan los escenarios con comprobaciones distintas, aunque compartan infraestructura.

---

## Despliegue en GitHub Pages

El flujo de integración y despliegue continuo está configurado en [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
1. En cada `push` o `pull_request` ejecuta `npm ci`, validación de tipos (`npm run lint`), pruebas unitarias (`npm test`) y compilación (`npm run build`).
2. Al integrar cambios en la rama `main`, publica automáticamente el artefacto `./dist` en **GitHub Pages**.
