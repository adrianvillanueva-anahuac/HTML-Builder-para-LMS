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

---

## Despliegue en GitHub Pages

El flujo de integración y despliegue continuo está configurado en [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
1. En cada `push` o `pull_request` ejecuta `npm ci`, validación de tipos (`npm run lint`), pruebas unitarias (`npm test`) y compilación (`npm run build`).
2. Al integrar cambios en la rama `main`, publica automáticamente el artefacto `./dist` en **GitHub Pages**.
