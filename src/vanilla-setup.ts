import Sortable from 'sortablejs';
import {
    getBienvenidaHTML, getReferenciasHTML, getRequerimientosHTML,
    getIndiceHTML, getConclusionesHTML, getProfesorHTML, getTabsHTML,
    getCajaTextoHTML, getTituloBasicoHTML, getTituloImagenHTML, getParrafoBasicoHTML,
    getImagenSueltaHTML, getGrid2x2HTML, getCuadroNaranjaHTML,
    getAcordeonHTML, getEmbedHTML, getSeparadorHTML, getPaginaBasicaHTML, getTablaDinamicaHTML, getIconoSueltoHTML, getProfesorDatosHTML, getFlipcardHTML, getSingleFlipcardItemHTML,
    getReferenciaItemHTML, getReferenciasImporterHTML, getCalculadoraHTML, getBlockToolbar
} from './templates';

declare global {
    interface Window {
        [key: string]: any;
    }
}

let historyStack: string[] = [];
let historyIndex: number = -1;
let isHistoryAction: boolean = false;
let historyTimeout: any = null;
const MAX_HISTORY = 20;

const getTitleImageElement = (target: HTMLElement | null): HTMLElement | null => {
    if (!target) return null;
    if (target.matches('[data-type="titulo_imagen"]')) return target;
    return target.closest('[data-type="titulo_imagen"]') as HTMLElement | null;
};

const normalizeExistingTitleImage = (element: HTMLElement) => {
    const surface = element.querySelector('.title-image-surface') as HTMLElement | null;
    const title = element.querySelector('.title-image-text') as HTMLElement | null;
    if (!surface || !title) return;

    if (!element.querySelector('.title-image-height-control')) {
        const currentToolbar = element.querySelector(':scope > .block-toolbar');
        const template = document.createElement('template');
        template.innerHTML = getBlockToolbar('titulo_imagen').trim();
        const updatedToolbar = template.content.firstElementChild;
        if (currentToolbar && updatedToolbar) currentToolbar.replaceWith(updatedToolbar);
    }

    surface.classList.remove('min-h-[160px]', 'py-10', 'md:py-14');
    const storedMinHeight = Number.parseInt(element.dataset.titleMinHeight || surface.style.minHeight, 10);
    const minHeight = Number.isFinite(storedMinHeight) ? Math.max(0, storedMinHeight) : 0;
    const storedPadding = Number.parseInt(element.dataset.titlePadding || surface.style.paddingTop, 10);
    const padding = Number.isFinite(storedPadding) ? Math.min(80, Math.max(8, storedPadding)) : 40;

    element.dataset.titleMinHeight = String(minHeight);
    element.dataset.titlePadding = String(padding);
    surface.style.minHeight = `${minHeight}px`;
    surface.style.height = 'auto';
    surface.style.paddingTop = `${padding}px`;
    surface.style.paddingBottom = `${padding}px`;

    title.classList.remove('text-4xl', 'md:text-5xl');
    title.classList.add('text-[32px]');
    title.style.fontSize = '32px';

    const heightControl = element.querySelector('.title-image-height-control') as HTMLInputElement | null;
    const paddingControl = element.querySelector('.title-image-padding-control') as HTMLInputElement | null;
    if (heightControl) {
        heightControl.value = String(minHeight);
        heightControl.setAttribute('value', String(minHeight));
    }
    if (paddingControl) {
        paddingControl.value = String(padding);
        paddingControl.setAttribute('value', String(padding));
    }
    const heightValue = element.querySelector('.title-image-height-value');
    const paddingValue = element.querySelector('.title-image-padding-value');
    if (heightValue) heightValue.textContent = minHeight === 0 ? 'Auto' : `${minHeight} px`;
    if (paddingValue) paddingValue.textContent = `${padding} px`;
};

const installTitleImageControlGlobals = () => {
    window.updateTitleImageHeight = function(slider: HTMLInputElement) {
        const element = getTitleImageElement(slider);
        const surface = element?.querySelector('.title-image-surface') as HTMLElement | null;
        if (!element || !surface) return;

        const minHeight = Math.max(0, Number.parseInt(slider.value, 10) || 0);
        element.dataset.titleMinHeight = String(minHeight);
        surface.style.minHeight = `${minHeight}px`;
        surface.style.height = 'auto';
        slider.setAttribute('value', String(minHeight));
        const value = element.querySelector('.title-image-height-value');
        if (value) value.textContent = minHeight === 0 ? 'Auto' : `${minHeight} px`;
    };

    window.toggleTitleImageSizePanel = function(button: HTMLElement) {
        const control = button.closest('.title-image-size-control');
        if (!control) return;
        const shouldOpen = !control.classList.contains('is-open');
        document.querySelectorAll('.title-image-size-control.is-open').forEach(item => item.classList.remove('is-open'));
        if (shouldOpen) control.classList.add('is-open');
    };

    window.updateTitleImagePadding = function(slider: HTMLInputElement) {
        const element = getTitleImageElement(slider);
        const surface = element?.querySelector('.title-image-surface') as HTMLElement | null;
        if (!element || !surface) return;

        const padding = Math.min(80, Math.max(8, Number.parseInt(slider.value, 10) || 40));
        element.dataset.titlePadding = String(padding);
        surface.style.paddingTop = `${padding}px`;
        surface.style.paddingBottom = `${padding}px`;
        slider.setAttribute('value', String(padding));
        const value = element.querySelector('.title-image-padding-value');
        if (value) value.textContent = `${padding} px`;
    };
};

export function upgradeTitleImageElements(root: ParentNode = document) {
    installTitleImageControlGlobals();
    root.querySelectorAll('.title-image-element[data-type="titulo_imagen"]').forEach(element => {
        normalizeExistingTitleImage(element as HTMLElement);
    });
}

export function setupVanillaGlobals() {
    installTitleImageControlGlobals();
    // FIX: Protect SortableJS from complaining about detached nodes or null references.
    const preventDetachedEvent = (e: Event) => {
        if (e.target instanceof Node && !document.contains(e.target)) {
            e.stopImmediatePropagation();
        }
    };
    document.addEventListener('dragover', preventDetachedEvent, true);
    document.addEventListener('touchmove', preventDetachedEvent, true);
    document.addEventListener('mousemove', preventDetachedEvent, true);

    window.currentIconTarget = null;

    window.currentEditableText = null; 
    window.lastKnownRange = null; 
    window.currentBgTarget = null;
    window.currentTitleImageTarget = null;
    window.draggedEditorialImage = null;
    window.selectedEditorialImage = null; 
    window.tempFooterType = 'lineas';
    window.tempFooterLogo = 1;
    window.tempFooterLogoColor = 'naranja';
    window.tempFooterBlockColor = 'naranja';
    window.currentFooterWrapper = null;
    window.tempBgOpacity = "100";
    window.tempBgMargin = "15";

    // HISTORY FUNCTIONS
    window.saveHistoryState = function(immediate = false) {
        if (isHistoryAction || document.body.classList.contains('is-dragging')) return;
        const save = () => {
            if (document.body.classList.contains('is-dragging')) return;
            const container = document.getElementById('canvas-container-outer') || document.getElementById('canvas');
            if (!container) return;
            
            // Generate clean state representing the layout
            const wrapper = document.createElement('div');
            wrapper.innerHTML = container.innerHTML;
            
            // Remove editor-specific state that shouldn't trigger history like active sorting ghost
            wrapper.querySelectorAll('.sortable-ghost, .layout-intent-indicator').forEach(el => el.remove());
            wrapper.querySelectorAll('.selected-img, .drag-over, .is-dragging, .drag-item').forEach(el => {
                el.classList.remove('selected-img', 'drag-over', 'is-dragging', 'drag-item');
            });
            
            const currentState = wrapper.innerHTML;
            
            if (historyIndex >= 0 && historyStack[historyIndex] === currentState) return;

            if (historyIndex < historyStack.length - 1) {
                historyStack = historyStack.slice(0, historyIndex + 1);
            }

            historyStack.push(currentState);
            if (historyStack.length > MAX_HISTORY) {
                historyStack.shift();
            } else {
                historyIndex++;
            }
            window.updateHistoryButtons();
        };

        if (immediate) {
            clearTimeout(historyTimeout);
            save();
        } else {
            clearTimeout(historyTimeout);
            historyTimeout = setTimeout(save, 1000);
        }
    };

    window.undo = function() {
        if (historyIndex > 0) {
            isHistoryAction = true;
            historyIndex--;
            window.restoreState(historyStack[historyIndex]);
        }
    };

    window.redo = function() {
        if (historyIndex < historyStack.length - 1) {
            isHistoryAction = true;
            historyIndex++;
            window.restoreState(historyStack[historyIndex]);
        }
    };

    window.restoreState = function(state: string) {
        const container = document.getElementById('canvas-container-outer') || document.getElementById('canvas');
        if (container) {
            // Unfocus any inputs to prevent weird bugs before replacing DOM
            (document.activeElement as HTMLElement)?.blur();
            window.currentEditableText = null;
            container.innerHTML = state;
            
            // Force re-initialization of Sortable by removing the initialized flag on new DOM elements
            container.querySelectorAll('.lms-dropzone').forEach(zone => {
                (zone as HTMLElement).dataset.sortableActive = "false";
            });
            if (container.classList.contains('lms-dropzone')) {
                (container as HTMLElement).dataset.sortableActive = "false";
            }
            
            window.initNestedDropzones();
        }
        window.updateHistoryButtons();
        setTimeout(() => { isHistoryAction = false; }, 50);
    };

    window.updateHistoryButtons = function() {
        const undoBtn = document.getElementById('btn-undo') as HTMLButtonElement | null;
        const redoBtn = document.getElementById('btn-redo') as HTMLButtonElement | null;
        if (undoBtn) undoBtn.disabled = historyIndex <= 0;
        if (redoBtn) redoBtn.disabled = historyIndex >= historyStack.length - 1;
    };

    // Paste event interceptor for formatting
    document.addEventListener('paste', (e: ClipboardEvent) => {
        const target = e.target as HTMLElement;
        if (!target || !target.isContentEditable || !target.closest('.editable-text')) {
            return;
        }

        const lmsElement = target.closest('.lms-element');
        if (!lmsElement) return;

        const type = lmsElement.getAttribute('data-type');
        const excludedTypes = ['referencia_item', 'referencias', 'referencias_importer'];
        
        if (!type || !excludedTypes.includes(type)) {
            e.preventDefault();
            const textHtml = e.clipboardData?.getData('text/html');
            const textPlain = e.clipboardData?.getData('text/plain') || '';

            const editableText = target.closest('.editable-text') as HTMLElement;
            if (editableText && editableText.tagName.match(/^H[1-6]$/i)) {
                // Para títulos (h1-h6), sólo pegamos texto plano, sin saltos de línea,
                // respetando su formato (centrado, etc).
                let text = textPlain.replace(/[\r\n]+/g, ' ');
                document.execCommand('insertText', false, text);
                return;
            }

            let cleanedHtml = '';
            
            if (textHtml) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(textHtml, 'text/html');
                
                const cleanNode = (node: Node): string => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        return (node.textContent || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    }
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const el = node as HTMLElement;
                        const tag = el.tagName.toLowerCase();
                        let content = '';
                        for (const child of Array.from(el.childNodes)) {
                            content += cleanNode(child);
                        }

                        let isBold = ['b', 'strong'].includes(tag);
                        let isItalic = ['i', 'em'].includes(tag);
                        
                        if (el.style) {
                            if (el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight) >= 700) {
                                isBold = true;
                            }
                            if (el.style.fontStyle === 'italic') {
                                isItalic = true;
                            }
                        }

                        if (isBold && content.trim()) {
                            content = `<b>${content}</b>`;
                        }
                        if (isItalic && content.trim()) {
                            content = `<i>${content}</i>`;
                        }

                        if (tag === 'a') {
                            const href = el.getAttribute('href') || '#';
                            return `<a href="${href}" target="_blank" class="text-anahuac-orange underline hover:text-orange-700 break-words">${content}</a>`;
                        }
                        if (tag === 'ul') {
                            return `<ul class="list-custom list-bullets pl-4 mb-3">\n${content}</ul>\n`;
                        }
                        if (tag === 'ol') {
                            return `<ol class="list-custom list-numbers pl-4 mb-3">\n${content}</ol>\n`;
                        }
                        if (tag === 'li') {
                            return `<li class="mb-1">${content}</li>\n`;
                        }
                        if (tag === 'p' || tag === 'div') {
                            return `<p class="mb-2">${content}</p>\n`;
                        }
                        if (tag === 'br') {
                            return `<br>`;
                        }
                        if (['b', 'strong', 'i', 'em', 'span'].includes(tag)) {
                            return content;
                        }

                        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
                            return `<p class="mb-2"><b>${content}</b></p>\n`;
                        }

                        return content;
                    }
                    return '';
                };

                if (doc.body) {
                    for (const child of Array.from(doc.body.childNodes)) {
                        cleanedHtml += cleanNode(child);
                    }
                }
            } 
            
            if (!cleanedHtml.trim() && textPlain) {
                const paragraphs = textPlain.split(/\r?\n\r?\n/).filter(p => p.trim());
                if (paragraphs.length === 1 && !paragraphs[0].includes('\n')) {
                     // Single line, no inner breaks - keep inline
                     cleanedHtml = paragraphs[0].trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
                } else {
                    cleanedHtml = paragraphs.map(p => {
                        return `<p class="mb-2">${p.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '<br>')}</p>`;
                    }).join('\n');
                }
            }

            // Enforce left align
            if (editableText) {
                if (editableText.classList.contains('text-justify')) {
                    editableText.classList.remove('text-justify');
                    editableText.classList.add('text-left');
                }
                if (editableText.classList.contains('text-center')) {
                    editableText.classList.remove('text-center');
                    editableText.classList.add('text-left');
                }
            }

            document.execCommand('insertHTML', false, cleanedHtml);
        }
    });

    // Keyboard shortcuts for history
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') {
            const el = document.activeElement as HTMLElement | null;
            if (el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                // If focus is on standard text inputs, maybe prevent default?
                // Wait, if it's contentEditable we might want local undo first.
                // Let's just catch it globally for the canvas
                if (el.closest('#canvas')) {
                    e.preventDefault();
                    window.undo();
                }
            } else {
                e.preventDefault();
                window.undo();
            }
        } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault();
            window.redo();
        } else if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'y') {
            e.preventDefault();
            window.redo();
        }
    });

    const canvasObserver = new MutationObserver(() => {
        // Skip observer triggers during history navigation or sorting etc. if we can,
        // but saveHistoryState already skips if isHistoryAction is true.
        window.saveHistoryState();
    });

    // We will initialize the observer once canvas is attached!
    // Since setupVanillaGlobals corresponds to App component mount, canvas might not be immediately queryable.
    setTimeout(() => {
        const containerOuter = document.getElementById('canvas-container-outer') || document.getElementById('canvas');
        if (containerOuter) {
            canvasObserver.observe(containerOuter, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'src', 'href'] });
            window.saveHistoryState(true); // Save initial empty state
        }
    }, 500);

    window.deleteBlock = function(btn: HTMLElement) {
        const el = btn.closest('.lms-element');
        if (el) {
            el.remove();
            window.checkEmptyState();
        }
    }

    window.checkEmptyState = function() {
        document.querySelectorAll('.column-layout-wrapper').forEach(wrapper => {
             const colLeft = wrapper.querySelector('.col-left');
             const colRight = wrapper.querySelector('.col-right');
             
             if (!colLeft || !colRight) return;
             
             const leftItems = Array.from(colLeft.children).filter(c => c.classList.contains('lms-element'));
             const rightItems = Array.from(colRight.children).filter(c => c.classList.contains('lms-element'));
             
             if (leftItems.length === 0 && rightItems.length === 0) {
                 wrapper.remove();
             } else if (leftItems.length === 0) {
                 rightItems.forEach(item => wrapper.parentNode?.insertBefore(item, wrapper));
                 wrapper.remove();
             } else if (rightItems.length === 0) {
                 leftItems.forEach(item => wrapper.parentNode?.insertBefore(item, wrapper));
                 wrapper.remove();
             }
        });

        const canvas = document.getElementById('canvas');
        const emptyState = document.getElementById('empty-state');
        if (canvas && emptyState) {
            const hasElements = Array.from(canvas.children).filter(c => c.classList.contains('lms-element') || c.classList.contains('column-layout-wrapper')).length > 0;
            emptyState.style.display = hasElements ? 'none' : 'block';
        }
    }

    // Added insert template function
    window.insertTemplate = function(type: string) {
        window.saveHistoryState();
        let newHTML = '';
        if(type === 'bienvenida') newHTML = getBienvenidaHTML();
        else if(type === 'referencias') newHTML = getReferenciasHTML();
        else if(type === 'requerimientos') newHTML = getRequerimientosHTML();
        else if(type === 'indice') newHTML = getIndiceHTML();
        else if(type === 'conclusiones') newHTML = getConclusionesHTML();
        else if(type === 'profesor') newHTML = getProfesorHTML();
        else if(type === 'pagina_basica') newHTML = getPaginaBasicaHTML();
        else if(type === 'titulo_imagen') newHTML = getTituloImagenHTML();
        
        if (!newHTML) return;
        
        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        const template = document.createElement('template'); 
        template.innerHTML = newHTML.trim(); 
        const renderedElement = template.content.firstElementChild as HTMLElement | null;
        if(renderedElement) {
            canvas.appendChild(renderedElement);
            if (type === 'titulo_imagen') {
                window.updateTitleImageContrast(renderedElement);
            }
        }
        
        window.checkEmptyState();
        if(window.initParallax) window.initParallax(); 
        if(window.initNestedDropzones) window.initNestedDropzones();

        setTimeout(() => {
            if (canvas.lastElementChild) {
                canvas.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        }, 100);
    };

    window.switchTab = function(t: string){
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.btn-tab').forEach(el => el.className = "btn-tab flex-1 py-3 px-1 text-[13px] font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-600 transition-colors");
        const tabEl = document.getElementById('tab-'+t);
        if(tabEl) tabEl.classList.add('active');
        const btnEl = document.querySelector(`button[data-target="${t}"]`);
        if(btnEl) btnEl.className = "btn-tab flex-1 py-3 px-1 text-[13px] font-bold border-b-2 border-anahuac-orange text-anahuac-orange transition-colors";
        
        const floatingActions = document.getElementById('pages-floating-actions');
        if(floatingActions) {
            floatingActions.style.display = t === 'pages' ? 'flex' : 'none';
        }
    }

    // Funcionalidad de bloques
    window.switchTitleType = function(btn: HTMLElement, type: 'T1' | 'T2') {
        const title = btn.closest('.lms-element')?.querySelector('h2');
        if (!title) return;

        if (type === 'T1') {
            title.classList.remove('text-2xl', 'text-left');
            title.classList.add('text-4xl', 'text-center');
        } else {
            title.classList.remove('text-4xl', 'text-center');
            title.classList.add('text-2xl', 'text-left');
        }
    }

    const normalizeTitleImageLayout = (element: HTMLElement) => {
        normalizeExistingTitleImage(element);
    };

    const applyTitleContrastFallback = (element: HTMLElement) => {
        const title = element.querySelector('.title-image-text') as HTMLElement | null;
        if (!title) return;
        element.dataset.titleContrast = 'light-text';
        title.style.color = '#ffffff';
        title.style.textShadow = '0 2px 2px rgba(0,0,0,0.9), 0 4px 8px rgba(0,0,0,0.72), 0 0 18px rgba(0,0,0,0.58)';
    };

    window.updateTitleImageContrast = function(target: HTMLElement) {
        const element = getTitleImageElement(target);
        if (!element) return;
        normalizeTitleImageLayout(element);

        const surface = element.querySelector('.title-image-surface') as HTMLElement | null;
        const title = element.querySelector('.title-image-text') as HTMLElement | null;
        const imageUrl = surface?.dataset.backgroundUrl;
        if (!surface || !title || !imageUrl) {
            applyTitleContrastFallback(element);
            return;
        }

        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 20;
                const context = canvas.getContext('2d', { willReadFrequently: true });
                if (!context) throw new Error('Canvas no disponible');

                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
                let perceivedBrightness = 0;
                let samples = 0;

                // La zona central es donde se ubica el título.
                for (let y = 3; y < canvas.height - 3; y++) {
                    for (let x = 12; x < canvas.width - 12; x++) {
                        const index = (y * canvas.width + x) * 4;
                        if (pixels[index + 3] < 32) continue;
                        perceivedBrightness += (pixels[index] * 299 + pixels[index + 1] * 587 + pixels[index + 2] * 114) / 1000;
                        samples++;
                    }
                }

                const averageBrightness = samples ? perceivedBrightness / samples : 0;
                const useDarkText = averageBrightness >= 158;
                element.dataset.titleContrast = useDarkText ? 'dark-text' : 'light-text';

                if (useDarkText) {
                    title.style.color = '#30243d';
                    title.style.textShadow = '0 1px 0 rgba(255,255,255,0.95), 0 3px 6px rgba(255,255,255,0.82), 0 0 18px rgba(255,255,255,0.7)';
                } else {
                    title.style.color = '#ffffff';
                    title.style.textShadow = '0 2px 2px rgba(0,0,0,0.9), 0 4px 8px rgba(0,0,0,0.72), 0 0 18px rgba(0,0,0,0.58)';
                }
            } catch (error) {
                console.warn('No fue posible calcular el contraste del título:', error);
                applyTitleContrastFallback(element);
            }
        };
        image.onerror = () => applyTitleContrastFallback(element);
        image.src = imageUrl;
    };

    window.openTitleImageModal = function(btn: HTMLElement) {
        const element = getTitleImageElement(btn);
        if (!element) return;
        window.currentTitleImageTarget = element;
        document.getElementById('title-image-modal')?.classList.remove('hidden');
    };

    window.selectTitleBackground = function(imageUrl: string) {
        const element = getTitleImageElement(window.currentTitleImageTarget);
        if (!element || !imageUrl) return;
        const surface = element.querySelector('.title-image-surface') as HTMLElement | null;
        if (!surface) return;

        window.saveHistoryState();
        surface.dataset.backgroundUrl = imageUrl;
        surface.style.backgroundImage = `url('${imageUrl}')`;
        window.updateTitleImageContrast(element);
        document.getElementById('title-image-modal')?.classList.add('hidden');
        window.showToast('Fondo del título actualizado');
    };

    window.refreshTitleImageContrast = function(btn: HTMLElement) {
        const element = getTitleImageElement(btn);
        if (element) window.updateTitleImageContrast(element);
    };

    window.toggleColumns = function(btn: HTMLElement) { 
        const el = btn.closest('.lms-element')?.querySelector('.editable-text'); 
        if(!el) return;
        if (el.classList.contains('md:columns-2')) { 
            el.classList.remove('md:columns-2', 'gap-8'); 
        } else { 
            el.classList.add('md:columns-2', 'gap-8'); 
        } 
    }
    
    const updateSeparatorAppearance = (line: HTMLElement) => {
        const style = line.dataset.lineStyle || 'solid';
        const color = line.dataset.lineColor || '#646464';
        const rawThickness = (line.dataset.lineThickness || '1').replace('px', '');
        const thickness = parseInt(rawThickness) || 1;

        if (style === 'none') {
            line.style.backgroundImage = 'none';
            line.style.height = '0px';
            line.style.borderTopStyle = 'none';
            line.style.borderTopColor = color;
            line.style.borderTopWidth = '0px';
        } else {
            line.style.backgroundImage = 'none';
            line.style.height = '0px';
            line.style.borderTopStyle = style;
            line.style.borderTopColor = color;
            line.style.borderTopWidth = `${thickness}px`;
        }
    };

    window.changeSeparatorStyle = function(btn: HTMLElement, style: string) {
        const line = btn.closest('.lms-element')?.querySelector('.separator-line') as HTMLElement;
        if(line) {
            line.dataset.lineStyle = style;
            updateSeparatorAppearance(line);
        }
    }

    window.changeSeparatorColor = function(btn: HTMLElement, color: string) {
        const line = btn.closest('.lms-element')?.querySelector('.separator-line') as HTMLElement;
        if(line) {
            line.dataset.lineColor = color;
            updateSeparatorAppearance(line);
        }
    }

    window.updateSeparatorThickness = function(slider: HTMLInputElement) {
        const line = slider.closest('.lms-element')?.querySelector('.separator-line') as HTMLElement;
        if(line) {
            line.dataset.lineThickness = slider.value;
            updateSeparatorAppearance(line);
        }
    }

    window.updateSeparatorMargin = function(slider: HTMLInputElement, side: 'top' | 'bottom') {
        const wrapper = slider.closest('.lms-element')?.querySelector('.separator-wrapper') as HTMLElement;
        if(wrapper) {
            if (side === 'top') {
                wrapper.style.paddingTop = slider.value + 'px';
            } else {
                wrapper.style.paddingBottom = slider.value + 'px';
            }
        }
    }

    window.changeCuadroColor = function(btn: HTMLElement, colorType: string) {
        const lmsElement = btn.closest('.lms-element');
        const el = lmsElement?.querySelector(':scope > div:not(.block-toolbar)') as HTMLElement;
        if(!el) return;
        
        // Remove existing colors
        el.classList.remove('bg-anahuac-orange', 'bg-anahuac-purple', 'bg-gray-600', 'bg-gray-100', 'text-white', 'text-gray-800');
        
        // Add new colors
        if(colorType === 'orange') {
            el.classList.add('bg-anahuac-orange', 'text-white');
        } else if (colorType === 'purple') {
            el.classList.add('bg-anahuac-purple', 'text-white');
        } else if (colorType === 'gray-dark') {
            el.classList.add('bg-gray-600', 'text-white');
        } else if (colorType === 'gray-light') {
            el.classList.add('bg-gray-100', 'text-gray-800');
        }
    }

    window.changeCuadroRadius = function(btn: HTMLElement, radius: string) {
        const lmsElement = btn.closest('.lms-element');
        const el = lmsElement?.querySelector(':scope > div:not(.block-toolbar)') as HTMLElement;
        if(!el) return;
        
        // Remove existing radius
        el.classList.remove('rounded-none', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full');
        
        // Add new radius
        if (radius === 'none') el.classList.add('rounded-none');
        else el.classList.add(`rounded-${radius}`);
    }

    window.changeCuadroPadding = function(btn: HTMLElement, paddingVal: string) {
        const lmsElement = btn.closest('.lms-element');
        const el = lmsElement?.querySelector(':scope > div:not(.block-toolbar)') as HTMLElement;
        if(!el) return;

        // Remove existing vertical padding
        el.classList.remove('py-2', 'py-4', 'py-6', 'py-8', 'py-10', 'py-12', 'py-16');

        if (paddingVal && paddingVal.startsWith('py-')) {
            el.className = el.className.replace(/\bp-\d+\b/g, ''); // Remove uniform p- if any, but replace with px-8 + new py
            if (!el.classList.contains('px-8')) {
                 el.classList.add('px-8');
            }
            el.classList.add(paddingVal);
        } else {
             // Fallback
             el.classList.add('py-8');
             el.classList.add('px-8');
        }
    }

    window.changeCajaTextoColor = function(btn: HTMLElement, colorType: string) {
        const lmsElement = btn.closest('.lms-element');
        const el = lmsElement?.querySelector(':scope > div:not(.block-toolbar)') as HTMLElement;
        if(!el) return;
        
        el.classList.remove('border-l-anahuac-orange', 'border-l-anahuac-purple', 'border-l-gray-600', 'border-l-gray-300');
        
        if(colorType === 'orange') {
            el.classList.add('border-l-anahuac-orange');
        } else if (colorType === 'purple') {
            el.classList.add('border-l-anahuac-purple');
        } else if (colorType === 'gray-dark') {
            el.classList.add('border-l-gray-600');
        } else if (colorType === 'gray-light') {
            el.classList.add('border-l-gray-300');
        }
    }

    window.changeCajaTextoRadius = function(btn: HTMLElement, radius: string) {
        const lmsElement = btn.closest('.lms-element');
        const el = lmsElement?.querySelector(':scope > div:not(.block-toolbar)') as HTMLElement;
        if(!el) return;
        
        el.classList.remove('rounded-none', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full');
        
        if (radius === 'none') el.classList.add('rounded-none');
        else el.classList.add(`rounded-${radius}`);
    }

    window.changeCajaTextoPadding = function(btn: HTMLElement, paddingVal: string) {
        const lmsElement = btn.closest('.lms-element');
        const el = lmsElement?.querySelector(':scope > div:not(.block-toolbar)') as HTMLElement;
        if(!el) return;

        el.classList.remove('py-2', 'py-4', 'py-6', 'py-8', 'py-10', 'py-12', 'py-16');

        if (paddingVal && paddingVal.startsWith('py-')) {
            el.className = el.className.replace(/\bp-\d+\b/g, ''); 
            el.className = el.className.replace(/\bmd:p-\d+\b/g, ''); 
            if (!el.classList.contains('px-6')) {
                 el.classList.add('px-6');
                 el.classList.add('md:px-8');
            }
            el.classList.add(paddingVal);
        } else {
             el.classList.add('py-6');
             el.classList.add('px-6');
             el.classList.add('md:px-8');
        }
    }

    window.toggleFlipcardsSide = function(btn: HTMLElement) {
        const el = btn.closest('.lms-element') as HTMLElement;
        if (!el) return;
        el.classList.toggle('editing-back');
        const items = el.querySelectorAll('.flipcard-item');
        items.forEach(item => {
            if (el.classList.contains('editing-back')) {
                item.classList.add('force-flip');
            } else {
                item.classList.remove('force-flip');
            }
        });
    }

    window.changeFlipcardsWidth = function(slider: HTMLInputElement) {
        const wrapper = slider.closest('.lms-element')?.querySelector('.flipcards-wrapper') as HTMLElement;
        if (!wrapper) return;
        const items = wrapper.querySelectorAll('.flipcard-item');
        items.forEach((item: Element) => {
            (item as HTMLElement).style.width = slider.value + 'px';
        });
    }

    window.changeFlipcardsHeight = function(slider: HTMLInputElement) {
        const wrapper = slider.closest('.lms-element')?.querySelector('.flipcards-wrapper') as HTMLElement;
        if (!wrapper) return;
        const items = wrapper.querySelectorAll('.flipcard-item');
        items.forEach((item: Element) => {
            (item as HTMLElement).style.minHeight = slider.value + 'px';
        });
    }

    window.addFlipcard = function(btn: HTMLElement, direction: 'row'|'col') {
        const wrapper = btn.closest('.lms-element')?.querySelector('.flipcards-wrapper') as HTMLElement;
        if (!wrapper) return;
        
        if (direction === 'col') {
            wrapper.classList.remove('flex-row');
            wrapper.classList.add('flex-col', 'items-center');
        } else {
            wrapper.classList.remove('flex-col', 'items-center');
            wrapper.classList.add('flex-row');
        }

        const template = document.createElement('template');
        template.innerHTML = getSingleFlipcardItemHTML().trim();
        const newCard = template.content.firstElementChild as HTMLElement;
        
        // Match current size
        const firstCard = wrapper.querySelector('.flipcard-item') as HTMLElement;
        if (firstCard) {
            newCard.style.width = firstCard.style.width;
            newCard.style.minHeight = firstCard.style.minHeight;
        }

        wrapper.appendChild(newCard);
    }

    window.changeFlipcardsAlign = function(btn: HTMLElement, align: string) {
        const wrapper = btn.closest('.lms-element')?.querySelector('.flipcards-wrapper') as HTMLElement;
        if (!wrapper) return;
        wrapper.classList.remove('justify-start', 'justify-center', 'justify-end', 'items-start', 'items-center', 'items-end');
        if (wrapper.classList.contains('flex-col')) {
            if (align === 'start') wrapper.classList.add('items-start');
            else if (align === 'end') wrapper.classList.add('items-end');
            else wrapper.classList.add('items-center');
        } else {
            if (align === 'start') wrapper.classList.add('justify-start');
            else if (align === 'end') wrapper.classList.add('justify-end');
            else wrapper.classList.add('justify-center');
        }
    }

    window.changeSideColor = function(btn: HTMLElement, colorType: string) {
        const item = btn.closest('.flipcard-item');
        if(!item) return;
        
        const isEditingBack = item.classList.contains('is-flipped') || item.classList.contains('force-flip') || item.closest('.lms-element')?.classList.contains('editing-back');
        const side = isEditingBack ? item.querySelector('.flipcard-back') : item.querySelector('.flipcard-front');
        if(!side) return;

        side.classList.remove('bg-anahuac-orange', 'bg-anahuac-purple', 'bg-gray-600', 'bg-gray-200', 'bg-white', 'text-white', 'text-gray-800');
        
        const title = side.querySelector('h2');
        const content = side.querySelector('.font-sans');
        
        if (title) title.classList.remove('text-white', 'text-anahuac-orange', 'text-gray-800');
        if (content) content.classList.remove('text-white', 'text-gray-600', 'text-gray-700', 'opacity-90');

        if(colorType === 'orange') {
            side.classList.add('bg-anahuac-orange', 'text-white');
            if (title) title.classList.add('text-white');
            if (content) content.classList.add('text-white', 'opacity-90');
        } else if (colorType === 'purple') {
            side.classList.add('bg-anahuac-purple', 'text-white');
            if (title) title.classList.add('text-white');
            if (content) content.classList.add('text-white', 'opacity-90');
        } else if (colorType === 'gray-dark') {
            side.classList.add('bg-gray-600', 'text-white');
            if (title) title.classList.add('text-white');
            if (content) content.classList.add('text-white', 'opacity-90');
        } else if (colorType === 'gray-light') {
            side.classList.add('bg-gray-200', 'text-gray-800');
            // For gray-light, it's better to keep dark text, if we force white text it's unreadable.
            // We use orange title and gray content similar to white.
            if (title) title.classList.add('text-anahuac-orange');
            if (content) content.classList.add('text-gray-700');
        } else if (colorType === 'white') {
            side.classList.add('bg-white', 'text-gray-800');
            if (title) title.classList.add('text-anahuac-orange');
            if (content) content.classList.add('text-gray-600');
        }
    }

    window.promptSideImage = function(btn: HTMLElement) {
        const url = prompt("Introduce la URL de la imagen:");
        if (!url) return;
        const item = btn.closest('.flipcard-item');
        if(!item) return;
        
        const isEditingBack = item.classList.contains('is-flipped') || item.classList.contains('force-flip') || item.closest('.lms-element')?.classList.contains('editing-back');
        const side = isEditingBack ? item.querySelector('.flipcard-back') : item.querySelector('.flipcard-front');
        const overlay = side?.querySelector('.flipcard-overlay');
        
        if(side && overlay) {
            (side as HTMLElement).style.backgroundImage = `url('${url}')`;
            overlay.classList.remove('hidden');
        }
    }

    window.removeSideImage = function(btn: HTMLElement) {
        const item = btn.closest('.flipcard-item');
        if(!item) return;
        
        const isEditingBack = item.classList.contains('is-flipped') || item.classList.contains('force-flip') || item.closest('.lms-element')?.classList.contains('editing-back');
        const side = isEditingBack ? item.querySelector('.flipcard-back') : item.querySelector('.flipcard-front');
        const overlay = side?.querySelector('.flipcard-overlay');
        
        if(side && overlay) {
            (side as HTMLElement).style.backgroundImage = 'none';
            overlay.classList.add('hidden');
        }
    }

    window.changeSideImagePos = function(btn: HTMLElement, pos: string) {
        const item = btn.closest('.flipcard-item');
        if(!item) return;
        
        const isEditingBack = item.classList.contains('is-flipped') || item.classList.contains('force-flip') || item.closest('.lms-element')?.classList.contains('editing-back');
        const side = isEditingBack ? item.querySelector('.flipcard-back') : item.querySelector('.flipcard-front');
        
        if(side) {
            side.classList.remove('bg-top', 'bg-bottom', 'bg-left', 'bg-right', 'bg-center', 'bg-left-top', 'bg-right-top', 'bg-left-bottom', 'bg-right-bottom');
            
            if (pos === 'top center') side.classList.add('bg-top');
            else if (pos === 'bottom center') side.classList.add('bg-bottom');
            else if (pos === 'center left') side.classList.add('bg-left');
            else if (pos === 'center right') side.classList.add('bg-right');
            else if (pos === 'center center') side.classList.add('bg-center');
            else if (pos === 'top left') side.classList.add('bg-left-top');
            else if (pos === 'top right') side.classList.add('bg-right-top');
            else if (pos === 'bottom left') side.classList.add('bg-left-bottom');
            else if (pos === 'bottom right') side.classList.add('bg-right-bottom');
        }
    }

    window.changeSideVerticalAlign = function(btn: HTMLElement, align: string) {
        const item = btn.closest('.flipcard-item');
        if(!item) return;
        const isEditingBack = item.classList.contains('is-flipped') || item.classList.contains('force-flip') || item.closest('.lms-element')?.classList.contains('editing-back');
        const side = isEditingBack ? item.querySelector('.flipcard-back') : item.querySelector('.flipcard-front');
        
        if(side) {
            side.classList.remove('justify-start', 'justify-center', 'justify-end');
            if (align === 'start') {
                side.classList.add('justify-start');
            } else if (align === 'end') {
                side.classList.add('justify-end');
            } else {
                side.classList.add('justify-center');
            }
        }
    }

    window.removeFlipcardItem = function(btn: HTMLElement) {
        const item = btn.closest('.flipcard-item');
        const wrapper = btn.closest('.flipcards-wrapper');
        if (item) item.remove();
        if (wrapper && wrapper.children.length === 0) {
            wrapper.closest('.lms-element')?.remove();
        }
    }

    window.showToast = function(message: string, isError: boolean = false) {
        let toastContainer = document.getElementById('lms-toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'lms-toast-container';
            toastContainer.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = `px-4 py-2 rounded shadow-lg text-white font-bold text-sm transition-opacity duration-300 opacity-0 ${isError ? 'bg-red-500' : 'bg-green-500'}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Fading animation
        setTimeout(() => toast.classList.remove('opacity-0'), 10);
        
        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // --- LOGICA DE COLUMNAS (LAYOUT BUILDER) ---
    window.createLayoutColumn = function(side: 'left' | 'right', originalEl: HTMLElement, droppedEl: HTMLElement) {
        let draggedTemplateHTML = '';
        if (droppedEl.dataset.type && !droppedEl.classList.contains('is-rendered')) {
            // It's a drag from the sidebar
            const type = droppedEl.dataset.type;
            if(type === 'bienvenida') draggedTemplateHTML = getBienvenidaHTML();
            else if(type === 'referencias') draggedTemplateHTML = getReferenciasHTML();
            else if(type === 'requerimientos') draggedTemplateHTML = getRequerimientosHTML();
            else if(type === 'indice') draggedTemplateHTML = getIndiceHTML();
            else if(type === 'conclusiones') draggedTemplateHTML = getConclusionesHTML();
            else if(type === 'profesor') draggedTemplateHTML = getProfesorHTML();
            else if(type === 'pagina_basica') draggedTemplateHTML = getPaginaBasicaHTML();
            else if(type === 'pestanas') draggedTemplateHTML = getTabsHTML();
            else if(type === 'caja_texto') draggedTemplateHTML = getCajaTextoHTML();
            else if(type === 'titulo_basico') draggedTemplateHTML = getTituloBasicoHTML();
            else if(type === 'titulo_imagen') draggedTemplateHTML = getTituloImagenHTML();
            else if(type === 'parrafo_basico') draggedTemplateHTML = getParrafoBasicoHTML();
            else if(type === 'imagen_suelta') draggedTemplateHTML = getImagenSueltaHTML();
            else if(type === 'grid_2x2') draggedTemplateHTML = getGrid2x2HTML();
            else if(type === 'cuadro_naranja') draggedTemplateHTML = getCuadroNaranjaHTML();
            else if(type === 'acordeon') draggedTemplateHTML = getAcordeonHTML();
            else if(type === 'separador') draggedTemplateHTML = getSeparadorHTML();
            else if(type === 'icono_suelto') draggedTemplateHTML = getIconoSueltoHTML();
            else if(type === 'tabla_dinamica') draggedTemplateHTML = getTablaDinamicaHTML();
            else if(type === 'profesor_datos') draggedTemplateHTML = getProfesorDatosHTML();
            else if(type === 'referencia_item') draggedTemplateHTML = getReferenciaItemHTML();
            else if(type === 'referencias_importer') draggedTemplateHTML = getReferenciasImporterHTML();
            else if(type === 'flipcard') draggedTemplateHTML = getFlipcardHTML();
            else if(type === 'calculadora_html') draggedTemplateHTML = getCalculadoraHTML();
            else if(type?.startsWith('embed_')) { draggedTemplateHTML = getEmbedHTML(type); }
            
            if (droppedEl.parentElement && droppedEl.closest('.lms-dropzone') || droppedEl.classList.contains('sortable-ghost')) {
                droppedEl.remove();
            }
        } else {
             // It's an existing element being moved
             draggedTemplateHTML = droppedEl.outerHTML;
             if (droppedEl.parentElement) droppedEl.remove();
        }

        const wrapperHtml = `
            <div class="relative w-full lms-element is-rendered mb-6 flex items-stretch column-layout-wrapper" data-type="layout_columnas">
                <div class="block-toolbar absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full z-50">
                    
                    <div class="bg-white rounded-md px-2 py-1 flex items-center border border-gray-200 shadow-md">
                        <div class="drag-handle cursor-grab hover:text-anahuac-orange text-gray-400 p-1 rounded hover:bg-gray-50 flex items-center justify-center" title="Arrastrar para mover">
                            <span class="material-symbols-outlined text-[20px] pointer-events-none">drag_indicator</span>
                        </div>
                        <div class="w-px h-4 bg-gray-200 mx-1"></div>
                        <button type="button" class="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors flex items-center justify-center" onclick="deleteBlock(this)" title="Eliminar contenedor">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>
                </div>

                <div class="flex-[1_1_0%] min-w-[50px] lms-dropzone col-left p-1 border border-transparent hover:border-gray-200 relative transition-colors" data-sortable-active="false">
                </div>
                
                <div class="w-3 cursor-col-resize hover:bg-gray-200 relative flex-shrink-0 group/divider flex flex-col items-center justify-center z-40 transition-colors" onmousedown="window.initColumnResize(event, this)">
                    <div class="absolute w-max bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 flex opacity-0 invisible group-hover/divider:opacity-100 group-hover/divider:visible transition-all duration-200 delay-500 group-hover/divider:delay-0 flex-col gap-2 top-full mt-2 z-[60]">
                        <div class="absolute w-full h-4 -top-4 left-0"></div>
                        
                        <div class="flex items-center gap-1">
                            <button title="Ajustar espacio (Gap)" class="text-gray-500 hover:bg-gray-100 p-1 flex items-center justify-center rounded">
                                <span class="material-symbols-outlined text-[16px]">space_bar</span>
                            </button>
                            <input type="range" class="w-16 h-1 bg-gray-200 rounded appearance-none cursor-pointer" min="0" max="64" value="0" oninput="window.updateColumnGap(this, this.value)">
                        </div>

                        <div class="flex items-center gap-1">
                            <button title="Grosor de línea" class="text-gray-500 hover:bg-gray-100 p-1 flex items-center justify-center rounded">
                                <span class="material-symbols-outlined text-[16px]">line_weight</span>
                            </button>
                            <input type="range" class="w-16 h-1 bg-gray-200 rounded appearance-none cursor-pointer" min="1" max="10" value="2" oninput="window.updateColumnDividerWidth(this, this.value)">
                        </div>

                        <div class="w-full h-px bg-gray-200"></div>

                        <div class="flex items-center gap-1">
                            <button title="Línea Sólida" class="w-6 h-6 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-100" onclick="window.updateColumnDividerStyle(this, 'solid')"><div class="w-4 border-t-2 border-gray-400"></div></button>
                            <button title="Línea Punteada" class="w-6 h-6 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-100" onclick="window.updateColumnDividerStyle(this, 'dotted')"><div class="w-4 border-t-2 border-dotted border-gray-400"></div></button>
                            <button title="Línea Discontinua" class="w-6 h-6 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-100" onclick="window.updateColumnDividerStyle(this, 'dashed')"><div class="w-4 border-t-2 border-dashed border-gray-400"></div></button>
                            <button title="Línea Doble" class="w-6 h-6 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-100" onclick="window.updateColumnDividerStyle(this, 'double')"><div class="w-4 border-t-4 border-double border-gray-400"></div></button>
                        </div>
                        
                        <div class="flex items-center gap-1">
                            <button title="Línea divisoria (Ninguna)" class="w-6 h-6 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-100 font-bold text-xs" onclick="window.updateColumnDividerColor(this, 'none')">∅</button>
                            <button title="Línea gris" class="w-6 h-6 flex items-center justify-center rounded border-r-2 border-gray-400 hover:bg-gray-100" onclick="window.updateColumnDividerColor(this, 'solid', '#9ca3af')"></button>
                            <button title="Línea naranja" class="w-6 h-6 flex items-center justify-center rounded border-r-2 border-anahuac-orange hover:bg-gray-100" onclick="window.updateColumnDividerColor(this, 'solid', '#ff5900')"></button>
                            <button title="Línea morada" class="w-6 h-6 flex items-center justify-center rounded border-r-2 border-anahuac-purple hover:bg-gray-100" onclick="window.updateColumnDividerColor(this, 'solid', '#5d428c')"></button>
                        </div>
                    </div>

                    <div class="absolute w-max flex opacity-0 invisible group-hover/divider:opacity-100 group-hover/divider:visible transition-all duration-200 delay-500 group-hover/divider:delay-0 gap-8 items-center justify-center z-[60]">
                        <div class="flex flex-col gap-1 bg-white shadow-xl border border-gray-200 rounded p-1 absolute right-full mr-2">
                           <button title="Ajustar Arriba (Izquierda)" class="p-1 hover:bg-gray-100 rounded flex items-center text-gray-600 hover:text-anahuac-orange" onclick="window.updateColumnAlign(this, 'left', 'flex-start')"><span class="material-symbols-outlined text-[16px]">align_vertical_top</span></button>
                           <button title="Centrado (Izquierda)" class="p-1 hover:bg-gray-100 rounded flex items-center text-gray-600 hover:text-anahuac-orange" onclick="window.updateColumnAlign(this, 'left', 'center')"><span class="material-symbols-outlined text-[16px]">align_vertical_center</span></button>
                           <button title="Ajustar Abajo (Izquierda)" class="p-1 hover:bg-gray-100 rounded flex items-center text-gray-600 hover:text-anahuac-orange" onclick="window.updateColumnAlign(this, 'left', 'flex-end')"><span class="material-symbols-outlined text-[16px]">align_vertical_bottom</span></button>
                        </div>
                        <div class="flex flex-col gap-1 bg-white shadow-xl border border-gray-200 rounded p-1 absolute left-full ml-2">
                           <button title="Ajustar Arriba (Derecha)" class="p-1 hover:bg-gray-100 rounded flex items-center text-gray-600 hover:text-anahuac-orange" onclick="window.updateColumnAlign(this, 'right', 'flex-start')"><span class="material-symbols-outlined text-[16px]">align_vertical_top</span></button>
                           <button title="Centrado (Derecha)" class="p-1 hover:bg-gray-100 rounded flex items-center text-gray-600 hover:text-anahuac-orange" onclick="window.updateColumnAlign(this, 'right', 'center')"><span class="material-symbols-outlined text-[16px]">align_vertical_center</span></button>
                           <button title="Ajustar Abajo (Derecha)" class="p-1 hover:bg-gray-100 rounded flex items-center text-gray-600 hover:text-anahuac-orange" onclick="window.updateColumnAlign(this, 'right', 'flex-end')"><span class="material-symbols-outlined text-[16px]">align_vertical_bottom</span></button>
                        </div>
                    </div>

                    <div class="h-full divider-line transition-colors w-px" data-width="2" style="border-right-width: 0px; border-style: solid; border-color: transparent;"></div>
                </div>

                <div class="flex-[1_1_0%] min-w-[50px] lms-dropzone col-right p-1 border border-transparent hover:border-gray-200 relative transition-colors" data-sortable-active="false">
                </div>
            </div>
        `;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = wrapperHtml.trim();
        const newLayout = tempDiv.firstChild as HTMLElement;
        
        originalEl.parentNode?.insertBefore(newLayout, originalEl);
        
        const colLeft = newLayout.querySelector('.col-left');
        const colRight = newLayout.querySelector('.col-right');
        
        if(side === 'right') {
            colLeft?.appendChild(originalEl);
            if(draggedTemplateHTML) {
                 const t = document.createElement('div');
                 t.innerHTML = draggedTemplateHTML.trim();
                 if(t.firstChild) colRight?.appendChild(t.firstChild);
            }
        } else {
            colRight?.appendChild(originalEl);
            if(draggedTemplateHTML) {
                 const t = document.createElement('div');
                 t.innerHTML = draggedTemplateHTML.trim();
                 if(t.firstChild) colLeft?.appendChild(t.firstChild);
            }
        }

        if(window.initNestedDropzones) {
            window.initNestedDropzones();
        }
        newLayout.querySelectorAll('[data-type="titulo_imagen"]').forEach(element => {
            window.updateTitleImageContrast(element as HTMLElement);
        });
    };

    window.updateColumnGap = function(input: HTMLInputElement, val: string) {
        const wrapper = input.closest('.column-layout-wrapper') as HTMLElement;
        if (wrapper) {
            wrapper.style.gap = `${val}px`;
            
            if (wrapper.dataset.ratio) {
                 const newLeftBasis = parseFloat(wrapper.dataset.ratio);
                 const leftCol = wrapper.querySelector('.col-left') as HTMLElement;
                 const rightCol = wrapper.querySelector('.col-right') as HTMLElement;
                 if (leftCol && rightCol) {
                     leftCol.style.flex = `0 0 calc(${newLeftBasis}% - ${val}px - 6px)`;
                     rightCol.style.flex = `0 0 calc(${100 - newLeftBasis}% - ${val}px - 6px)`;
                 }
            }
        }
    };

    window.updateColumnDividerWidth = function(input: HTMLInputElement, val: string) {
        const wrapper = input.closest('.column-layout-wrapper');
        if (!wrapper) return;
        const line = wrapper.querySelector('.divider-line') as HTMLElement;
        if (!line) return;
        line.dataset.width = val;
        
        if (line.style.borderStyle && line.style.borderStyle !== 'none' && line.style.borderColor !== 'transparent') {
            line.style.borderRightWidth = `${val}px`;
        }
    };
    
    window.updateColumnDividerStyle = function(btn: HTMLElement, style: string) {
        const wrapper = btn.closest('.column-layout-wrapper');
        if (!wrapper) return;
        const line = wrapper.querySelector('.divider-line') as HTMLElement;
        if (!line) return;
        
        line.style.borderStyle = style;
        // Apply default colors/width if they were none
        if (line.style.borderColor === 'transparent' || !line.style.borderColor) {
             line.style.borderColor = '#9ca3af'; // default gray
        }
        if (line.style.borderRightWidth === '0px' || !line.style.borderRightWidth) {
             const width = line.dataset.width || '2';
             line.style.borderRightWidth = `${width}px`;
        }
    };
    
    window.updateColumnDividerColor = function(btn: HTMLElement, style: string, color: string = 'transparent') {
        const wrapper = btn.closest('.column-layout-wrapper');
        if (!wrapper) return;
        const line = wrapper.querySelector('.divider-line') as HTMLElement;
        if (!line) return;
        const width = line.dataset.width || '2';
        
        if (style === 'none') {
            line.style.borderRightWidth = '0px';
            line.style.borderStyle = 'solid';
            line.style.borderColor = 'transparent';
        } else {
            line.style.borderRightWidth = `${width}px`;
            line.style.borderColor = color;
            if (line.style.borderStyle === 'none' || line.style.borderStyle === '') {
                line.style.borderStyle = style;
            }
        }
    };

    window.updateColumnAlign = function(btn: HTMLElement, column: 'left' | 'right', align: string) {
        const wrapper = btn.closest('.column-layout-wrapper');
        if (!wrapper) return;
        const col = wrapper.querySelector(`.col-${column}`) as HTMLElement;
        if (col) {
            col.style.display = 'flex';
            col.style.flexDirection = 'column';
            col.style.justifyContent = align;
        }
    };

    let isResizingColumn = false;
    let currentResizeWrapper: HTMLElement | null = null;
    let resizeStartX = 0;
    let startLeftBasis = 0;
    let startAvailableWidth = 0;
    
    window.initColumnResize = function(e: MouseEvent, divider: HTMLElement) {
        if(e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement) return; 
        
        isResizingColumn = true;
        currentResizeWrapper = divider.closest('.column-layout-wrapper');
        resizeStartX = e.clientX;
        
        const leftCol = currentResizeWrapper?.querySelector('.col-left') as HTMLElement;
        const rightCol = currentResizeWrapper?.querySelector('.col-right') as HTMLElement;
        if (leftCol && rightCol) {
            const leftWidth = leftCol.getBoundingClientRect().width;
            const rightWidth = rightCol.getBoundingClientRect().width;
            startAvailableWidth = leftWidth + rightWidth;
            startLeftBasis = (leftWidth / startAvailableWidth) * 100;
        }
        
        e.preventDefault();
        document.body.style.cursor = 'col-resize';
    };

    window.addEventListener('mousemove', (e) => {
        if (isResizingColumn && currentResizeWrapper) {
            const dx = e.clientX - resizeStartX;
            const leftCol = currentResizeWrapper.querySelector('.col-left') as HTMLElement;
            const rightCol = currentResizeWrapper.querySelector('.col-right') as HTMLElement;
            
            if (leftCol && rightCol && startAvailableWidth > 0) {
                const dxPercent = (dx / startAvailableWidth) * 100;
                
                let newLeftBasis = startLeftBasis + dxPercent;
                if (newLeftBasis < 10) newLeftBasis = 10;
                if (newLeftBasis > 90) newLeftBasis = 90;
                
                currentResizeWrapper.dataset.ratio = newLeftBasis.toString();
                const currentGap = currentResizeWrapper.style.gap ? parseInt(currentResizeWrapper.style.gap) : 0;
                
                leftCol.style.flex = `0 0 calc(${newLeftBasis}% - ${currentGap}px - 6px)`;
                rightCol.style.flex = `0 0 calc(${100 - newLeftBasis}% - ${currentGap}px - 6px)`;
            }
        }
    });

    window.addEventListener('mouseup', () => {
        if (isResizingColumn) {
            isResizingColumn = false;
            currentResizeWrapper = null;
            document.body.style.cursor = '';
        }
    });
    // --- FIN LOGICA DE COLUMNAS ---

    window.triggerStandaloneImage = async function(btn: HTMLElement) { 
        const fileInput = btn.closest('.lms-element')?.querySelector<HTMLInputElement>('input[type="file"]');
        fileInput?.click(); 
    }
    
    const setImageInEditor = (el: Element, url: string) => {
        const img = el.querySelector<HTMLImageElement>('.uploaded-image'); 
        const wrapper = el.querySelector<HTMLElement>('.image-wrapper');
        const placeholder = el.querySelector<HTMLElement>('.image-placeholder'); 
        
        if(img) {
            img.src = url; 
            if (wrapper) wrapper.style.display = 'block';
            else {
                img.classList.remove('hidden'); 
                img.style.display = 'block';
            }
        }
        if(placeholder) {
            placeholder.classList.remove('flex');
            placeholder.classList.add('hidden'); 
            placeholder.style.display = 'none';
        }
    };

    interface SavedImage {
        url: string;
        thumb: string;
        time: number;
    }

    const getSavedImages = async (): Promise<SavedImage[]> => {
        return [];
    };

    const saveImageToLocalGallery = async (url: string, thumb?: string, fileObj?: File) => { };

    window.renderGalleryThumbnails = async function() {
        const container = document.getElementById('gallery-thumbnails');
        const emptyState = document.getElementById('gallery-empty-state');
        if (!container || !emptyState) return;

        container.innerHTML = '<div class="col-span-4 text-center text-gray-500 py-8"><span class="material-symbols-outlined animate-spin text-3xl">syncalt</span><p class="mt-2">Cargando galería...</p></div>';

        const images = await getSavedImages();
        
        if (images.length === 0) {
            container.classList.add('hidden');
            emptyState.classList.remove('hidden');
            emptyState.classList.add('flex');
            container.innerHTML = '';
        } else {
            container.classList.remove('hidden');
            emptyState.classList.add('hidden');
            emptyState.classList.remove('flex');
            
            container.innerHTML = images.map(img => `
                <div class="relative group cursor-pointer border-2 border-transparent hover:border-anahuac-orange rounded-lg overflow-hidden transition-all duration-200"
                     onclick="window.selectGalleryImage('${img.url}', this)"
                     ondblclick="window.selectGalleryImage('${img.url}', this); window.confirmGallerySelection();"
                     data-url="${img.url}">
                    <div class="aspect-square bg-gray-200 relative">
                        <img src="${img.thumb}" class="w-full h-full object-cover" loading="lazy" />
                        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <span class="material-symbols-outlined text-white text-3xl">check_circle</span>
                        </div>
                        <div class="selection-overlay absolute inset-0 bg-anahuac-orange/20 border-4 border-anahuac-orange hidden pointer-events-none"></div>
                    </div>
                </div>
            `).join('');
        }
    };

    window.selectGalleryImage = function(url: string, el: HTMLElement) {
        window.tempSelectedGalleryUrl = url;
        
        // Remove selection classes
        document.querySelectorAll('#gallery-thumbnails > div').forEach(div => {
            div.querySelector('.selection-overlay')?.classList.add('hidden');
            div.classList.remove('border-anahuac-orange');
            div.classList.add('border-transparent');
        });
        
        // Add to selected
        el.querySelector('.selection-overlay')?.classList.remove('hidden');
        el.classList.add('border-anahuac-orange');
        el.classList.remove('border-transparent');

        // Enable confirm button
        const confirmBtn = document.getElementById('gallery-confirm-btn');
        if (confirmBtn) {
            confirmBtn.className = "px-6 py-2 bg-anahuac-orange text-white rounded font-bold hover:bg-orange-600 transition-colors cursor-pointer";
        }
    };

    window.confirmGallerySelection = function() {
        if(window.tempSelectedGalleryUrl && window.currentGalleryTarget) {
            setImageInEditor(window.currentGalleryTarget, window.tempSelectedGalleryUrl);
            document.getElementById('gallery-modal')?.classList.add('hidden');
            window.tempSelectedGalleryUrl = null;
        }
    };

    const uploadImageHandler = async (file: File): Promise<string> => { throw new Error('Image upload not configured yet.'); };

    const setLoadingState = (el: Element, isLoading: boolean) => {
        const placeholder = el.querySelector<HTMLElement>('.image-placeholder');
        if (placeholder) {
            const uploadBtn = placeholder.querySelector('button');
            if (uploadBtn) {
                if (isLoading) {
                    uploadBtn.dataset.originalHtml = uploadBtn.innerHTML;
                    uploadBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Subiendo...';
                    uploadBtn.setAttribute('disabled', 'true');
                    uploadBtn.classList.add('opacity-75', 'cursor-not-allowed');
                } else if (uploadBtn.dataset.originalHtml) {
                    uploadBtn.innerHTML = uploadBtn.dataset.originalHtml;
                    uploadBtn.removeAttribute('disabled');
                    uploadBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                }
            }
        }
    };

    window.handleStandaloneImage = async function(input: HTMLInputElement) { 
        if (input.files && input.files[0]) { 
            const el = input.closest('.lms-element'); 
            if(!el) return;
            try {
                setLoadingState(el, true);
                const url = await uploadImageHandler(input.files[0]);
                setImageInEditor(el, url);
            } catch (err: any) {
                console.error(err);
                window.showToast(err.message || "Error al subir imagen. Revisa tu conexión o intenta con otra imagen.", true);
            } finally {
                setLoadingState(el, false);
            }
            input.value = '';
        } 
    }

    window.handleImageUrl = function(input: HTMLInputElement, event?: KeyboardEvent) {
        if (event && event.key !== 'Enter') return;
        const url = input.value.trim();
        if (!url) return;
        const el = input.closest('.lms-element');
        if (!el) return;
        try {
            new URL(url); // Basic validation
            setImageInEditor(el, url);
            input.value = '';
        } catch (e) {
            window.showToast("Por favor, introduce una URL válida.", true);
        }
    };


    window.handleImagePaste = async function(e: ClipboardEvent, el: HTMLElement) {
        if (!e.clipboardData) return;
        const items = e.clipboardData.items;
        
        // First try to find an image file
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                if(blob) {
                    try {
                        setLoadingState(el, true);
                        const url = await uploadImageHandler(blob);
                        setImageInEditor(el, url);
                    } catch (err: any) {
                        console.error(err);
                        window.showToast(err.message || "Error al subir imagen. Revisa tu conexión o intenta con otra imagen.", true);
                    } finally {
                        setLoadingState(el, false);
                    }
                }
                return;
            }
        }
        
        // If no image file, check if it's a text containing a URL
        const text = e.clipboardData.getData('text');
        if (text) {
            const url = text.trim();
            try {
                new URL(url); // Basic validation
                // Additional check to see if it might be an image URL by extension could be added here, 
                // but setting it in the editor will naturally fail to load if it's not an image.
                e.preventDefault();
                setImageInEditor(el, url);
                return;
            } catch (err) {
                // Not a valid URL, ignore
            }
        }
    }

    window.openGalleryModal = function(el: HTMLElement) {
        window.currentGalleryTarget = el;
        window.tempSelectedGalleryUrl = null;
        
        const confirmBtn = document.getElementById('gallery-confirm-btn');
        if (confirmBtn) {
            confirmBtn.className = "px-6 py-2 bg-gray-200 text-gray-500 rounded font-bold cursor-not-allowed transition-colors pointer-events-none";
        }

        window.renderGalleryThumbnails?.();
        
        const modal = document.getElementById('gallery-modal');
        if(modal) modal.classList.remove('hidden');
    }

    window.applyGalleryImage = function() {
        const input = document.getElementById('gallery-url-input') as HTMLInputElement;
        if(input && input.value.trim() !== '' && window.currentGalleryTarget) {
            const url = input.value.trim();
            saveImageToLocalGallery(url, url).then(() => {
                setImageInEditor(window.currentGalleryTarget, url);
                document.getElementById('gallery-modal')?.classList.add('hidden');
                input.value = '';
            });
        }
    }

    window.handleGalleryDrop = async function(e: DragEvent) {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                try {
                    const url = await uploadImageHandler(file);
                    if (window.currentGalleryTarget) {
                        setImageInEditor(window.currentGalleryTarget, url);
                    }
                    document.getElementById('gallery-modal')?.classList.add('hidden');
                } catch (err: any) {
                    console.error(err);
                    window.showToast(err.message || "Error al subir imagen", true);
                }
            }
        }
    }
    
    window.updateImageSize = function(slider: HTMLInputElement) { 
        const wrapper = slider.closest('.lms-element')?.querySelector<HTMLElement>('.image-wrapper');
        if (wrapper) {
            wrapper.style.width = slider.value + '%';
        } else {
            const img = slider.closest('.lms-element')?.querySelector<HTMLImageElement>('.uploaded-image'); 
            if(img) img.style.width = slider.value + '%'; 
        }
    }

    window.changeImageAspect = function(btn: HTMLElement, aspect: string) {
        const wrapper = btn.closest('.lms-element')?.querySelector<HTMLElement>('.image-wrapper');
        if (wrapper) {
            wrapper.style.aspectRatio = aspect;
        } else {
            const img = btn.closest('.lms-element')?.querySelector<HTMLImageElement>('.uploaded-image');
            if (img) img.style.aspectRatio = aspect;
        }
    }

    window.updateImagePosition = function(slider: HTMLInputElement, axis: 'x' | 'y') {
        const img = slider.closest('.lms-element')?.querySelector<HTMLImageElement>('.uploaded-image');
        if (img) {
            const currentPos = img.style.objectPosition || '50% 50%';
            const parts = currentPos.split(' ');
            let x = parts[0] || '50%';
            let y = parts[1] || '50%';
            
            if (axis === 'x') {
                x = slider.value + '%';
            } else {
                y = slider.value + '%';
            }
            img.style.objectPosition = `${x} ${y}`;
        }
    }

    window.changeImageRadius = function(btn: HTMLElement, radius: string) {
        const wrapper = btn.closest('.lms-element')?.querySelector<HTMLElement>('.image-wrapper');
        if (wrapper) {
            wrapper.style.borderRadius = radius;
        } else {
            const img = btn.closest('.lms-element')?.querySelector<HTMLImageElement>('.uploaded-image');
            if (img) img.style.borderRadius = radius;
        }
    }

    window.changeImageShadow = function(btn: HTMLElement, shadow: string) {
        const wrapper = btn.closest('.lms-element')?.querySelector<HTMLElement>('.image-wrapper');
        if (wrapper) {
            wrapper.style.boxShadow = shadow;
        } else {
            const img = btn.closest('.lms-element')?.querySelector<HTMLImageElement>('.uploaded-image');
            if (img) img.style.boxShadow = shadow;
        }
    }
    
    window.rotateImage = function(btn: HTMLElement, deg: number) { 
        const img = btn.closest('.lms-element')?.querySelector<HTMLImageElement>('.uploaded-image');
        if(!img) return;
        let currentRot = parseInt(img.dataset.rotation || '0'); 
        currentRot += deg; 
        img.dataset.rotation = currentRot.toString(); 
        img.style.transform = `rotate(${currentRot}deg)`; 
    }

    window.addAccordionTopic = function(btn: HTMLElement) {
        const topic = btn.closest('details');
        if(!topic) return;
        
        const clone = topic.cloneNode(true) as HTMLElement;
        const rootSummaryText = clone.querySelector('summary > div > .editable-text');
        if(rootSummaryText) rootSummaryText.innerHTML = 'Nuevo Tema';
        const bodyContent = clone.querySelector('.lms-dropzone > .editable-text');
        if(bodyContent) bodyContent.innerHTML = '<p class="text-anahuac-purple font-bold font-serif">Materiales:</p><ol class="list-custom list-numbers pl-4"><li>Contenido del tema.</li></ol>';
        
        // Reset sortable flag on clone
        const dropzone = clone.querySelector('.lms-dropzone');
        if (dropzone) (dropzone as HTMLElement).dataset.sortableActive = "false";
        
        topic.insertAdjacentElement('afterend', clone);
        if (window.initNestedDropzones) window.initNestedDropzones();
    }

    window.removeAccordionTopic = function(btn: HTMLElement) {
        const accordionElement = btn.closest('.lms-element[data-type="acordeon"]');
        const topic = btn.closest('details');
        if(!topic || !accordionElement) return;
        
        const allTopics = accordionElement.querySelectorAll('details');
        if (allTopics.length <= 1) {
            accordionElement.remove();
        } else {
            topic.remove();
        }
    }

    window.toggleGridDivision = function(btn: HTMLElement) {
        const grid = btn.closest('.lms-element')?.querySelector('.grid') as HTMLElement;
        if(!grid) return;
        
        // Use inline style to toggle between 1 column and responsive columns
        if (grid.style.gridTemplateColumns.includes('repeat(1,')) {
            grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))';
        } else {
            grid.style.gridTemplateColumns = 'repeat(1, minmax(0px, 1fr))';
        }
    }

    window.addGridRow = function(btn: HTMLElement) { 
        const grid = btn.closest('.lms-element')?.querySelector('.grid'); 
        if(!grid) return;
        const cellHTML = `<div class="p-6 flex gap-5 items-start bg-white group relative"><span class="material-symbols-outlined text-anahuac-orange text-[32px] editable-icon p-3 -m-2">star</span><div class="editable-text flex-1"><h3 class="text-anahuac-orange font-bold font-serif text-xl mb-1">Title</h3><p class="text-sm text-gray-600">Lorem ipsum tempor sit amet.</p></div></div>`; 
        grid.insertAdjacentHTML('beforeend', cellHTML); 
        grid.insertAdjacentHTML('beforeend', cellHTML); 
    }
    
    window.removeGridRow = function(btn: HTMLElement) { 
        const grid = btn.closest('.lms-element')?.querySelector('.grid'); 
        if(!grid) return;
        if(grid.children.length > 2) { 
            if(grid.lastElementChild) grid.removeChild(grid.lastElementChild); 
            if(grid.lastElementChild) grid.removeChild(grid.lastElementChild); 
        } 
    }

    window.toggleTabsOrientation = function(btn: HTMLElement) {
        const container = btn.closest('.lms-element[data-type="pestanas"]');
        if (!container) return;

        const mainContent = container.querySelector('.tabs-main-container');
        const tabList = container.querySelector('.tab-buttons-container');
        
        if (!mainContent || !tabList) return;

        const isHorizontal = container.getAttribute('data-orientation') === 'horizontal';
        
        if (isHorizontal) {
            container.setAttribute('data-orientation', 'vertical');
            mainContent.classList.remove('flex-col');
            mainContent.classList.add('md:flex-row', 'gap-4');
            tabList.classList.remove('border-b', 'mb-3');
            tabList.classList.add('flex-col', 'border-r', 'md:w-1/4', 'mb-0');
            
            // Adjust buttons for vertical
            tabList.querySelectorAll('button').forEach(b => {
                b.classList.remove('border-b-2', 'px-3', 'py-1.5');
                b.classList.add('border-r-2', 'px-4', 'py-2', 'text-left');
                if (b.classList.contains('border-anahuac-orange')) {
                    b.classList.add('border-anahuac-orange');
                } else {
                    b.classList.add('border-transparent');
                }
            });
        } else {
            container.setAttribute('data-orientation', 'horizontal');
            mainContent.classList.add('flex-col');
            mainContent.classList.remove('md:flex-row', 'gap-4');
            tabList.classList.add('border-b', 'mb-3');
            tabList.classList.remove('flex-col', 'border-r', 'md:w-1/4', 'mb-0');

            // Adjust buttons for horizontal
            tabList.querySelectorAll('button').forEach(b => {
                b.classList.add('border-b-2', 'px-3', 'py-1.5');
                b.classList.remove('border-r-2', 'px-4', 'py-2', 'text-left');
                if (b.classList.contains('border-anahuac-orange')) {
                    b.classList.add('border-anahuac-orange');
                } else {
                    b.classList.add('border-transparent');
                }
            });
        }
    }

    window.addTab = function(btn: HTMLElement) { 
        const container = btn.closest('.lms-element'); 
        if(!container) return;
        const tabList = container.querySelector('.tab-buttons-container'); 
        const panesContainer = container.querySelector('.tabs-panes-wrapper'); 
        if(!tabList || !panesContainer) return;

        const isVertical = container.getAttribute('data-orientation') === 'vertical';
        const uid = Date.now().toString(36); 
        const tabCount = tabList.children.length + 1; 
        
        const btnClasses = isVertical 
            ? 'px-4 py-2 border-r-2 border-transparent text-gray-500 font-bold font-serif text-base hover:text-anahuac-orange transition-colors focus:outline-none flex-shrink-0 text-left'
            : 'px-3 py-1.5 border-b-2 border-transparent text-gray-500 font-bold font-serif text-base hover:text-anahuac-orange transition-colors focus:outline-none flex-shrink-0';

        const btnHTML = `<button type="button" class="${btnClasses}" onclick="toggleLmsTab(this, 'tab-${uid}')"><span class="editable-text inline-block min-w-[30px]">Pestaña ${tabCount}</span></button>`; 
        tabList.insertAdjacentHTML('beforeend', btnHTML); 
        const paneHTML = `<div id="tab-${uid}" class="lms-tab-pane hidden flex-col gap-4 animate-fade-in lms-dropzone min-h-[80px]" data-sortable-active="false" style="display: none;"><div class="text-gray-700 leading-relaxed editable-text font-sans text-left text-[15px]"><p>Contenido pestaña ${tabCount}.</p></div></div>`; 
        panesContainer.insertAdjacentHTML('beforeend', paneHTML); 
        if(window.initNestedDropzones) window.initNestedDropzones(); 
    }

    window.removeTab = function(btn: HTMLElement) { 
        const container = btn.closest('.lms-element'); 
        if(!container) return;
        const tabList = container.querySelector('.tab-buttons-container'); 
        if(!tabList) return;
        if(tabList.children.length > 1) { 
            const lastBtn = tabList.lastElementChild as HTMLElement; 
            const matchId = lastBtn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1]; 
            lastBtn.remove(); 
            if(matchId) {
                const lastPane = container.querySelector('#' + matchId); 
                if(lastPane) lastPane.remove(); 
            }
            const remainingPanes = container.querySelectorAll('.lms-tab-pane'); 
            let hasActive = false; 
            remainingPanes.forEach(p => { if(p.classList.contains('block')) hasActive = true; }); 
            if(!hasActive && remainingPanes.length > 0) { 
                window.toggleLmsTab(tabList.firstElementChild as HTMLElement, remainingPanes[0].id); 
            } 
        } 
    }

    window.toggleLmsTab = function(btn: HTMLElement, targetId: string) { 
        if (btn.querySelector('.editable-text')?.getAttribute('contenteditable') === 'true') return; 
        const container = btn.closest('.lms-element'); 
        if(!container) return;
        
        const isVertical = container.getAttribute('data-orientation') === 'vertical';
        const tabList = container.querySelector('.tab-buttons-container');
        const buttons = tabList ? Array.from(tabList.children).filter((c: any) => c.tagName === 'BUTTON') : []; 
        
        buttons.forEach((b: any) => { 
            if (isVertical) {
                b.className = "px-4 py-2 border-r-2 border-transparent text-gray-500 font-bold font-serif text-base hover:text-anahuac-orange transition-colors focus:outline-none flex-shrink-0 text-left";
            } else {
                b.className = "px-3 py-1.5 border-b-2 border-transparent text-gray-500 font-bold font-serif text-base hover:text-anahuac-orange transition-colors focus:outline-none flex-shrink-0"; 
            }
        }); 
        
        if (isVertical) {
            btn.className = "px-4 py-2 border-r-2 border-anahuac-orange text-anahuac-orange font-bold font-serif text-base transition-colors focus:outline-none flex-shrink-0 text-left";
        } else {
            btn.className = "px-3 py-1.5 border-b-2 border-anahuac-orange text-anahuac-orange font-bold font-serif text-base transition-colors focus:outline-none flex-shrink-0"; 
        }

        const wrapper = container.querySelector('.tabs-panes-wrapper');
        if(!wrapper) return;
        
        const panes = Array.from(wrapper.children).filter((c: any) => c.classList.contains('lms-tab-pane')); 
        panes.forEach((p: any) => { 
            p.classList.remove('flex', 'block'); 
            p.classList.add('hidden'); 
            p.style.display = 'none';
        }); 
        const target = Array.from(wrapper.children).find((c: any) => c.id === targetId) as HTMLElement; 
        if(target) { 
            target.classList.remove('hidden'); 
            target.classList.add('flex'); 
            target.style.display = 'flex';
        } 
    }

    window.editCalculadora = function(btn: HTMLElement) {
        const container = btn.closest('.lms-element');
        if (!container) return;
        const placeholder = container.querySelector('.calc-placeholder') as HTMLElement;
        const resultDiv = container.querySelector('.calc-result') as HTMLElement;
        if (placeholder && resultDiv) {
            placeholder.classList.remove('hidden');
            resultDiv.classList.add('hidden');
            resultDiv.innerHTML = '';
        }
    };

    window.handleCalculadoraPaste = function(e: ClipboardEvent, el: HTMLElement) {
        if (!e.clipboardData) return;
        const text = e.clipboardData.getData('text/plain');
        if (text && text.trim().length > 0) {
            e.preventDefault();
            const rawCode = el.querySelector('.calc-raw-code') as HTMLTextAreaElement;
            if (rawCode) {
                rawCode.value = text;
                rawCode.textContent = text;
            }
            const btn = el.querySelector('.calc-process-btn') as HTMLElement;
            if (btn) btn.classList.remove('hidden');
            window.showToast('Código pegado correctamente. Haz clic en "Procesar e Insertar".');
        }
    };

    window.handleCalculadoraUpload = function(input: HTMLInputElement) {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target?.result as string;
            const container = input.closest('.calc-placeholder') as HTMLElement;
            const rawCode = container.querySelector('.calc-raw-code') as HTMLTextAreaElement;
            if (rawCode) {
                rawCode.value = text;
                rawCode.textContent = text;
            }
            const btn = container.querySelector('.calc-process-btn') as HTMLElement;
            if (btn) btn.classList.remove('hidden');
            window.showToast('Archivo cargado correctamente. Haz clic en "Procesar e Insertar".');
        };
        reader.readAsText(file);
    };

    window.processCalculadora = function(container: HTMLElement) {
        if (!container) return;
        const rawCodeEl = container.querySelector('.calc-raw-code') as HTMLTextAreaElement;
        const resultDiv = container.querySelector('.calc-result') as HTMLElement;
        const placeholder = container.querySelector('.calc-placeholder') as HTMLElement;
        if (!rawCodeEl || !resultDiv || !placeholder) return;

        let code = rawCodeEl.value.trim();
        if (!code) {
            window.showToast('No hay código para procesar.', true);
            return;
        }

        // Apply visual identity modifications
        // Change fonts, update colors, enforce styling
        const styleInjection = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Zilla+Slab:wght@400;600;700&display=swap');
            body, p, span, div, li, td, th {
                font-family: 'Roboto', sans-serif !important;
            }
            h1, h2, h3, h4, h5, h6, .course-title, .section-title {
                font-family: 'Zilla Slab', serif !important;
                color: #ff5900 !important;
            }
            body {
                background-color: transparent !important;
            }
            a {
                color: #ff5900 !important;
            }
        </style>
        <script>
            window.addEventListener('DOMContentLoaded', () => {
                const elements = document.querySelectorAll('*');
                elements.forEach(el => {
                    const style = window.getComputedStyle(el);
                    const bg = style.backgroundColor;
                    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                        const rgb = bg.match(/\\d+/g);
                        if (rgb && rgb.length >= 3) {
                            const brightness = Math.round(((parseInt(rgb[0]) * 299) +
                                            (parseInt(rgb[1]) * 587) +
                                            (parseInt(rgb[2]) * 114)) / 1000);
                            if (brightness > 240) {
                                // If it's almost white, make it light gray per instruction "ponerlo en gris claro"
                                el.style.backgroundColor = '#f3f4f6';
                            }
                            if (brightness < 125) {
                                el.style.color = '#ffffff';
                            } else {
                                el.style.setProperty('color', '#333333', 'important');
                            }
                        }
                    }
                });
            });
        </script>`;

        // If it's a full HTML document, inject before </head> or <body>
        if (code.toLowerCase().includes('</head>')) {
            code = code.replace(/<\/head>/i, styleInjection + '</head>');
        } else {
            code = styleInjection + code;
        }

        // Use iframe to isolate the code and avoid conflicts with the builder
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.border = 'none';
        iframe.style.minHeight = '600px'; // default min height
        iframe.setAttribute('srcdoc', code);
        
        // Auto-resize iframe (basic implementation)
        iframe.onload = () => {
            try {
                if (iframe.contentWindow && iframe.contentWindow.document.body) {
                    iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
                    // add observer inside iframe to resize dynamically
                    const observer = new ResizeObserver(() => {
                        iframe.style.height = iframe.contentWindow!.document.body.scrollHeight + 'px';
                    });
                    observer.observe(iframe.contentWindow.document.body);
                }
            } catch (e) {
                // Ignore cross-origin errors if any (though srcdoc shouldn't have them)
            }
        };

        resultDiv.innerHTML = '';
        resultDiv.appendChild(iframe);

        placeholder.classList.add('hidden');
        resultDiv.classList.remove('hidden');
    };

    window.processEmbed = function(element: HTMLElement, platform: string) { 
        const container = element.closest('.lms-element'); 
        if(!container) return;
        const inputVal = container.querySelector<HTMLInputElement>('.embed-input')?.value.trim(); 
        const resultDiv = container.querySelector('.embed-result'); 
        const placeholder = container.querySelector('.embed-placeholder'); 
        if (!inputVal || !resultDiv || !placeholder) return; 
        
        let iframeHTML = inputVal; 
        const containsIframe = /<iframe/i.test(inputVal);
        
        if (!containsIframe) { 
            let embedUrl = inputVal; 
            if (platform === 'embed_youtube') { 
                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/)([^#\&\?]*).*/; 
                const match = inputVal.match(regExp); 
                if (match && match[2].length === 11) { embedUrl = `https://www.youtube.com/embed/${match[2]}`; } 
                iframeHTML = `<iframe src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`; 
            } else if (platform === 'embed_vimeo') { 
                const match = inputVal.match(/vimeo\.com\/(?:video\/)?([0-9]+)/); 
                if (match && match[1]) embedUrl = `https://player.vimeo.com/video/${match[1]}`; 
                iframeHTML = `<iframe src="${embedUrl}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`; 
            } else if (platform === 'embed_sketchfab') { 
                const match = inputVal.match(/sketchfab\.com\/3d-models\/[a-zA-Z0-9-]+-([a-zA-Z0-9]+)/); 
                if (match && match[1]) embedUrl = `https://sketchfab.com/models/${match[1]}/embed`; 
                iframeHTML = `<iframe src="${embedUrl}" frameborder="0" allow="autoplay; fullscreen; vr" allowfullscreen></iframe>`; 
            } else if (platform === 'embed_gamma') {
                iframeHTML = `<iframe src="${embedUrl}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen="true" style="width: 100% !important; min-width: 100% !important; max-width: 100% !important; aspect-ratio: 16/9; border: none; display: block; margin: 0; padding: 0;"></iframe>`;
            } else if (platform === 'embed_canva') {
                embedUrl = embedUrl.split('?')[0] + '?embed';
                iframeHTML = `<iframe src="${embedUrl}" allowfullscreen="allowfullscreen" allow="fullscreen" class="w-full aspect-[16/9] border-0 rounded-lg shadow-md"></iframe>`;
            } else { 
                iframeHTML = `<iframe src="${embedUrl}" frameborder="0" allowfullscreen="true"></iframe>`; 
            } 
        } else {
            // Si es un iframe o viene dentro de un contenedor html, procesamos según cada plataforma
            if (platform === 'embed_gamma') {
                const srcMatch = inputVal.match(/src=["']([^"']+)["']/i);
                if (srcMatch && srcMatch[1]) {
                    const embedUrl = srcMatch[1];
                    iframeHTML = `<iframe src="${embedUrl}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen="true" style="width: 100% !important; min-width: 100% !important; max-width: 100% !important; aspect-ratio: 16/9; border: none; display: block; margin: 0; padding: 0;"></iframe>`;
                }
            } else if (platform === 'embed_canva') {
                const srcMatch = inputVal.match(/src=["']([^"']+)["']/i);
                if (srcMatch && srcMatch[1]) {
                    const embedUrl = srcMatch[1];
                    iframeHTML = `<iframe src="${embedUrl}" allowfullscreen="allowfullscreen" allow="fullscreen" class="w-full aspect-[16/9] border-0 rounded-lg shadow-md"></iframe>`;
                }
            }
        } 
        
        // Agregar clases base solo si no tiene estilos complejos o si ya las ajustamos para canva
        if (!iframeHTML.includes('background:') && platform !== 'embed_gamma' && platform !== 'embed_canva') {
            iframeHTML = iframeHTML.replace(/<iframe/i, '<iframe class="w-full aspect-[16/9]"'); 
        } else if (platform === 'embed_gamma') {
            iframeHTML = iframeHTML.replace(/<iframe/i, '<iframe class="w-full block" style="width: 100% !important; min-width: 100% !important; max-width: 100% !important; aspect-ratio: 16/9;"');
        }
        
        // Asegurarse de que allowfullscreen esté presente si es gamma y viene como iframe
        if (platform === 'embed_gamma' && !iframeHTML.includes('allowfullscreen')) {
            iframeHTML = iframeHTML.replace(/<iframe/i, '<iframe allowfullscreen="true" allow="autoplay; fullscreen"');
        }

        resultDiv.innerHTML = iframeHTML; 
        placeholder.classList.add('hidden'); 
        resultDiv.classList.remove('hidden'); 
        resultDiv.classList.add('block'); 
        
        // Para Gamma, ajuste perfecto al margen de la página
        if (platform === 'embed_gamma') {
            resultDiv.classList.remove('bg-black', 'rounded-lg', 'shadow-lg', 'overflow-hidden');
            resultDiv.classList.add('w-full', 'max-w-full');
            resultDiv.setAttribute('style', 'width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; border: none !important; display: block !important;');
        }
    }
    
    window.editEmbed = function(btn: HTMLElement) { 
        const container = btn.closest('.lms-element'); 
        if(!container) return;
        container.querySelector('.embed-placeholder')?.classList.remove('hidden'); 
        const resultDiv = container.querySelector('.embed-result'); 
        if(resultDiv) {
            resultDiv.classList.add('hidden'); 
            resultDiv.classList.remove('block'); 
            resultDiv.innerHTML = ''; 
        }
    }

    window.openBgModal = function() { 
        window.currentBgTarget = document.getElementById('canvas-container-outer') || document.getElementById('canvas'); 
        if (window.currentBgTarget) {
            window.tempBgTheme = window.currentBgTarget.dataset.bg || 'blanco';
        window.tempBgColorHex = window.currentBgTarget.dataset.bgColor || '';
            window.tempBgMargin = window.currentBgTarget.dataset.bgMargin || '15';

            const marginSlider = document.getElementById('bg-margin-slider') as HTMLInputElement;
            if (marginSlider) {
                marginSlider.value = window.tempBgMargin;
                const valLabel = document.getElementById('bg-margin-val');
                if (valLabel) valLabel.innerText = `${window.tempBgMargin}px`;
            }
        }
        
        // Remove selection outlines
        document.querySelectorAll('.bg-option-btn').forEach(b => {
            b.classList.remove('ring-4', 'ring-anahuac-orange', 'border-anahuac-orange');
            if(b.classList.contains('border-transparent')) {
                b.classList.add('border-transparent');
            }
        });
        
        document.getElementById('bg-modal')?.classList.remove('hidden'); 
    }

    window.toggleBgVisibility = function(btn: HTMLElement) {
        const container = btn.closest('.parallax-container') as HTMLElement;
        if (!container) return;
        const bgWrapper = container.querySelector('.parallax-bg-wrapper');
        const icon = btn.querySelector('.toggle-bg-icon');
        if (bgWrapper) {
            if (bgWrapper.classList.contains('hidden')) {
                bgWrapper.classList.remove('hidden');
                if(icon) icon.innerHTML = 'visibility';
                const margin = container.dataset.bgMargin || '15';
                container.style.padding = `${margin}px`;
                
                // Set default to blanco if nothing is set, applying properly over SVGs
                const currentBg = container.dataset.bg || 'blanco';
                window.currentBgTarget = container;
                window.changeBackground(currentBg, container.dataset.bgColor || '');
            } else {
                bgWrapper.classList.add('hidden');
                if(icon) icon.innerHTML = 'visibility_off';
                container.style.padding = '0px';
            }
        }
    }

    window.updateBgMargin = function(val: string) {
        window.tempBgMargin = val;
        const valLabel = document.getElementById('bg-margin-val');
        if (valLabel) valLabel.innerText = `${val}px`;
    }

    window.applyBgSettings = function() {
        if (!window.currentBgTarget) return;

        // Apply theme if changed
        if (window.tempBgTheme) {
            window.changeBackground(window.tempBgTheme, window.tempBgColorHex);
        }

        // Apply Margin
        window.currentBgTarget.dataset.bgMargin = window.tempBgMargin;
        window.currentBgTarget.style.padding = `${window.tempBgMargin}px`;
        
        document.getElementById('bg-modal')?.classList.add('hidden');
    }

    window.selectBackground = function(btn: HTMLElement, theme: string, colorHex?: string) {
        window.tempBgTheme = theme;
        window.tempBgColorHex = colorHex;
        
        // Remove selection outline from all background options
        document.querySelectorAll('.bg-option-btn').forEach(b => {
            b.classList.remove('ring-4', 'ring-anahuac-orange', 'border-anahuac-orange');
            if(b.classList.contains('border-transparent')) {
                b.classList.add('border-transparent');
            }
        });
        
        // Add selection outline to the clicked button
        btn.classList.add('ring-4', 'ring-anahuac-orange');
        btn.classList.remove('border-transparent');
    };

    window.changeBackground = function(theme: string, colorHex?: string) {
        if(!window.currentBgTarget) return; 

        let base = window.currentBgTarget.querySelector('.bg-layer') as HTMLElement; 
        if(!base) {
             base = document.createElement('div');
             base.className = 'parallax-layer bg-layer';
             window.currentBgTarget.insertBefore(base, window.currentBgTarget.firstChild);
        }

        let l1 = window.currentBgTarget.querySelector('.layer-1') as HTMLElement; 
        if(!l1) { l1 = document.createElement('div'); l1.className = 'parallax-layer layer-1'; l1.dataset.speed = "0.05"; window.currentBgTarget.insertBefore(l1, base.nextSibling); }
        let l2 = window.currentBgTarget.querySelector('.layer-2') as HTMLElement; 
        if(!l2) { l2 = document.createElement('div'); l2.className = 'parallax-layer layer-2'; l2.dataset.speed = "0.10"; window.currentBgTarget.insertBefore(l2, l1.nextSibling); }
        let l3 = window.currentBgTarget.querySelector('.layer-3') as HTMLElement;
        if(!l3) { l3 = document.createElement('div'); l3.className = 'parallax-layer layer-3'; l3.dataset.speed = "0.15"; window.currentBgTarget.insertBefore(l3, l2.nextSibling); }

        window.currentBgTarget.setAttribute('data-bg', theme);
        if(theme === 'color_solido' && colorHex) {
            window.currentBgTarget.setAttribute('data-bg-color', colorHex);
        }

        if (theme === 'malla_diagonal' || theme === 'trazos_grises') { 
            base.style.backgroundColor = '#FFFFFF'; 
            const svgMalla = "url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20stroke%3D%22%23E5E7EB%22%20stroke-width%3D%221%22%20stroke-linecap%3D%22round%22%3E%3Cline%20x1%3D%2210%22%20y1%3D%2230%22%20x2%3D%2216%22%20y2%3D%2224%22%2F%3E%3Cline%20x1%3D%2214%22%20y1%3D%2234%22%20x2%3D%2220%22%20y2%3D%2228%22%2F%3E%3Cline%20x1%3D%2218%22%20y1%3D%2238%22%20x2%3D%2224%22%20y2%3D%2232%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')";
            if(l1) { l1.style.backgroundImage = svgMalla; l1.style.backgroundSize = "120px 120px"; l1.style.backgroundPosition = "0px 0px"; }
            if(l2) { l2.style.backgroundImage = svgMalla; l2.style.backgroundSize = "120px 120px"; l2.style.backgroundPosition = "60px 60px"; }
            if(l3) l3.style.backgroundImage = "none"; 
        } else if (theme === 'patron_entrelazado' || theme === 'geo_profundo') { 
            base.style.backgroundColor = '#FAF9FF'; 
            if(l1) { l1.style.backgroundImage = "url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%2220%22%20height%3D%2220%22%20fill%3D%22%23F0F0FF%22%2F%3E%3Crect%20x%3D%2220%22%20y%3D%2220%22%20width%3D%2220%22%20height%3D%2220%22%20fill%3D%22%23F0F0FF%22%2F%3E%3C%2Fsvg%3E')"; l1.style.backgroundSize = "120px 120px"; l1.style.backgroundPosition = "0px 0px"; }
            if(l2) { l2.style.backgroundImage = "url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20x%3D%225%22%20y%3D%220%22%20width%3D%2210%22%20height%3D%2220%22%20fill%3D%22%23FF5900%22%2F%3E%3Crect%20x%3D%2220%22%20y%3D%2225%22%20width%3D%2220%22%20height%3D%2210%22%20fill%3D%22%23FF5900%22%2F%3E%3C%2Fsvg%3E')"; l2.style.backgroundSize = "120px 120px"; l2.style.backgroundPosition = "60px 60px"; }
            if(l3) l3.style.backgroundImage = "none"; 
        } else if (theme === 'ondas_naranjas') { 
            base.style.backgroundColor = '#FFFAF5'; 
            if(l1) { l1.style.backgroundImage = "url('data:image/svg+xml;utf8,%3Csvg%20width%3D%22200%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23FF5900%22%20stroke-width%3D%224%22%20stroke-opacity%3D%220.2%22%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%22100%22%20r%3D%2220%22%2F%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%22100%22%20r%3D%2240%22%2F%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%22100%22%20r%3D%2260%22%2F%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%22100%22%20r%3D%2280%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')"; l1.style.backgroundSize = "600px 600px"; l1.style.backgroundPosition = "0px 0px"; }
            if(l2) { l2.style.backgroundImage = "url('data:image/svg+xml;utf8,%3Csvg%20width%3D%22200%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23FF5900%22%20stroke-width%3D%224%22%20stroke-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%22100%22%20r%3D%22100%22%2F%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%22100%22%20r%3D%22120%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')"; l2.style.backgroundSize = "600px 600px"; l2.style.backgroundPosition = "300px 300px"; }
            if(l3) l3.style.backgroundImage = "none"; 
        } else if (theme === 'arcos_morados') { 
            base.style.backgroundColor = '#F9F7FF'; 
            if(l1) { l1.style.backgroundImage = "url('data:image/svg+xml;utf8,%3Csvg%20width%3D%22200%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%235d428c%22%20stroke-width%3D%228%22%20stroke-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%220%22%20cy%3D%22100%22%20r%3D%2240%22%2F%3E%3Ccircle%20cx%3D%220%22%20cy%3D%22100%22%20r%3D%2280%22%2F%3E%3Ce%20stroke%3D%22%235d428c%22%20stroke-opacity%3D%220.1%22%20stroke-width%3D%228%22%20cx%3D%220%22%20cy%3D%22100%22%20r%3D%22120%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')"; l1.style.backgroundSize = "600px 600px"; l1.style.backgroundPosition = "0px 0px"; }
            if(l2) { l2.style.backgroundImage = "url('data:image/svg+xml;utf8,%3Csvg%20width%3D%22200%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%235d428c%22%20stroke-width%3D%228%22%20stroke-opacity%3D%220.09%22%3E%3Ccircle%20cx%3D%220%22%20cy%3D%22100%22%20r%3D%22160%22%2F%3E%3Ccircle%20cx%3D%220%22%20cy%3D%22100%22%20r%3D%22200%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')"; l2.style.backgroundSize = "600px 600px"; l2.style.backgroundPosition = "300px 300px"; }
            if(l3) l3.style.backgroundImage = "none"; 
        } else if (theme === 'geometria_creativa') { 
            base.style.backgroundColor = '#FFFFFF'; 
            if(l1) { l1.style.backgroundImage = "url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%2C0%20L30%2C0%20A30%2C30%200%200%201%200%2C30%20Z%22%20fill%3D%22%23FF5900%22%2F%3E%3Ccircle%20cx%3D%2245%22%20cy%3D%2245%22%20r%3D%2215%22%20fill%3D%22%23D9D2E9%22%2F%3E%3C%2Fsvg%3E')"; l1.style.backgroundSize = "180px 180px"; l1.style.backgroundPosition = "0px 0px"; }
            if(l2) { l2.style.backgroundImage = "url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M30%2C30%20A30%2C30%200%200%200%2060%2C0%20L60%2C30%20Z%22%20fill%3D%22%234C3470%22%2F%3E%3C%2Fsvg%3E')"; l2.style.backgroundSize = "180px 180px"; l2.style.backgroundPosition = "90px 90px"; }
            if(l3) l3.style.backgroundImage = "none"; 
        } else if (theme === 'antigravity') {
            base.style.backgroundColor = '#F5F8FF'; 
            const svgGrid = "url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20stroke%3D%22%2300f0ff%22%20stroke-width%3D%221%22%20stroke-opacity%3D%220.15%22%3E%3Cline%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%2260%22%20y2%3D%2260%22%20%2F%3E%3Cline%20x1%3D%2260%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%2260%22%20%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')";
            if(l1) { l1.style.backgroundImage = svgGrid; l1.style.backgroundSize = "180px 180px"; l1.style.backgroundPosition = "0px 0px"; }
            if(l2) { l2.style.backgroundImage = svgGrid; l2.style.backgroundSize = "180px 180px"; l2.style.backgroundPosition = "90px 90px"; }
            if(l3) l3.style.backgroundImage = "none";
        } else if (theme === 'blanco' || theme === 'naranja_solido') { 
            base.style.backgroundColor = '#FFFFFF'; 
            base.style.backgroundImage = "none";
            if(l1) l1.style.backgroundImage = "none"; 
            if(l2) l2.style.backgroundImage = "none"; 
            if(l3) l3.style.backgroundImage = "none"; 
        } else if (theme === 'color_solido') {
            base.style.backgroundColor = colorHex || '#646464';
            base.style.backgroundImage = "none";
            if(l1) l1.style.backgroundImage = "none"; 
            if(l2) l2.style.backgroundImage = "none"; 
            if(l3) l3.style.backgroundImage = "none"; 
        } else if (theme === 'imagen' && colorHex) {
            base.style.backgroundColor = 'transparent';
            base.style.backgroundImage = `url('${colorHex}')`;
            base.style.backgroundSize = 'cover';
            base.style.backgroundPosition = 'center';
            if(l1) l1.style.backgroundImage = "none"; 
            if(l2) l2.style.backgroundImage = "none"; 
            if(l3) l3.style.backgroundImage = "none"; 
        } 
    }

    window.openFooterModal = function(wrapper: HTMLElement) {
        window.currentFooterWrapper = wrapper;
        window.tempFooterType = wrapper.dataset.footerType || 'lineas';
        window.tempFooterLogo = parseInt(wrapper.dataset.footerLogo || '1');
        window.tempFooterLogoColor = wrapper.dataset.footerLogoColor || 'naranja';
        window.tempFooterBlockColor = wrapper.dataset.footerBlockColor || 'naranja';
        window.updateFooterModalUI();
        document.getElementById('footer-modal')?.classList.remove('hidden');
    }

    const getColorHex = (colorString: string) => {
        switch(colorString) {
            case 'naranja': return '#ff5900';
            case 'gris': return '#646464';
            case 'gris_oscuro': return '#333333';
            case 'morado': return '#5d428c';
            case 'blanco': return '#ffffff';
            default: return '#ff5900';
        }
    }

    window.openGlobalFooterModal = function() {
        window.isGlobalFooterConfig = true;
        const gc = (window as any).globalFooterConfig || { type: 'lineas', logoColor: 'naranja', blockColor: 'naranja', logoId: 1 };
        window.tempFooterType = gc.type;
        window.tempFooterLogoColor = gc.logoColor;
        window.tempFooterBlockColor = gc.blockColor;
        window.tempFooterLogo = gc.logoId;

        window.updateFooterModalUI();
        document.getElementById('footer-modal')?.classList.remove('hidden');
    }
    
    window.updateFooterModalUI = function() {
        const btnL = document.getElementById('btn-footer-lineas');
        const btnS = document.getElementById('btn-footer-solido');
        if(btnL) btnL.className = window.tempFooterType === 'lineas' ? "flex-1 py-2 border-2 border-anahuac-orange text-anahuac-orange rounded font-bold" : "flex-1 py-2 border-2 border-gray-200 text-gray-500 rounded font-bold hover:border-anahuac-orange transition-colors";
        if(btnS) btnS.className = window.tempFooterType === 'solido' ? "flex-1 py-2 border-2 border-anahuac-orange text-anahuac-orange rounded font-bold" : "flex-1 py-2 border-2 border-gray-200 text-gray-500 rounded font-bold hover:border-anahuac-orange transition-colors";
        
        const logoColorContainer = document.getElementById('footer-logo-color-container');
        const blockColorContainer = document.getElementById('footer-block-color-container');

        if(window.tempFooterType === 'lineas') {
            if(logoColorContainer) logoColorContainer.classList.toggle('hidden', Number(window.tempFooterLogo) === 6);
            if(blockColorContainer) blockColorContainer.classList.add('hidden');
        } else {
            if(logoColorContainer) logoColorContainer.classList.add('hidden');
            if(blockColorContainer) blockColorContainer.classList.remove('hidden');
        }

        // Selected block color buttons
        document.querySelectorAll('.block-color-btn').forEach(btn => {
            const color = btn.getAttribute('data-color');
            if(color === window.tempFooterBlockColor) {
               btn.className = `flex-1 py-2 border-2 rounded font-bold transition-colors block-color-btn border-anahuac-orange text-anahuac-orange bg-orange-50`;
            } else {
               btn.className = `flex-1 py-2 border-2 border-gray-200 text-gray-500 rounded font-bold transition-colors block-color-btn hover:border-anahuac-orange`;
            }
        });

        // Selected logo color buttons
        document.querySelectorAll('.logo-color-btn').forEach(btn => {
            const color = btn.getAttribute('data-color');
            if(color === window.tempFooterLogoColor) {
               btn.className = `flex-1 py-2 border-2 rounded font-bold transition-colors logo-color-btn border-anahuac-orange text-anahuac-orange bg-orange-50`;
            } else {
               btn.className = `flex-1 py-2 border-2 border-gray-200 text-gray-500 rounded font-bold transition-colors logo-color-btn hover:border-anahuac-orange`;
            }
        });

        // Logos
        const displayColor = window.tempFooterType === 'lineas' ? getColorHex(window.tempFooterLogoColor) : getColorHex('blanco');
        const displayBg = window.tempFooterType === 'lineas' ? 'transparent' : getColorHex(window.tempFooterBlockColor);

        document.querySelectorAll('.footer-logo-btn').forEach(btn => {
            const id = parseInt(btn.getAttribute('data-id') || '1');
            btn.className = window.tempFooterLogo === id ? "border-2 border-anahuac-orange rounded p-2 text-center bg-orange-50 footer-logo-btn cursor-pointer shadow-md" : "border-2 border-gray-200 rounded p-2 text-center footer-logo-btn cursor-pointer hover:border-anahuac-orange transition-colors";
            (btn as HTMLElement).style.backgroundColor = displayBg;
            const maskDiv = btn.querySelector('.logo-mask') as HTMLElement;
            if(maskDiv) {
                maskDiv.style.backgroundColor = displayColor;
            }
        });
    }

    window.applyFooterConfig = function() {
        if (window.isGlobalFooterConfig) {
            (window as any).globalFooterConfig = {
                type: window.tempFooterType,
                logoColor: window.tempFooterLogoColor,
                blockColor: window.tempFooterBlockColor,
                logoId: window.tempFooterLogo
            };
            
            // Optionally apply this new global config to all existing footers directly
            document.querySelectorAll('.lms-footer-wrapper').forEach(wrapper => {
                window.currentFooterWrapper = wrapper as HTMLElement;
                window.applyFooterConfigBase(wrapper as HTMLElement);
            });
            window.currentFooterWrapper = null;
            
            document.getElementById('footer-modal')?.classList.add('hidden');
            window.isGlobalFooterConfig = false;
            return;
        }

        if(!window.currentFooterWrapper) return;
        window.applyFooterConfigBase(window.currentFooterWrapper);
        document.getElementById('footer-modal')?.classList.add('hidden');
    }

    window.applyFooterConfigBase = function(wrapper: HTMLElement) {
        wrapper.dataset.footerType = window.tempFooterType;
        wrapper.dataset.footerLogo = window.tempFooterLogo.toString();
        wrapper.dataset.footerLogoColor = window.tempFooterLogoColor;
        wrapper.dataset.footerBlockColor = window.tempFooterBlockColor;

        let displayColor = window.tempFooterType === 'lineas' ? getColorHex(window.tempFooterLogoColor) : getColorHex('blanco');
        let blocksColor = window.tempFooterType === 'lineas' ? getColorHex(window.tempFooterLogoColor) : getColorHex(window.tempFooterBlockColor);
        const contentDiv = wrapper.querySelector('.footer-content');

        const displaySvg = (window as any).footerLogoUrls?.[window.tempFooterLogo] || (window as any).footerLogoUrls?.['1'] || '';
        
        if(contentDiv) {
            const logoVisual = Number(window.tempFooterLogo) === 6
                ? `<img src="${displaySvg}" alt="Anáhuac Querétaro en colaboración con Coventry University" class="footer-logo-image" style="width: 100%; height: 100%; object-fit: contain;">`
                : `<div class="footer-logo-mask" style="width: 100%; height: 100%; mask-image: url('${displaySvg}'); -webkit-mask-image: url('${displaySvg}'); mask-size: contain; -webkit-mask-size: contain; mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat; mask-position: center; -webkit-mask-position: center; background-color: ${displayColor}"></div>`;
            const logoHtml = `<div class="inline-block mx-2 footer-logo flex items-center justify-center overflow-visible" data-logo-idx="${window.tempFooterLogo}" style="width: 280px; height: 60px;">
                ${logoVisual}
            </div>`;

            if(window.tempFooterType === 'lineas') {
                contentDiv.innerHTML = `<div class="flex items-center justify-center gap-4 w-full"><div class="flex-1 flex flex-col gap-1"><div class="h-[2px] w-full" style="background-color: ${blocksColor}"></div><div class="h-[2px] w-full" style="background-color: ${blocksColor}"></div><div class="h-[2px] w-full" style="background-color: ${blocksColor}"></div></div>${logoHtml}<div class="flex-1 flex flex-col gap-1"><div class="h-[2px] w-full" style="background-color: ${blocksColor}"></div><div class="h-[2px] w-full" style="background-color: ${blocksColor}"></div><div class="h-[2px] w-full" style="background-color: ${blocksColor}"></div></div></div>`;
            } else {
                contentDiv.innerHTML = `<div class="w-full py-6 flex justify-center rounded-b-xl" style="background-color: ${blocksColor}">${logoHtml}</div>`;
            }
        }
    }

    // --- INLINE ICON TOOLBAR POPOVER ---
    const inlineIconToolbar = document.createElement('div');
    inlineIconToolbar.id = 'inline-icon-toolbar';
    inlineIconToolbar.className = 'absolute bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 flex gap-1 z-[100] transition-opacity duration-200';
    inlineIconToolbar.style.opacity = '0';
    inlineIconToolbar.style.pointerEvents = 'none';
    inlineIconToolbar.innerHTML = `
        <div class="absolute inset-x-0 h-12 -top-12 bg-transparent"></div>
        <div class="absolute inset-x-0 h-12 -top-12 bg-transparent"></div>
        <div class="absolute inset-y-0 w-12 -left-12 bg-transparent"></div>
        <div class="absolute inset-y-0 w-12 -right-12 bg-transparent"></div>
        <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded hover:bg-orange-50 transition-colors flex items-center justify-center relative z-10" onclick="window.currentInlineIcon && window.changeInlineIconSize(window.currentInlineIcon, -8)" title="Hacer más pequeño"><span class="material-symbols-outlined text-[16px] pointer-events-none">remove</span></button>
        <button type="button" class="text-gray-400 hover:text-anahuac-orange p-1 rounded hover:bg-orange-50 transition-colors flex items-center justify-center relative z-10" onclick="window.currentInlineIcon && window.changeInlineIconSize(window.currentInlineIcon, 8)" title="Hacer más grande"><span class="material-symbols-outlined text-[16px] pointer-events-none">add</span></button>
        <div class="w-px h-4 bg-gray-200 mx-1 my-auto relative z-10"></div>
        <button type="button" class="w-5 h-5 rounded-full bg-[#ff5900] border border-transparent hover:ring-2 ring-offset-1 ring-[#ff5900] mx-0.5 my-auto relative z-10" onclick="window.currentInlineIcon && window.changeInlineIconColor(window.currentInlineIcon, 'text-anahuac-orange')" title="Naranja"></button>
        <button type="button" class="w-5 h-5 rounded-full bg-[#5d428c] border border-transparent hover:ring-2 ring-offset-1 ring-[#5d428c] mx-0.5 my-auto relative z-10" onclick="window.currentInlineIcon && window.changeInlineIconColor(window.currentInlineIcon, 'text-anahuac-purple')" title="Morado"></button>
        <button type="button" class="w-5 h-5 rounded-full bg-[#646464] border border-transparent hover:ring-2 ring-offset-1 ring-[#646464] mx-0.5 my-auto relative z-10" onclick="window.currentInlineIcon && window.changeInlineIconColor(window.currentInlineIcon, 'text-gray-600')" title="Gris"></button>
        <button type="button" class="w-5 h-5 rounded-full bg-[#9ca3af] border border-transparent hover:ring-2 ring-offset-1 ring-[#9ca3af] mx-0.5 my-auto relative z-10" onclick="window.currentInlineIcon && window.changeInlineIconColor(window.currentInlineIcon, 'text-gray-400')" title="Gris Claro"></button>
        <div class="w-px h-4 bg-gray-200 mx-1 my-auto alignment-separator relative z-10"></div>
        <button type="button" class="alignment-btn text-gray-400 hover:text-anahuac-orange p-1 rounded hover:bg-orange-50 transition-colors flex items-center justify-center relative z-10" onclick="window.currentInlineIcon && window.alignInlineIcon(window.currentInlineIcon, 'left')" title="Alinear a la izquierda"><span class="material-symbols-outlined text-[16px] pointer-events-none">format_align_left</span></button>
        <button type="button" class="alignment-btn text-gray-400 hover:text-anahuac-orange p-1 rounded hover:bg-orange-50 transition-colors flex items-center justify-center relative z-10" onclick="window.currentInlineIcon && window.alignInlineIcon(window.currentInlineIcon, 'center')" title="Centrar"><span class="material-symbols-outlined text-[16px] pointer-events-none">format_align_center</span></button>
        <button type="button" class="alignment-btn text-gray-400 hover:text-anahuac-orange p-1 rounded hover:bg-orange-50 transition-colors flex items-center justify-center relative z-10" onclick="window.currentInlineIcon && window.alignInlineIcon(window.currentInlineIcon, 'right')" title="Alinear a la derecha"><span class="material-symbols-outlined text-[16px] pointer-events-none">format_align_right</span></button>
        <div class="w-px h-4 bg-gray-200 mx-1 my-auto inline-icon-delete-sep relative z-10"></div>
        <button type="button" class="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors flex items-center justify-center inline-icon-delete relative z-10" onclick="window.currentInlineIcon && window.currentInlineIcon.closest('.lms-element')?.getAttribute('data-type') !== 'grid_2x2' ? window.currentInlineIcon.remove() : null; document.getElementById('inline-icon-toolbar').style.opacity='0'; document.getElementById('inline-icon-toolbar').style.pointerEvents='none';" title="Eliminar"><span class="material-symbols-outlined text-[16px] pointer-events-none">delete</span></button>
        <div class="w-px h-4 bg-gray-200 mx-1 my-auto grid-icon-gallery-sep relative z-10"></div>
        <button type="button" class="grid-icon-gallery-btn text-gray-400 hover:text-anahuac-orange p-1 rounded hover:bg-orange-50 transition-colors flex items-center justify-center relative z-10" onclick="if(window.currentInlineIcon){ window.currentIconTarget = window.currentInlineIcon; document.getElementById('icon-modal').classList.remove('hidden'); }" title="Cambiar Ícono"><span class="material-symbols-outlined text-[16px] pointer-events-none">grid_view</span></button>
        <div class="w-px h-4 bg-gray-200 mx-1 my-auto profe-hidden-icon-sep relative z-10 hidden"></div>
        <button type="button" class="profe-hidden-icon-btn text-gray-400 hover:text-anahuac-orange p-1 rounded hover:bg-orange-50 transition-colors items-center justify-center relative z-10 hidden" onclick="window.currentInlineIcon && window.toggleInlineIconVisibility(window.currentInlineIcon)" title="Alternar Ícono"><span class="material-symbols-outlined text-[16px] pointer-events-none">visibility_off</span></button>
    `;
    document.body.appendChild(inlineIconToolbar);

    window.currentInlineIcon = null;
    let iconHoverTimeout: any;

    document.addEventListener('mouseover', (e: MouseEvent) => {
        if(window.isLmsDragging) return;
        const target = e.target as HTMLElement;
        const icon = target.closest('.editable-icon') as HTMLElement;
        const isToolbar = target.closest('#inline-icon-toolbar');
        
        if (icon || isToolbar) {
            clearTimeout(iconHoverTimeout);
            if (icon) {
                // Disable inline toolbars for un-editable icons in the canvas, and elements that have their own toolbar
                if ((icon.closest('.lms-element[data-type="profesor_datos"]') && !icon.closest('#profesor-datos-modal')) ||
                    icon.closest('.lms-element[data-type="icono_suelto"]')) {
                    inlineIconToolbar.style.opacity = '0';
                    inlineIconToolbar.style.pointerEvents = 'none';
                    return;
                }
                
                const isProfesorModalIcon = !!icon.closest('#profesor-datos-modal');
                const isGridIcon = !!icon.closest('.lms-element[data-type="grid_2x2"]');

                const alignElements = inlineIconToolbar.querySelectorAll('.alignment-btn, .alignment-separator');
                alignElements.forEach(el => {
                    (el as HTMLElement).style.display = isProfesorModalIcon ? 'none' : 'flex';
                });

                const deleteElements = inlineIconToolbar.querySelectorAll('.inline-icon-delete, .inline-icon-delete-sep');
                deleteElements.forEach(el => {
                    (el as HTMLElement).style.display = (isProfesorModalIcon || isGridIcon) ? 'none' : 'flex';
                });

                const hideIconElements = inlineIconToolbar.querySelectorAll('.profe-hidden-icon-btn, .profe-hidden-icon-sep');
                hideIconElements.forEach(el => {
                    (el as HTMLElement).style.display = isProfesorModalIcon ? 'flex' : 'none';
                });

                const galleryElements = inlineIconToolbar.querySelectorAll('.grid-icon-gallery-btn, .grid-icon-gallery-sep');
                galleryElements.forEach(el => {
                    (el as HTMLElement).style.display = 'flex';
                });

                window.currentInlineIcon = icon;
                
                const rect = icon.getBoundingClientRect();
                // Wait for next frame in case icon is moving
                requestAnimationFrame(() => {
                    const updatedRect = icon.getBoundingClientRect();
                    inlineIconToolbar.style.top = (updatedRect.bottom + window.scrollY + 5) + 'px';
                    inlineIconToolbar.style.left = (updatedRect.left + window.scrollX + (updatedRect.width / 2) - (inlineIconToolbar.offsetWidth / 2)) + 'px';
                });
                
                inlineIconToolbar.style.opacity = '1';
                inlineIconToolbar.style.pointerEvents = 'auto';
            }
        } else {
            clearTimeout(iconHoverTimeout);
            iconHoverTimeout = setTimeout(() => {
                inlineIconToolbar.style.opacity = '0';
                inlineIconToolbar.style.pointerEvents = 'none';
            }, 300);
        }
    });

    window.changeInlineIconSize = function(icon: HTMLElement, amount: number) {
        let currentSize = parseInt(window.getComputedStyle(icon).fontSize);
        if(!isNaN(currentSize)) {
            icon.style.fontSize = Math.max(16, currentSize + amount) + 'px';
            setTimeout(() => {
                const rect = icon.getBoundingClientRect();
                inlineIconToolbar.style.top = (rect.bottom + window.scrollY + 5) + 'px';
                inlineIconToolbar.style.left = (rect.left + window.scrollX + (rect.width / 2) - (inlineIconToolbar.offsetWidth / 2)) + 'px';
            }, 10);
        }
    };
    
    window.changeInlineIconColor = function(icon: HTMLElement, colorClass: string) {
        icon.classList.remove('text-anahuac-orange', 'text-anahuac-purple', 'text-gray-600', 'text-gray-400', 'text-gray-500');
        icon.classList.add(colorClass);
        // Force inline color mapping to bypass any specificity issues
        const colorMap: Record<string, string> = {
            'text-anahuac-orange': '#ff5900',
            'text-anahuac-purple': '#5d428c',
            'text-gray-600': '#646464',
            'text-gray-400': '#9ca3af'
        };
        if (colorMap[colorClass]) {
            icon.style.color = colorMap[colorClass];
        } else {
            icon.style.color = '';
        }
    };

    window.toggleInlineIconVisibility = function(icon: HTMLElement) {
        icon.classList.toggle('opacity-0');
    };

    window.alignInlineIcon = function(icon: HTMLElement, alignment: string) {
        // Find if this is a grid icon (which is inside a flex container)
        const parentFlex = icon.parentElement?.classList.contains('flex') ? icon.parentElement : null;
        
        icon.classList.remove('float-left', 'float-right', 'block', 'mx-auto', 'inline-block', 'w-max');
        icon.style.display = alignment === 'center' ? 'block' : '';
        icon.style.margin = alignment === 'center' ? '0 auto' : '';
        icon.style.clear = alignment === 'center' ? 'both' : '';
        icon.style.marginRight = '';
        icon.style.marginLeft = '';
        icon.style.marginBottom = '';
        
        if (alignment === 'left') {
             icon.classList.add('float-left');
             icon.style.marginRight = '10px';
             icon.style.marginBottom = '5px';
        } else if (alignment === 'right') {
             icon.classList.add('float-right');
             icon.style.marginLeft = '10px';
             icon.style.marginBottom = '5px';
        } else if (alignment === 'center') {
             icon.classList.add('block', 'mx-auto', 'w-max');
             icon.style.margin = '10px auto';
             icon.style.clear = 'both';
        } else {
             icon.classList.add('inline-block');
        }
        
        if (parentFlex && parentFlex.classList.contains('items-start')) {
             if (alignment === 'center') {
                 parentFlex.classList.remove('flex', 'items-start', 'gap-5');
                 parentFlex.classList.add('block');
             }
        }
        
        setTimeout(() => {
            const rect = icon.getBoundingClientRect();
            inlineIconToolbar.style.top = (rect.bottom + window.scrollY + 5) + 'px';
            inlineIconToolbar.style.left = (rect.left + window.scrollX + (rect.width / 2) - (inlineIconToolbar.offsetWidth / 2)) + 'px';
        }, 10);
    };
    // ------------------------------------
    
    // --- PROFESOR DATOS MODAL ---
    window.currentProfesorDatosEl = null;

    window.openProfesorDatosModal = function(btn: HTMLElement) {
        const el = btn.closest('.lms-element') as HTMLElement;
        if(!el) return;
        window.currentProfesorDatosEl = el;
        
        const container = el.querySelector('.profesor-datos-container');
        if(!container) return;

        window.tempProfesorDatos = [];
        container.querySelectorAll('div.flex').forEach((row, idx) => {
            const iconEl = row.querySelector('.editable-icon');
            const textEl = row.querySelector('p');
            if (iconEl && textEl) {
                window.tempProfesorDatos.push({
                    id: Date.now() + idx,
                    icon: iconEl.textContent?.trim() || 'star',
                    text: textEl.innerHTML || '',
                    styleStr: iconEl.getAttribute('style') || '',
                    className: iconEl.className || 'material-symbols-outlined text-gray-400 text-lg editable-icon select-none'
                });
            }
        });

        window.renderProfesorDatosList();
        document.getElementById('profesor-datos-modal')?.classList.remove('hidden');
    };

    window.renderProfesorDatosList = function() {
        const listContainer = document.getElementById('profesor-datos-list');
        if(!listContainer) return;
        
        let html = '';
        window.tempProfesorDatos.forEach((item: any, index: number) => {
            let finalClass = item.className || 'material-symbols-outlined text-gray-400 text-lg editable-icon select-none';
            if (!finalClass.includes('editable-icon')) finalClass += ' editable-icon';
            html += `
                <div class="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded p-2" data-index="${index}">
                    <div class="cursor-pointer hover:bg-gray-200 p-1 rounded flex items-center justify-center transition-colors relative" title="Doble clic para cambiar icono" ondblclick="window.currentIconTarget = this.querySelector('span'); document.getElementById('icon-modal').classList.remove('hidden');">
                        <span class="${finalClass}" style="${item.styleStr || ''}">${item.icon}</span>
                    </div>
                    <div class="flex-1 bg-white border border-gray-200 rounded px-2 py-1.5 focus-within:border-anahuac-orange focus-within:ring-1 focus-within:ring-anahuac-orange transition-all">
                        <div contenteditable="true" class="outline-none text-sm font-sans w-full cursor-text" onblur="window.tempProfesorDatos[${index}].text = this.innerHTML">${item.text}</div>
                    </div>
                    ${item.text.includes('<a ') ? `
                        <button type="button" class="text-blue-500 hover:text-blue-700 p-1.5 rounded hover:bg-blue-50 transition-colors" onclick="window.editProfesorDatoLink(${index})" title="Editar hipervínculo">
                            <span class="material-symbols-outlined text-[18px]">link</span>
                        </button>
                        <button type="button" class="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors" onclick="window.removeProfesorDatoLink(${index})" title="Eliminar hipervínculo">
                            <span class="material-symbols-outlined text-[18px]">link_off</span>
                        </button>
                    ` : `
                        <button type="button" class="text-gray-400 hover:text-blue-500 p-1.5 rounded hover:bg-blue-50 transition-colors" onclick="window.editProfesorDatoLink(${index})" title="Insertar hipervínculo">
                            <span class="material-symbols-outlined text-[18px]">link</span>
                        </button>
                    `}
                    <button type="button" class="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors" onclick="window.removeProfesorDato(${index})" title="Eliminar fila">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                    ${index > 0 ? `<button type="button" class="text-gray-400 hover:text-blue-500 p-1.5 rounded hover:bg-blue-50 transition-colors" onclick="window.moveProfesorDatoUp(${index})" title="Mover arriba">
                        <span class="material-symbols-outlined text-[18px]">arrow_upward</span>
                    </button>` : `<div class="w-8"></div>`}
                    ${index < window.tempProfesorDatos.length - 1 ? `<button type="button" class="text-gray-400 hover:text-blue-500 p-1.5 rounded hover:bg-blue-50 transition-colors" onclick="window.moveProfesorDatoDown(${index})" title="Mover abajo">
                        <span class="material-symbols-outlined text-[18px]">arrow_downward</span>
                    </button>` : `<div class="w-8"></div>`}
                </div>
            `;
        });
        
        if (window.tempProfesorDatos.length === 0) {
            html = '<div class="text-center text-sm text-gray-500 py-4 font-sans border-2 border-dashed border-gray-200 rounded">No hay campos. Añade uno con el botón inferior.</div>';
        }
        
        listContainer.innerHTML = html;
        
        // Ensure to update icon logic if the modal changes it
        // The icon-modal already updates the innerHTML of currentIconTarget, 
        // we just need to make sure we sync it back when saving.
    };

    window.removeProfesorDato = function(index: number) {
        window.tempProfesorDatos.splice(index, 1);
        window.renderProfesorDatosList();
    };
    
    window.moveProfesorDatoUp = function(index: number) {
        if(index > 0) {
            const temp = window.tempProfesorDatos[index];
            window.tempProfesorDatos[index] = window.tempProfesorDatos[index - 1];
            window.tempProfesorDatos[index - 1] = temp;
            window.renderProfesorDatosList();
        }
    };
    
    window.moveProfesorDatoDown = function(index: number) {
        if(index < window.tempProfesorDatos.length - 1) {
            const temp = window.tempProfesorDatos[index];
            window.tempProfesorDatos[index] = window.tempProfesorDatos[index + 1];
            window.tempProfesorDatos[index + 1] = temp;
            window.renderProfesorDatosList();
        }
    };

    window.currentProfesorLinkIndex = -1;
    
    window.editProfesorDatoLink = function(index: number) {
        window.currentProfesorLinkIndex = index;
        const item = window.tempProfesorDatos[index];
        let currentUrl = '';
        
        const linkMatch = item.text.match(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/i);
        if (linkMatch) {
            currentUrl = linkMatch[1];
        }

        const inputEl = document.getElementById('profesor-link-url') as HTMLInputElement;
        if (inputEl) inputEl.value = currentUrl;
        
        document.getElementById('profesor-link-modal')?.classList.remove('hidden');
    };

    window.saveProfesorLinkModal = function() {
        if (window.currentProfesorLinkIndex === -1) return;
        const index = window.currentProfesorLinkIndex;
        const inputEl = document.getElementById('profesor-link-url') as HTMLInputElement;
        const newUrl = inputEl ? inputEl.value.trim() : '';

        if (newUrl === '') {
            window.removeProfesorDatoLink(index);
        } else {
            const item = window.tempProfesorDatos[index];
            let currentText = item.text;
            const linkMatch = item.text.match(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/i);
            if (linkMatch) {
                currentText = linkMatch[2];
            }
            window.tempProfesorDatos[index].text = `<a href="${newUrl}" class="text-blue-600 underline cursor-pointer" target="_blank">${currentText}</a>`;
            window.renderProfesorDatosList();
        }
        document.getElementById('profesor-link-modal')?.classList.add('hidden');
    };

    window.clearProfesorLinkModal = function() {
        if (window.currentProfesorLinkIndex !== -1) {
            window.removeProfesorDatoLink(window.currentProfesorLinkIndex);
        }
        document.getElementById('profesor-link-modal')?.classList.add('hidden');
    };

    window.removeProfesorDatoLink = function(index: number) {
        const item = window.tempProfesorDatos[index];
        const linkMatch = item.text.match(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/i);
        if (linkMatch) {
            window.tempProfesorDatos[index].text = linkMatch[2];
            window.renderProfesorDatosList();
        }
    };

    window.addProfesorDato = function() {
        window.tempProfesorDatos.push({
            id: Date.now(),
            icon: 'info',
            text: 'Nuevo dato',
            styleStr: '',
            className: 'material-symbols-outlined text-gray-400 text-lg editable-icon select-none'
        });
        window.renderProfesorDatosList();
    };

    window.saveProfesorDatos = function() {
        if(!window.currentProfesorDatosEl) return;
        const container = window.currentProfesorDatosEl.querySelector('.profesor-datos-container');
        if(!container) return;
        
        // Sync the text values and icons from DOM before saving
        const listContainer = document.getElementById('profesor-datos-list');
        if (listContainer) {
            const rows = listContainer.querySelectorAll('div[data-index]');
            rows.forEach(row => {
                const idxStr = row.getAttribute('data-index');
                if (idxStr) {
                    const idx = parseInt(idxStr);
                    const iconEl = row.querySelector('span.material-symbols-outlined');
                    const textEl = row.querySelector('div[contenteditable="true"]');
                    if (iconEl && window.tempProfesorDatos[idx]) {
                        window.tempProfesorDatos[idx].icon = iconEl.textContent?.trim() || 'info';
                        window.tempProfesorDatos[idx].styleStr = iconEl.getAttribute('style') || '';
                        window.tempProfesorDatos[idx].className = iconEl.className || '';
                    }
                    if (textEl && window.tempProfesorDatos[idx]) {
                        window.tempProfesorDatos[idx].text = textEl.innerHTML || '';
                    }
                }
            });
        }

        let newHtml = '';
        window.tempProfesorDatos.forEach((item: any) => {
            let finalClass = item.className || 'material-symbols-outlined text-gray-400 text-lg editable-icon select-none';
            if (!finalClass.includes('editable-icon')) finalClass += ' editable-icon';
            if (!finalClass.includes('select-none')) finalClass += ' select-none';
            newHtml += `<div class="flex gap-3 items-center group/card relative"><button type="button" class="absolute top-1/2 -translate-y-1/2 right-2 bg-white text-gray-400 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity z-10 p-0.5 rounded shadow-sm border border-gray-100" onclick="event.stopPropagation(); this.parentElement?.remove()" title="Eliminar"><span class="material-symbols-outlined text-[16px]">delete</span></button><span class="${finalClass}" style="${item.styleStr || ''}">${item.icon}</span> <p>${item.text}</p></div>`;
        });
        container.innerHTML = newHtml;
        
        document.getElementById('profesor-datos-modal')?.classList.add('hidden');
        window.currentProfesorDatosEl = null;

        if((window as any).LMSGlobalConfig) {
            (window as any).LMSGlobalConfig.markDirty();
        }
    };
    // ------------------------------------

    // Funciones que se llamaban pero no estaban definidas en el script
    window.changeIconSize = function(btn: HTMLElement, amount: number) {
        let el = btn.closest('.lms-element');
        let icon = el?.querySelector('span.editable-icon') as HTMLElement;
        if(icon) {
            let currentSize = parseInt(window.getComputedStyle(icon).fontSize);
            if(!isNaN(currentSize)) {
                let newSize = Math.max(16, currentSize + amount);
                icon.style.fontSize = newSize + 'px';
            }
        }
    };
    window.changeIconColor = function(btn: HTMLElement, colorClass: string) {
        let el = btn.closest('.lms-element');
        let icon = el?.querySelector('span.editable-icon') as HTMLElement;
        if(icon) {
            icon.classList.remove('text-anahuac-orange', 'text-anahuac-purple', 'text-gray-600', 'text-gray-400');
            icon.classList.add(colorClass);
            
            // Force inline color mapping to bypass any specificity issues
            const colorMap: Record<string, string> = {
                'text-anahuac-orange': '#ff5900',
                'text-anahuac-purple': '#5d428c',
                'text-gray-600': '#646464',
                'text-gray-400': '#9ca3af'
            };
            if (colorMap[colorClass]) {
                icon.style.color = colorMap[colorClass];
            } else {
                icon.style.color = '';
            }
        }
    };
    window.alignIconAndContainer = function(btn: HTMLElement, alignment: string) {
        let el = btn.closest('.lms-element') as HTMLElement;
        if(el) {
            el.classList.remove('text-left', 'text-center', 'text-right', 'w-max', 'inline-block');
            if (alignment === 'left') el.classList.add('text-left', 'w-full', 'block');
            else if (alignment === 'center') el.classList.add('text-center', 'w-full', 'block');
            else if (alignment === 'right') el.classList.add('text-right', 'w-full', 'block');
        }
    };

    window.applyList = function(type: string) {
        document.execCommand(type === 'numbers' || type === 'letters' ? 'insertOrderedList' : 'insertUnorderedList', false, undefined);
        const sel = window.getSelection();
        if(!sel || sel.rangeCount === 0) return;
        let node = sel.anchorNode;
        if(node?.nodeType === 3) node = node.parentNode;
        const list = (node as HTMLElement)?.closest('ul, ol');
        if(list) {
            list.className = `list-custom list-${type}`; 
        }
    }

    window.applyListColor = function(colorClass: string) {
        const sel = window.getSelection();
        if(!sel || sel.rangeCount === 0) return;
        let node = sel.anchorNode;
        if(node?.nodeType === 3) node = node.parentNode;
        const list = (node as HTMLElement)?.closest('ul, ol');
        if(list) {
            list.classList.remove('list-color-orange', 'list-color-purple', 'list-color-gray');
            list.classList.add(colorClass);
        }
    }

    window.changeTableBorderColor = function(btn: HTMLElement, color: string) {
        const wrapper = btn.closest('.lms-element') as HTMLElement;
        const table = wrapper.querySelector('table');
        if(!table) return;
        wrapper.dataset.tableBorderColor = color;
        
        table.style.borderColor = color;
        const ths = table.querySelectorAll('th');
        const tds = table.querySelectorAll('td');
        ths.forEach(th => th.style.borderColor = color);
        tds.forEach(td => td.style.borderColor = color);
    };

    window.changeTableBorderWidth = function(btn: HTMLElement, width: string) {
        const wrapper = btn.closest('.lms-element') as HTMLElement;
        const table = wrapper.querySelector('table');
        if(!table) return;
        wrapper.dataset.tableBorderWidth = width;
        
        table.style.borderWidth = width;
        const ths = table.querySelectorAll('th');
        const tds = table.querySelectorAll('td');
        ths.forEach(th => th.style.borderWidth = width);
        tds.forEach(td => td.style.borderWidth = width);
    };

    window.changeGridBorderColor = function(btn: HTMLElement, color: string) {
        const wrapper = btn.closest('.lms-element') as HTMLElement;
        const grid = wrapper.querySelector('.grid') as HTMLElement;
        if(!grid) return;
        wrapper.dataset.gridBorderColor = color;
        
        // Remove old border classes
        grid.classList.remove('border', 'border-anahuac-orange', 'bg-white');
        grid.style.borderStyle = 'none';
        grid.style.backgroundColor = color === 'transparent' ? 'transparent' : color;
    };

    window.changeGridBorderWidth = function(btn: HTMLElement, width: string) {
        const wrapper = btn.closest('.lms-element') as HTMLElement;
        const grid = wrapper.querySelector('.grid') as HTMLElement;
        if(!grid) return;
        wrapper.dataset.gridBorderWidth = width;
        
        // Remove old border classes
        grid.classList.remove('border', 'border-anahuac-orange', 'bg-white');
        grid.style.borderStyle = 'none';
        grid.style.padding = width;
        grid.style.gap = width;
    };

    window.changeTableStyle = function(btn: HTMLElement, style: string) {
        const wrapper = btn.closest('.lms-element') as HTMLElement;
        const table = wrapper.querySelector('table');
        if(!table) return;
        table.className = 'w-full border-collapse border border-gray-300 text-sm font-sans transition-colors theme-' + style;
        wrapper.dataset.tableStyle = style;
        
        const ths = table.querySelectorAll('th');
        const tds = table.querySelectorAll('td');

        if(style === 'standard') {
            ths.forEach(th => th.className = 'border border-gray-300 p-3 bg-gray-100 text-left font-bold text-gray-800 relative group/th');
            tds.forEach(td => td.className = 'border border-gray-300 p-3 text-gray-700 relative group/td');
        } else if(style === 'striped') {
            ths.forEach(th => th.className = 'border-b-2 border-gray-300 p-3 bg-white text-left font-bold text-gray-800 relative group/th');
            table.querySelectorAll('tbody tr').forEach((tr, i) => {
                const cells = tr.querySelectorAll('td');
                if(i % 2 === 0) {
                    cells.forEach(td => td.className = 'border-b border-gray-200 p-3 bg-gray-50 text-gray-700 relative group/td');
                } else {
                    cells.forEach(td => td.className = 'border-b border-gray-200 p-3 bg-white text-gray-700 relative group/td');
                }
            });
        } else if(style === 'borderless') {
            ths.forEach(th => th.className = 'p-3 bg-white border-b-2 border-gray-800 text-left font-bold text-gray-800 relative group/th');
            tds.forEach(td => td.className = 'p-3 border-b border-gray-200 text-gray-700 relative group/td');
        } else if(style === 'anahuac') {
            ths.forEach(th => th.className = 'border border-anahuac-orange p-3 bg-anahuac-orange text-white text-left font-bold relative group/th');
            tds.forEach(td => td.className = 'border border-gray-300 p-3 text-gray-700 relative group/td');
        }
        
        if (wrapper.dataset.tableBorderColor) {
            const color = wrapper.dataset.tableBorderColor;
            table.style.borderColor = color;
            ths.forEach(th => (th as HTMLElement).style.borderColor = color);
            tds.forEach(td => (td as HTMLElement).style.borderColor = color);
        }

        if (wrapper.dataset.tableBorderWidth) {
            const width = wrapper.dataset.tableBorderWidth;
            table.style.borderWidth = width;
            ths.forEach(th => (th as HTMLElement).style.borderWidth = width);
            tds.forEach(td => (td as HTMLElement).style.borderWidth = width);
        }
        
        window.setupTableHoverControls(table);
    };

    window.setupTableHoverControls = function(table: HTMLElement) {
        table.querySelectorAll('.table-cell-controls').forEach(el => el.remove());

        const cells = table.querySelectorAll('th, td');
        const rows = Array.from(table.querySelectorAll('tr'));

        cells.forEach(cell => {
            const isTh = cell.tagName === 'TH';
            
            // Fix: ensure cells have the required classes for hover controls to position and show properly
            cell.classList.add('relative');
            if (isTh) {
                cell.classList.add('group/th');
            } else {
                cell.classList.add('group/td');
            }
            // Also ensure cells have hover:z-50 so controls aren't covered by adjacent cells
            cell.classList.add('hover:z-50');

            const groupClass = isTh ? 'group-hover/th:opacity-100' : 'group-hover/td:opacity-100';
            const controls = document.createElement('div');
            controls.className = `table-cell-controls absolute inset-0 pointer-events-none opacity-0 ${groupClass} transition-opacity z-10 flex items-center justify-between`;
            
            // Left (add/remove col)
            const left = document.createElement('div');
            left.className = 'h-full flex flex-col justify-center gap-1 -ml-3';
            left.innerHTML = `<button type="button" class="w-4 h-4 bg-white border border-gray-300 shadow rounded-full flex items-center justify-center text-green-600 hover:bg-green-50 z-20 pointer-events-auto hover:scale-110 transition-transform" onclick="window.addTableCol(this, 'left')" title="Añadir columna"><span class="material-symbols-outlined text-[12px] font-bold">add</span></button>
                              <button type="button" class="w-4 h-4 bg-white border border-gray-300 shadow rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 z-20 pointer-events-auto hover:scale-110 transition-transform mt-0" onclick="window.removeTableCol(this)" title="Eliminar columna"><span class="material-symbols-outlined text-[12px] font-bold">remove</span></button>`;
            
            // Right (add col)
            const right = document.createElement('div');
            right.className = 'h-full flex flex-col justify-center -mr-3';
            right.innerHTML = `<button type="button" class="w-4 h-4 bg-white border border-gray-300 shadow rounded-full flex items-center justify-center text-green-600 hover:bg-green-50 z-20 pointer-events-auto hover:scale-110 transition-transform" onclick="window.addTableCol(this, 'right')" title="Añadir columna"><span class="material-symbols-outlined text-[12px] font-bold">add</span></button>`;
            
            // Bottom (add/remove row)
            const bottom = document.createElement('div');
            bottom.className = 'absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-3 flex gap-1';
            bottom.innerHTML = `<button type="button" class="w-4 h-4 bg-white border border-gray-300 shadow rounded-full flex items-center justify-center text-green-600 hover:bg-green-50 z-20 pointer-events-auto hover:scale-110 transition-transform" onclick="window.addTableRow(this, 'bottom')" title="Añadir fila abajo"><span class="material-symbols-outlined text-[12px] font-bold">add</span></button>
                                <button type="button" class="w-4 h-4 bg-white border border-gray-300 shadow rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 z-20 pointer-events-auto hover:scale-110 transition-transform" onclick="window.removeTableRow(this)" title="Eliminar fila"><span class="material-symbols-outlined text-[12px] font-bold">remove</span></button>`;

            // Merge controls
            const merge = document.createElement('div');
            merge.className = 'absolute top-1 right-1 flex gap-1';
            
            const isMerged = parseInt(cell.getAttribute('colspan') || '1') > 1 || parseInt(cell.getAttribute('rowspan') || '1') > 1;
            
            if (isMerged) {
                merge.innerHTML = `<button type="button" class="w-6 h-6 bg-white border border-gray-300 shadow rounded flex items-center justify-center text-blue-600 hover:bg-blue-50 z-20 pointer-events-auto" onclick="window.unmergeTableCell(this)" title="Separar celdas"><span class="material-symbols-outlined text-[14px]">splitscreen</span></button>`;
            } else {
                merge.innerHTML = `<button type="button" class="w-6 h-6 bg-white border border-gray-300 shadow rounded flex items-center justify-center text-blue-600 hover:bg-blue-50 z-20 pointer-events-auto" onclick="window.mergeTableCellRight(this)" title="Combinar con derecha"><span class="material-symbols-outlined text-[14px]">merge</span></button>
                                   <button type="button" class="w-5 h-5 bg-white border border-gray-300 shadow rounded flex items-center justify-center text-blue-600 hover:bg-blue-50 z-20 pointer-events-auto" onclick="window.mergeTableCellDown(this)" title="Combinar abajo"><span class="material-symbols-outlined text-[14px]">merge_type</span></button>`;
            }

            const tr = cell.closest('tr');
            const isFirstRow = tr ? rows[0] === tr : false;
            const isLastRow = tr ? rows[rows.length - 1] === tr : false;
            const isLastCol = cell.nextElementSibling === null;

            // Resizer Gizmo is only added if NOT the last column, to pin the outer borders!
            if (!isLastCol) {
                const resizer = document.createElement('div');
                resizer.className = 'absolute top-[-16px] bottom-[-16px] right-[-4px] w-[8px] cursor-col-resize z-30 opacity-0 group-hover/td:opacity-100 group-hover/th:opacity-100 hover:opacity-100 transition-opacity pointer-events-auto group/resizer';
                
                // Thin dashed guide line along column boundaries
                const guideLine = document.createElement('div');
                guideLine.className = 'absolute top-[16px] bottom-[16px] left-[3px] w-[1.5px] bg-anahuac-orange/40 opacity-0 group-hover/resizer:opacity-100 transition-opacity pointer-events-none';
                resizer.appendChild(guideLine);
                
                // Top Gizmo: floating in the top margin (exterior)
                if (isFirstRow) {
                    const topGizmo = document.createElement('div');
                    topGizmo.className = 'absolute -top-[2px] right-[-6px] w-[20px] h-[20px] bg-white border-2 border-anahuac-orange rounded-full shadow-md hover:scale-125 hover:bg-anahuac-orange hover:text-white transition-all flex items-center justify-center cursor-col-resize z-40 pointer-events-auto text-anahuac-orange';
                    topGizmo.title = 'Redimensionar columna';
                    topGizmo.innerHTML = '<span class="material-symbols-outlined text-[12px] font-bold pointer-events-none">swap_horiz</span>';
                    resizer.appendChild(topGizmo);
                }
                
                // Bottom Gizmo: floating in the bottom margin (exterior)
                if (isLastRow) {
                    const bottomGizmo = document.createElement('div');
                    bottomGizmo.className = 'absolute -bottom-[2px] right-[-6px] w-[20px] h-[20px] bg-white border-2 border-anahuac-orange rounded-full shadow-md hover:scale-125 hover:bg-anahuac-orange hover:text-white transition-all flex items-center justify-center cursor-col-resize z-40 pointer-events-auto text-anahuac-orange';
                    bottomGizmo.title = 'Redimensionar columna';
                    bottomGizmo.innerHTML = '<span class="material-symbols-outlined text-[12px] font-bold pointer-events-none">swap_horiz</span>';
                    resizer.appendChild(bottomGizmo);
                }

                resizer.onmousedown = (e) => window.startTableColumnResize(e, cell as HTMLElement);
                controls.appendChild(resizer);
            }

            controls.appendChild(left);
            controls.appendChild(bottom);
            controls.appendChild(right);
            controls.appendChild(merge);
            cell.appendChild(controls);
        });
    };

    window.startTableColumnResize = function(e: MouseEvent, targetCol: HTMLElement) {
        e.preventDefault();
        e.stopPropagation();

        const table = targetCol.closest('table');
        if(!table) return;

        const startX = e.pageX;
        const totalWidth = table.offsetWidth;
        
        const tr = targetCol.closest('tr');
        if(!tr) return;
        
        const cells = Array.from(tr.children) as HTMLElement[];
        const index = cells.indexOf(targetCol);
        if (index === -1 || index >= cells.length - 1) return; // Cannot resize last column boundary (fixed right border)

        const nextCol = cells[index + 1] as HTMLElement;
        if (!nextCol) return;

        // Force 'fixed' layout immediately to lock layout and prevent any self-growth or overflow
        table.style.tableLayout = 'fixed';

        // Read dynamic/actual client offsetWidths in pixels for start dimensions
        const startWidthJ = targetCol.offsetWidth;
        const startWidthJ1 = nextCol.offsetWidth;

        // Find match cells for column index across all rows to apply percentage widths
        const rows = Array.from(table.querySelectorAll('tr'));
        
        // Let's initialize percentages for all columns in the table so every column is locked proportionally
        const firstRowCells = Array.from(rows[0].children) as HTMLElement[];
        firstRowCells.forEach((c, idx) => {
            const rect = c.getBoundingClientRect();
            const pct = (rect.width / totalWidth) * 100;
            rows.forEach(r => {
                const cellInRow = r.children[idx] as HTMLElement | undefined;
                if (cellInRow) {
                    cellInRow.style.width = pct.toFixed(4) + '%';
                }
            });
        });

        // Collect all cells for target column J and next column J+1
        const targetCells: HTMLElement[] = [];
        const nextCells: HTMLElement[] = [];
        
        rows.forEach(r => {
            const cJ = r.children[index] as HTMLElement | undefined;
            const cJ1 = r.children[index + 1] as HTMLElement | undefined;
            if (cJ) targetCells.push(cJ);
            if (cJ1) nextCells.push(cJ1);
        });

        // Enable visual resize class
        document.body.style.cursor = 'col-resize';
        table.classList.add('is-resizing');

        const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.pageX - startX;
            // Constrain delta so both columns stay at least 30px wide
            const constrainedDelta = Math.max(30 - startWidthJ, Math.min(startWidthJ1 - 30, deltaX));
            
            const newPctJ = ((startWidthJ + constrainedDelta) / totalWidth) * 100;
            const newPctJ1 = ((startWidthJ1 - constrainedDelta) / totalWidth) * 100;

            targetCells.forEach(c => {
                c.style.width = newPctJ.toFixed(4) + '%';
            });
            nextCells.forEach(c => {
                c.style.width = newPctJ1.toFixed(4) + '%';
            });
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            table.classList.remove('is-resizing');
            window.saveHistoryState();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    window.addTableRow = function(btn: HTMLElement, pos: string) {
        const cell = btn.closest('th, td');
        if(!cell) return;
        const tr = cell.closest('tr');
        if(!tr) return;
        const table = tr.closest('table');
        if(!table) return;
        const isHeader = cell.tagName === 'TH';
        
        const newTr = document.createElement('tr');
        newTr.className = 'group/tr relative';
        
        Array.from(tr.children).forEach(c => {
            if(c.tagName === 'TD' || c.tagName === 'TH') {
                const newCell = document.createElement(isHeader ? 'td' : 'td');
                newCell.className = (c as HTMLElement).className;
                newCell.innerHTML = '<div class="editable-text min-h-[1.5em]">Nueva Celda</div>';
                newTr.appendChild(newCell);
            }
        });

        if(isHeader) {
            table.querySelector('tbody')?.insertBefore(newTr, table.querySelector('tbody')?.firstChild || null);
        } else {
            tr.parentNode?.insertBefore(newTr, tr.nextSibling);
        }
        
        const wrapper = table.closest('.lms-element') as HTMLElement;
        const styleBtn = wrapper.querySelector('.block-toolbar button') as HTMLElement;
        if(styleBtn) window.changeTableStyle(styleBtn, wrapper.dataset.tableStyle || 'standard');
    };

    window.pasteTableData = async function(btn: HTMLElement) {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) return;
            const lmsElement = btn.closest('.lms-element') as HTMLElement;
            window.processPastedTableData(text, lmsElement);
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            // Si el clipboard falla, podemos pedirle al usuario que use Ctrl+V.
            alert('No se pudo acceder al portapapeles. Intenta usar Ctrl+V sobre la tabla.');
        }
    };

    window.handleTablePaste = function(e: ClipboardEvent, el: HTMLElement) {
        const text = e.clipboardData?.getData('text/plain');
        if (text) {
            const rows = text.split(/\r?\n/).filter(r => r.trim());
            // Solo lo tratamos como una tabla si tiene tabs (Google Sheets/Excel)
            if (rows.length > 1 || (rows[0] && rows[0].includes('\t'))) {
                e.preventDefault();
                e.stopPropagation();
                const lmsElement = el.closest('.lms-element') as HTMLElement;
                window.processPastedTableData(text, lmsElement);
            }
        }
    };
    
    window.processPastedTableData = function(text: string, lmsElement: HTMLElement) {
        const rows = text.split(/\r?\n/).filter(r => r.trim());
        if (rows.length === 0) return;
        
        const table = lmsElement.querySelector('table');
        if (!table) return;
        
        const parsedRows = rows.map(r => r.split('\t'));
        const maxCols = Math.max(...parsedRows.map(r => r.length));
        
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        if (!thead || !tbody) return;
        
        thead.innerHTML = '';
        tbody.innerHTML = '';
        
        parsedRows.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');
            tr.className = 'group/tr relative';
            for (let colIndex = 0; colIndex < maxCols; colIndex++) {
                const cellText = row[colIndex] || '';
                const isHeader = rowIndex === 0;
                const cell = document.createElement(isHeader ? 'th' : 'td');
                cell.className = isHeader 
                    ? 'border border-gray-300 p-3 bg-gray-100 text-left font-bold text-gray-800 relative group/th'
                    : 'border border-gray-300 p-3 relative group/td';
                
                const div = document.createElement('div');
                div.className = 'editable-text min-h-[1.5em]';
                div.textContent = cellText || ' ';
                cell.appendChild(div);
                
                tr.appendChild(cell);
            }
            if (rowIndex === 0) {
                thead.appendChild(tr);
            } else {
                tbody.appendChild(tr);
            }
        });

        if (window.setupTableHoverControls) {
            window.setupTableHoverControls(table);
        }

        // Reapply the current table style
        const styleBtn = lmsElement.querySelector('.block-toolbar button') as HTMLElement;
        if(styleBtn) window.changeTableStyle(styleBtn, lmsElement.dataset.tableStyle || 'standard');
        
        // Trigger content updated event
        const evt = new CustomEvent('lms-content-updated');
        document.dispatchEvent(evt);
        if (window.showToast) {
            window.showToast('Datos de tabla pegados exitosamente');
        }
    };

    window.removeTableRow = function(btn: HTMLElement) {
        const tr = btn.closest('tr');
        if(!tr) return;
        if (tr.parentNode && tr.parentNode.children.length > 1) {
            tr.remove();
        } else {
            alert('No puedes eliminar la única fila.');
        }
    };

    window.addTableCol = function(btn: HTMLElement, pos: string) {
        const cell = btn.closest('th, td');
        if(!cell) return;
        const tr = cell.closest('tr');
        if(!tr) return;
        const table = tr.closest('table');
        if(!table) return;
        const index = Array.from(tr.children).indexOf(cell);
        
        // Count columns in the first row currently, add 1 for the new column
        const rows = Array.from(table.querySelectorAll('tr'));
        const currentFirstRow = rows[0];
        const newColCount = currentFirstRow ? currentFirstRow.children.length + 1 : 1;
        const eachPct = (100 / newColCount).toFixed(4) + '%';

        table.querySelectorAll('tr').forEach(row => {
            const isHeader = row.closest('thead') !== null;
            const newCell = document.createElement(isHeader ? 'th' : 'td');
            newCell.innerHTML = '<div class="editable-text min-h-[1.5em]">Nueva Celda</div>';
            
            const targetCell = row.children[index];
            if(targetCell) {
               newCell.className = (targetCell as HTMLElement).className; 
               if(pos === 'left') {
                   row.insertBefore(newCell, targetCell);
               } else {
                   if(targetCell.nextSibling) {
                       row.insertBefore(newCell, targetCell.nextSibling);
                   } else {
                       row.appendChild(newCell);
                   }
               }
            }
        });

        // Set fixed layout and lock each cell to a perfect percentage to avoid any overflow/scrolling
        table.style.tableLayout = 'fixed';
        table.querySelectorAll('tr').forEach(row => {
            Array.from(row.children).forEach(c => {
                (c as HTMLElement).style.width = eachPct;
            });
        });
        
        const wrapper = table.closest('.lms-element') as HTMLElement;
        const styleBtn = wrapper.querySelector('.block-toolbar button') as HTMLElement;
        if(styleBtn) window.changeTableStyle(styleBtn, wrapper.dataset.tableStyle || 'standard');
    };

    window.removeTableCol = function(btn: HTMLElement) {
        const cell = btn.closest('th, td');
        if(!cell) return;
        const tr = cell.closest('tr');
        if(!tr) return;
        const table = tr.closest('table');
        if(!table) return;
        const index = Array.from(tr.children).indexOf(cell);
        
        if (tr.children.length > 1) {
            const newColCount = tr.children.length - 1;
            const eachPct = (100 / newColCount).toFixed(4) + '%';

            table.querySelectorAll('tr').forEach(row => {
                if(row.children[index]) {
                    row.children[index].remove();
                }
                Array.from(row.children).forEach(c => {
                    (c as HTMLElement).style.width = eachPct;
                });
            });
            table.style.tableLayout = 'fixed';
        } else {
            alert('No puedes eliminar la única columna.');
        }
    };

    window.mergeTableCellRight = function(btn: HTMLElement) {
        const cell = btn.closest('th, td');
        if(!cell) return;
        const nextCell = cell.nextElementSibling;
        if(nextCell) {
            const colspan = parseInt(cell.getAttribute('colspan') || '1');
            const nextColspan = parseInt(nextCell.getAttribute('colspan') || '1');
            cell.setAttribute('colspan', (colspan + nextColspan).toString());
            
            const nextTextEl = nextCell.querySelector('.editable-text');
            const currentTextEl = cell.querySelector('.editable-text');
            if(nextTextEl && currentTextEl) {
                const nextText = nextTextEl.innerHTML;
                if(nextText && nextText !== 'Nueva Celda') {
                    currentTextEl.innerHTML += '<br>' + nextText;
                }
            }
            nextCell.remove();
            
            const table = cell.closest('table');
            if(!table) return;
            const wrapper = table.closest('.lms-element') as HTMLElement;
            const styleBtn = wrapper.querySelector('.block-toolbar button') as HTMLElement;
            if(styleBtn) window.changeTableStyle(styleBtn, wrapper.dataset.tableStyle || 'standard');
        }
    };

    window.mergeTableCellDown = function(btn: HTMLElement) {
        const cell = btn.closest('th, td');
        if(!cell) return;
        const tr = cell.closest('tr');
        if(!tr) return;
        const index = Array.from(tr.children).indexOf(cell);
        const nextTr = tr.nextElementSibling;
        
        if(nextTr) {
            const targetCell = nextTr.children[index];
            if(targetCell) {
                const rowspan = parseInt(cell.getAttribute('rowspan') || '1');
                const nextRowspan = parseInt(targetCell.getAttribute('rowspan') || '1');
                cell.setAttribute('rowspan', (rowspan + nextRowspan).toString());
                
                const nextTextEl = targetCell.querySelector('.editable-text');
                const currentTextEl = cell.querySelector('.editable-text');
                if(nextTextEl && currentTextEl) {
                    const nextText = nextTextEl.innerHTML;
                    if(nextText && nextText !== 'Nueva Celda') {
                        currentTextEl.innerHTML += '<br>' + nextText;
                    }
                }
                targetCell.remove();

                const table = cell.closest('table');
                if(!table) return;
                const wrapper = table.closest('.lms-element') as HTMLElement;
                const styleBtn = wrapper.querySelector('.block-toolbar button') as HTMLElement;
                if(styleBtn) window.changeTableStyle(styleBtn, wrapper.dataset.tableStyle || 'standard');
            }
        }
    };

    window.unmergeTableCell = function(btn: HTMLElement) {
        const cell = btn.closest('th, td');
        if(!cell) return;
        const tr = cell.closest('tr');
        if(!tr) return;
        const colspan = parseInt(cell.getAttribute('colspan') || '1');
        const rowspan = parseInt(cell.getAttribute('rowspan') || '1');
        
        cell.removeAttribute('colspan');
        cell.removeAttribute('rowspan');
        
        const isHeader = cell.tagName === 'TH';
        
        if(colspan > 1) {
            for(let i=1; i<colspan; i++) {
                const newCell = document.createElement(isHeader ? 'th' : 'td');
                newCell.className = (cell as HTMLElement).className;
                newCell.innerHTML = '<div class="editable-text min-h-[1.5em]">Celda Separada</div>';
                if(cell.nextSibling) {
                    tr.insertBefore(newCell, cell.nextSibling);
                } else {
                    tr.appendChild(newCell);
                }
            }
        }
        
        if(rowspan > 1) {
            let currentTr = tr.nextElementSibling;
            const index = Array.from(tr.children).indexOf(cell);
            
            for(let i=1; i<rowspan; i++) {
                if(currentTr) {
                    for(let j=0; j<colspan; j++) {
                        const newCell = document.createElement('td');
                        newCell.className = isHeader ? (cell as HTMLElement).className.replace('bg-gray-100', 'bg-white').replace('font-bold', '') : (cell as HTMLElement).className;
                        newCell.innerHTML = '<div class="editable-text min-h-[1.5em]">Celda Separada</div>';
                        
                        const refNode = currentTr.children[index] || null;
                        if(refNode) {
                            currentTr.insertBefore(newCell, refNode);
                        } else {
                            currentTr.appendChild(newCell);
                        }
                    }
                    currentTr = currentTr.nextElementSibling;
                }
            }
        }
        
        const table = cell.closest('table');
        if(!table) return;
        const wrapper = table.closest('.lms-element') as HTMLElement;
        const styleBtn = wrapper.querySelector('.block-toolbar button') as HTMLElement;
        if(styleBtn) window.changeTableStyle(styleBtn, wrapper.dataset.tableStyle || 'standard');
    };

    window.applyTextFormat = function(format: 'titulo' | 'subtitulo' | 'cuerpo') {
        let styles = "";
        let classNames = "";
        if (format === 'titulo') styles = "font-size: 30px; font-weight: bold; font-family: 'Zilla Slab', serif;";
        else if (format === 'subtitulo') styles = "font-size: 20px; font-weight: bold; font-family: 'Zilla Slab', serif;";
        else if (format === 'cuerpo') styles = "font-size: 14px; font-weight: normal; font-family: 'Roboto', sans-serif;";

        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && sel.toString().length > 0) {
            document.execCommand('insertHTML', false, `<span style="${styles}">${sel.toString()}</span>`);
        } else {
            let block = window.getSelection()?.anchorNode;
            if(block?.nodeType === 3) block = block.parentNode;
            if(block && window.currentEditableText?.contains(block)) {
                let p = (block as HTMLElement).closest('p, div, span, h1, h2, h3, li');
                if(p && p !== window.currentEditableText) {
                    (p as HTMLElement).style.cssText = (p as HTMLElement).style.cssText + ' ' + styles;
                } else if (window.currentEditableText) {
                    window.currentEditableText.style.cssText = window.currentEditableText.style.cssText + ' ' + styles;
                }
            } else if (window.currentEditableText) {
                window.currentEditableText.style.cssText = window.currentEditableText.style.cssText + ' ' + styles;
            }
        }
    }
    
    window.triggerRtfImageClick = function() {
        document.getElementById('rtf-image-input')?.click();
    }
    
    window.insertDOMImage = function(src: string, textContainer: HTMLElement) {
        if(!textContainer) return;
        const img = document.createElement('img');
        img.src = src;
        img.className = 'editorial-image w-1/2 mt-2 transition-all duration-300';
        textContainer.appendChild(img);
    }
    
    window.insertRTFImage = function(input: HTMLInputElement) {
        if (input.files && input.files[0] && window.currentEditableText) { 
            const reader = new FileReader(); 
            reader.onload = function(evt) { 
                if(evt.target?.result)
                    window.insertDOMImage(evt.target.result.toString(), window.currentEditableText); 
            }; 
            reader.readAsDataURL(input.files[0]); 
            input.value = ''; 
        }
    }
    
    window.setImageStyle = function(align: string) {
        if(window.selectedEditorialImage) {
            window.selectedEditorialImage.style.display = 'block';
            if(align === 'center') {
                window.selectedEditorialImage.style.margin = '10px auto';
            } else if (align === 'left') {
                window.selectedEditorialImage.style.margin = '10px auto 10px 0';
            } else if (align === 'right') {
                window.selectedEditorialImage.style.margin = '10px 0 10px auto';
            }
        }
    }
    
    window.setImageSize = function(sizeClass: string) {
        if(window.selectedEditorialImage) {
            window.selectedEditorialImage.classList.remove('w-1/4', 'w-1/2', 'w-3/4', 'w-full');
            window.selectedEditorialImage.classList.add(sizeClass);
        }
    }

    window.setEditorialImageAspect = function(aspect: string) {
        if(window.selectedEditorialImage) {
            window.selectedEditorialImage.style.aspectRatio = aspect;
            window.selectedEditorialImage.style.objectFit = aspect === 'auto' ? '' : 'cover';
        }
    }

    window.setEditorialImagePosition = function(slider: HTMLInputElement, axis: 'x' | 'y') {
        if(window.selectedEditorialImage) {
            const currentPos = window.selectedEditorialImage.style.objectPosition || '50% 50%';
            const parts = currentPos.split(' ');
            let x = parts[0] || '50%';
            let y = parts[1] || '50%';
            if (axis === 'x') {
                x = slider.value + '%';
            } else {
                y = slider.value + '%';
            }
            window.selectedEditorialImage.style.objectPosition = `${x} ${y}`;
        }
    }

    window.setEditorialImageRadius = function(radius: string) {
        if(window.selectedEditorialImage) {
            window.selectedEditorialImage.style.borderRadius = radius;
        }
    }

    window.setEditorialImageShadow = function(shadow: string) {
        if(window.selectedEditorialImage) {
            window.selectedEditorialImage.style.boxShadow = shadow;
        }
    }

    window.rotateEditorialImage = function(deg: number) {
        if(window.selectedEditorialImage) {
            let currentRot = parseInt(window.selectedEditorialImage.dataset.rotation || '0');
            currentRot += deg;
            window.selectedEditorialImage.dataset.rotation = currentRot.toString();
            window.selectedEditorialImage.style.transform = `rotate(${currentRot}deg)`;
        }
    }
    
    window.deleteSelectedImage = function() {
        if(window.selectedEditorialImage) {
            window.selectedEditorialImage.remove();
            document.getElementById('image-toolbar')?.classList.add('hidden');
            window.selectedEditorialImage = null;
        }
    }

    
    function generateExportHTML(): string | null {
        const outerEl = document.getElementById('canvas-container-outer') || document.getElementById('canvas');
        if(!outerEl) return null;
        const clone = outerEl.cloneNode(true) as HTMLElement;
        if(!clone) return null;
        
        // Remove the editor placeholder for templates
        clone.querySelectorAll('#canvas-placeholder').forEach(el => el.remove());

        clone.querySelectorAll('.block-toolbar').forEach(el => el.remove());
        clone.querySelectorAll('.flipcard-item-controls').forEach(el => el.remove());
        clone.querySelectorAll('.drag-handle').forEach(el => el.remove());
        clone.querySelectorAll('.embed-placeholder').forEach(el => el.remove());

        // FIX: Ensure tab panes retain vertical layout when exported
        clone.querySelectorAll('.lms-tab-pane').forEach((el: any) => {
            el.classList.add('flex', 'flex-col', 'gap-4');
        });
        clone.querySelectorAll('.image-placeholder').forEach(el => el.remove());
        clone.querySelectorAll('.table-cell-controls').forEach(el => el.remove());
        clone.querySelectorAll('.flipcard-overlay').forEach(el => el.remove());
        clone.querySelectorAll('.references-importer-container').forEach(el => el.remove());
        
        // Remove interactive edit-only buttons from grid cards, accordions, etc.
        clone.querySelectorAll('button').forEach(btn => {
            const onclick = btn.getAttribute('onclick') || '';
            const title = btn.getAttribute('title') || '';
            
            // Do not remove buttons that are part of the tabs functionality (for the exported app)
            if (onclick.includes('toggleLmsTab') || onclick.includes('toggleTabsOrientation')) {
                return;
            }
            
            // Remove OTHER buttons that still remain, which are generally edit controls
            if (onclick || title) {
                btn.remove();
            }
        });

        // Aggressively remove all table hover classes
        clone.querySelectorAll('th, td').forEach(el => {
            // Remove group/th, group/td, and relative, which are for editor controls
            el.classList.remove('group/th', 'group/td', 'relative');
        });

        // Strip inline onclick from all elements just to be safe
        clone.querySelectorAll('*[onclick]').forEach(el => {
            if (!el.hasAttribute('data-orientation') && !el.classList.contains('tab-buttons-container')) { // safeguard tabs if they use onclick, but tabs buttons were already checked
                 // wait, tabs buttons have onclick="toggleLmsTab(...)"
                 const onclick = el.getAttribute('onclick') || '';
                 if (onclick.includes('toggleLmsTab') || onclick.includes('toggleTabsOrientation')) return;
                 el.removeAttribute('onclick');
            }
        });

        // Flatten Parallax Data into static inline CSS for LMS support (e.g., D2L)
        clone.querySelectorAll('.parallax-container').forEach(container => {
            const htmlContainer = container as HTMLElement;
            const bgLayer = htmlContainer.querySelector('.bg-layer') as HTMLElement;
            const layer1 = htmlContainer.querySelector('.layer-1') as HTMLElement;
            const layer2 = htmlContainer.querySelector('.layer-2') as HTMLElement;
            
            if (bgLayer) {
                htmlContainer.style.backgroundColor = bgLayer.style.backgroundColor;
            }
            
            const bgImages: string[] = [];
            const bgSizes: string[] = [];
            const bgPositions: string[] = [];
            
            if (layer1 && layer1.style.backgroundImage && layer1.style.backgroundImage !== 'none') {
                bgImages.push(layer1.style.backgroundImage);
                bgSizes.push(layer1.style.backgroundSize || 'auto');
                bgPositions.push(layer1.style.backgroundPosition || '0 0');
            }
            if (layer2 && layer2.style.backgroundImage && layer2.style.backgroundImage !== 'none') {
                bgImages.push(layer2.style.backgroundImage);
                bgSizes.push(layer2.style.backgroundSize || 'auto');
                bgPositions.push(layer2.style.backgroundPosition || '0 0');
            }
            
            if (bgImages.length > 0) {
                htmlContainer.style.backgroundImage = bgImages.join(', ');
                htmlContainer.style.backgroundSize = bgSizes.join(', ');
                htmlContainer.style.backgroundPosition = bgPositions.join(', ');
                htmlContainer.style.backgroundRepeat = 'repeat';
            }
            
            const wrapper = htmlContainer.querySelector('.parallax-bg-wrapper');
            if (wrapper) {
                // If opacity is defined on wrapper, copy to container
                const wrapperStyle = window.getComputedStyle(wrapper);
                if (wrapperStyle.opacity !== '1' && wrapperStyle.opacity !== '') {
                    // Not setting full opacity on container as it would fade the content
                    // To handle opacity of backgrounds purely, one would need RGBA, but fallback to static is primary
                }
                wrapper.remove();
            }
        });

        // Tab buttons rely on toggleLmsTab which we preserved above, so they are fine.

        clone.querySelectorAll('.flipcard-item').forEach(el => el.classList.remove('force-flip'));

        // Force inline colors for Anáhuac custom classes to persist on LMS platforms
        clone.querySelectorAll('.text-anahuac-purple').forEach(el => {
            (el as HTMLElement).style.color = '#5d428c';
        });
        clone.querySelectorAll('.text-anahuac-orange').forEach(el => {
            (el as HTMLElement).style.color = '#ff5900';
        });
        clone.querySelectorAll('.text-anahuac-gray').forEach(el => {
            (el as HTMLElement).style.color = '#cdd5dc';
        });
        clone.querySelectorAll('.text-anahuac-dark').forEach(el => {
            (el as HTMLElement).style.color = '#646464';
        });
        clone.querySelectorAll('.bg-anahuac-purple').forEach(el => {
            (el as HTMLElement).style.backgroundColor = '#5d428c';
        });
        clone.querySelectorAll('.bg-anahuac-orange').forEach(el => {
            (el as HTMLElement).style.backgroundColor = '#ff5900';
        });
        
        // Remove close buttons from text elements
        clone.querySelectorAll('.group\\/h3 button').forEach(el => el.remove());
        clone.querySelectorAll('.group\\/p button').forEach(el => el.remove());
        
        // Clean up group classes used for hover buttons
        clone.querySelectorAll('.group\\/h3').forEach(el => el.classList.remove('group/h3', 'relative'));
        clone.querySelectorAll('.group\\/p').forEach(el => el.classList.remove('group/p', 'relative'));

        clone.querySelectorAll('.editable-text').forEach(el => { 
            (el as HTMLElement).contentEditable = "false"; 
            el.classList.remove('editable-text', 'drag-over'); 
        });

        clone.querySelectorAll('[contenteditable="true"]').forEach(el => {
            (el as HTMLElement).contentEditable = "false";
        });

        clone.querySelectorAll('.editable-icon').forEach(el => {
            el.classList.remove('editable-icon', 'cursor-pointer', 'hover:bg-gray-100');
            el.removeAttribute('onclick');
        });

        // Strip inline onclick from flipcards to avoid double toggle with our finalJS
        clone.querySelectorAll('.flipcard-inner').forEach(el => {
            el.removeAttribute('onclick');
        });

        // Column Layout cleanup
        clone.querySelectorAll('.group\\/empty').forEach(el => el.remove());
        clone.querySelectorAll('.divider-line').forEach(el => {
            const divider = el.parentElement;
            if (divider) {
                divider.classList.remove('cursor-col-resize', 'hover:bg-gray-200', 'group/divider', 'z-40');
                const innerToolbar = divider.querySelector('.absolute');
                if (innerToolbar) innerToolbar.remove();
            }
        });
        clone.querySelectorAll('.column-layout-wrapper').forEach(el => {
            el.classList.remove('column-layout-wrapper', 'is-rendered', 'lms-element', 'group/colwrapper');
            el.removeAttribute('data-type');
        });
        clone.querySelectorAll('.col-left, .col-right').forEach(el => {
            el.classList.remove('col-left', 'col-right', 'lms-dropzone', 'border', 'border-transparent', 'hover:border-gray-200', 'transition-colors', 'p-1');
        });

        clone.querySelectorAll('.lms-element').forEach(el => { el.classList.remove('lms-element', 'is-rendered', 'active-hover'); });
        clone.querySelectorAll('.lms-dropzone').forEach(el => { el.classList.remove('lms-dropzone'); delete (el as HTMLElement).dataset.sortableActive; });
        clone.querySelectorAll('#canvas').forEach(el => el.classList.remove('border-2', 'border-dashed', 'border-[#cdd5dc]'));
        clone.querySelectorAll('.editorial-image').forEach(el => { el.classList.remove('selected-img'); el.removeAttribute('draggable'); });

        clone.querySelectorAll('.lms-footer-wrapper').forEach(el => {
            el.classList.remove('opacity-80', 'hover:opacity-100', 'cursor-pointer', 'border-2', 'border-transparent', 'hover:border-dashed', 'hover:border-anahuac-orange', 'py-4', 'p-4', 'rounded-xl', 'group/footer', 'lms-footer-wrapper');
            el.removeAttribute('ondblclick'); el.removeAttribute('data-footer-type'); el.removeAttribute('data-footer-logo');
            const tooltip = el.querySelector('.absolute'); if(tooltip) tooltip.remove();
            const content = el.querySelector('.footer-content'); if(content) content.classList.remove('pointer-events-none');
        });

        // Convierte los fondos locales de título en recursos permanentes para
        // que el HTML descargado también funcione fuera del Builder.
        const titleImageExportBase = 'https://raw.githubusercontent.com/adrianvillanueva-anahuac/HTML-Builder-para-LMS/main/public/imagenes/titulos/';
        clone.querySelectorAll('.title-image-surface').forEach(el => {
            const surface = el as HTMLElement;
            const currentUrl = surface.dataset.backgroundUrl;
            if (!currentUrl) return;

            let exportUrl = currentUrl;
            if (!/^https?:\/\//i.test(currentUrl) && !currentUrl.startsWith('data:')) {
                const fileName = currentUrl.split(/[\\/]/).pop();
                if (fileName) exportUrl = `${titleImageExportBase}${encodeURIComponent(fileName)}`;
            }

            surface.dataset.backgroundUrl = exportUrl;
            surface.style.backgroundImage = `url('${exportUrl}')`;
        });

        // Los logotipos locales deben seguir disponibles al llevar el HTML al LMS.
        const footerLogoExportBase = 'https://raw.githubusercontent.com/adrianvillanueva-anahuac/HTML-Builder-para-LMS/main/public/imagenes/Logotipos/';
        clone.querySelectorAll('.footer-logo-image').forEach(el => {
            const logo = el as HTMLImageElement;
            const currentUrl = logo.getAttribute('src');
            if (!currentUrl || /^https?:\/\//i.test(currentUrl) || currentUrl.startsWith('data:')) return;
            const fileName = currentUrl.split(/[\\/]/).pop();
            if (fileName) logo.src = `${footerLogoExportBase}${encodeURIComponent(fileName)}`;
        });

        // Basic wrapper with tailwind CDN to ensure output works standalone.
        const customStyles = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,300;0,400;0,700;1,400&family=Roboto:wght@300;400;500;700&family=Zilla+Slab:wght@400;600;700&display=swap" rel="stylesheet"><link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" /><script src="https://cdn.tailwindcss.com"><\/script><script>tailwind.config={theme:{extend:{colors:{anahuac:{orange:'#ff5900',purple:'#5d428c',light:'#f7f7f7',gray:'#cdd5dc',dark:'#646464'}},fontFamily:{sans:['Roboto','sans-serif'],serif:['Zilla Slab','serif'],lato:['Lato','sans-serif']}}}}<\/script><style>body { background-color: #f3f4f6; padding: 2rem; margin: 0; } .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; } .list-custom, .list-custom ul, .list-custom ol { list-style: none !important; margin-top: 0; margin-bottom: 0; } .list-custom { padding-left: 2rem; } .list-custom ul, .list-custom ol { padding-left: 2.5rem; margin-top: 0.5rem;} .list-custom li, .list-custom ul li, .list-custom ol li { position: relative; margin-bottom: 0.5rem; } .list-custom li::before, .list-custom ul li::before, .list-custom ol li::before { position: absolute; left: -2rem; top: 0; width: 1.5rem; text-align: right; color: #ff5900; font-weight: bold; font-family: 'Zilla Slab', serif; } .list-custom ul li::before { content: "○"; font-family: 'Roboto', sans-serif; font-size: 1.2em; top: -0.1rem; } .list-custom ul ul li::before { content: "■"; font-size: 0.8em; top: 0.15rem; } .list-custom ol { counter-reset: anahuac-sub; } .list-custom ol li::before { counter-increment: anahuac-sub; content: counter(anahuac-sub, lower-alpha) "."; } .list-numbers { counter-reset: anahuac-num; } .list-numbers > li::before { counter-increment: anahuac-num; content: counter(anahuac-num, decimal-leading-zero) "."; } .list-letters { counter-reset: anahuac-alpha; } .list-letters > li::before { counter-increment: anahuac-alpha; content: counter(anahuac-alpha, lower-alpha) "."; } .list-disc > li::before { content: "•"; font-size: 1.4em; font-family: 'Roboto', sans-serif; top: -0.2rem; } .list-circle > li::before { content: "○"; font-size: 1.2em; font-family: 'Roboto', sans-serif; top: -0.1rem; } .list-triangle > li::before { content: "▶"; font-size: 0.8em; font-family: 'Roboto', sans-serif; top: 0.15rem; } .list-plus > li::before { content: "+"; font-size: 1.3em; font-family: 'Roboto', sans-serif; top: -0.15rem; } .list-minus > li::before { content: "—"; font-size: 1.2em; font-family: 'Roboto', sans-serif; top: -0.1rem; } .parallax-container { position: relative; z-index: 1; } .parallax-bg-wrapper { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; pointer-events: none; z-index: -1; } .parallax-layer { position: absolute; width: 100%; height: 100%; left: 0%; top: 0%; pointer-events: none; z-index: 0; background-size: 100% auto; background-repeat: repeat; background-position: top center; } [data-bg="imagen"] .bg-layer { background-size: 100% auto !important; background-position: top center !important; background-repeat: no-repeat !important; background-color: #ffffff !important; } .table-container { width: 100% !important; max-width: 100% !important; overflow-x: auto !important; overflow-y: hidden !important; } .table-container table { width: 100% !important; max-width: 100% !important; table-layout: fixed !important; word-wrap: break-word !important; overflow-wrap: break-word !important; } .tab-content { display: none; } .tab-content.active { display: block; animation: fadeIn 0.3s ease; } details > summary { list-style: none; outline: none; cursor: pointer; } details > summary::-webkit-details-marker { display: none; } details[open] summary ~ * { animation: fadeIn 0.3s ease-in-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } } .flipcard-item.force-flip .flipcard-inner, .flipcard-item.is-flipped .flipcard-inner { transform: rotateY(180deg); } .flipcard-front, .flipcard-back { -webkit-backface-visibility: hidden; backface-visibility: hidden; } .flipcard-item.is-flipped .flipcard-front, .flipcard-item.force-flip .flipcard-front { pointer-events: none; } .flipcard-item.is-flipped .flipcard-back, .flipcard-item.force-flip .flipcard-back { pointer-events: auto; } .flipcard-item:not(.is-flipped):not(.force-flip) .flipcard-back { pointer-events: none; } .accordion-wrapper > details:first-child .accordion-delete-btn { display: none !important; }</style>`;
        const finalJS = `<script>
        function toggleTabsOrientation(btn) {
            const container = btn.closest('[data-type="pestanas"]') || btn.closest('.lms-element[data-type="pestanas"]');
            if (!container) return;
            const mainContent = container.querySelector('.tabs-main-container');
            const tabList = container.querySelector('.tab-buttons-container');
            if (!mainContent || !tabList) return;
            const isHorizontal = container.getAttribute('data-orientation') === 'horizontal';
            if (isHorizontal) {
                container.setAttribute('data-orientation', 'vertical');
                mainContent.classList.remove('flex-col');
                mainContent.classList.add('md:flex-row', 'gap-6');
                tabList.classList.remove('border-b', 'mb-4');
                tabList.classList.add('flex-col', 'border-r', 'md:w-1/4', 'mb-0');
                tabList.querySelectorAll('button').forEach(b => {
                    b.classList.remove('border-b-2', 'px-4', 'py-2');
                    b.classList.add('border-r-2', 'px-6', 'py-3', 'text-left');
                    if (b.classList.contains('border-anahuac-orange')) { b.classList.add('border-anahuac-orange'); } else { b.classList.add('border-transparent'); }
                });
            } else {
                container.setAttribute('data-orientation', 'horizontal');
                mainContent.classList.add('flex-col');
                mainContent.classList.remove('md:flex-row', 'gap-6');
                tabList.classList.add('border-b', 'mb-4');
                tabList.classList.remove('flex-col', 'border-r', 'md:w-1/4', 'mb-0');
                tabList.querySelectorAll('button').forEach(b => {
                    b.classList.add('border-b-2', 'px-4', 'py-2');
                    b.classList.remove('border-r-2', 'px-6', 'py-3', 'text-left');
                    if (b.classList.contains('border-anahuac-orange')) { b.classList.add('border-anahuac-orange'); } else { b.classList.add('border-transparent'); }
                });
            }
        }
        function toggleLmsTab(btn, targetId) { 
            const container = btn.closest('[data-type="pestanas"]') || btn.closest('.lms-element'); 
            if(!container) return;
            const isVertical = container.getAttribute('data-orientation') === 'vertical';
            const tabList = container.querySelector('.tab-buttons-container');
            const buttons = tabList ? Array.from(tabList.children).filter(c => c.tagName === 'BUTTON') : []; 
            buttons.forEach(b => { 
                if (isVertical) {
                    b.className = "px-6 py-3 border-r-2 border-transparent text-gray-500 font-bold font-serif text-base hover:text-anahuac-orange transition-colors focus:outline-none flex-shrink-0 text-left";
                } else {
                    b.className = "px-4 py-2 border-b-2 border-transparent text-gray-500 font-bold font-serif text-base hover:text-anahuac-orange transition-colors focus:outline-none flex-shrink-0"; 
                }
            }); 
            if (isVertical) {
                btn.className = "px-6 py-3 border-r-2 border-anahuac-orange text-anahuac-orange font-bold font-serif text-base transition-colors focus:outline-none flex-shrink-0 text-left";
            } else {
                btn.className = "px-4 py-2 border-b-2 border-anahuac-orange text-anahuac-orange font-bold font-serif text-base transition-colors focus:outline-none flex-shrink-0"; 
            }
            const wrapper = container.querySelector('.tabs-panes-wrapper');
            if(wrapper) {
                const panes = Array.from(wrapper.children).filter(c => c.classList.contains('lms-tab-pane')); 
                panes.forEach(p => { p.classList.remove('flex', 'block'); p.classList.add('hidden'); p.style.display = 'none'; }); 
                const target = Array.from(wrapper.children).find(c => c.id === targetId); 
                if(target) { target.classList.remove('hidden'); target.classList.add('flex'); target.style.display = 'flex'; } 
            }
        } 
        document.querySelectorAll('.parallax-container').forEach(container => { container.addEventListener('mousemove', (e) => { const rect = container.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; container.querySelectorAll('.parallax-layer').forEach(layer => { const speed = parseFloat(layer.dataset.speed || 0); if(speed > 0) { layer.style.transform = \`translate(\${(x - rect.width / 2) * -speed}px, \${(y - rect.height / 2) * -speed}px)\`; } }); }); container.addEventListener('mouseleave', () => { container.querySelectorAll('.parallax-layer').forEach(layer => { layer.style.transform = \`translate(0px, 0px)\`; }); }); });
        
        document.querySelectorAll('.flipcard-item').forEach(card => {
            card.addEventListener('click', (e) => {
                if(e.target.tagName === 'A' || e.target.closest('a') || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
                card.classList.toggle('is-flipped');
            });
        });
        <\/script>`;

        // Find all elements with a src attribute and ensure they use absolute URLs 
        // pointing to the current domain (e.g. Github Pages)
        clone.querySelectorAll('[src]').forEach(el => {
            let src = el.getAttribute('src');
            if (src && (src.startsWith('/') || src.startsWith('./'))) {
                try {
                    src = new URL(src, window.location.href).href;
                    el.setAttribute('src', src);
                } catch(e) {}
            }
            
            // Fix YouTube Error 153 for local HTML playback
            if (el.tagName.toLowerCase() === 'iframe' && src) {
                if (src.includes('youtube.com/embed') || src.includes('youtube-nocookie.com/embed')) {
                    // Use nocookie domain which is often more permissive for file:// protocol
                    src = src.replace('youtube.com/embed', 'youtube-nocookie.com/embed');
                    
                    // Add standard origin parameters to bypass some referrer checks
                    const separator = src.includes('?') ? '&' : '?';
                    if (!src.includes('widget_referrer')) {
                        // Use a safe origin that YouTube recognizes
                        src = src + separator + 'origin=https://www.youtube.com&widget_referrer=https://www.youtube.com';
                    }
                    
                    el.setAttribute('src', src);
                    
                    // Remove features from the allow attribute that often fail in file:// protocol
                    let allowAttr = el.getAttribute('allow');
                    if (allowAttr) {
                        allowAttr = allowAttr.replace(/web-share/gi, '').replace(/encrypted-media/gi, '').replace(/;/g, '; ').replace(/\s+/g, ' ').trim();
                        el.setAttribute('allow', allowAttr);
                    }
                }
            }
        });

        const exportedCanvasHtml = clone.innerHTML;
        const encodedState = btoa(encodeURIComponent(outerEl.innerHTML || ''));
        const finalHTML = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="generator" content="anahuac-builder-lms"><title>Contenido D2L</title>${customStyles}</head><body><div class="max-w-5xl mx-auto anahuac-builder-export">${exportedCanvasHtml}</div>${finalJS}<div id="lms-state" style="display: none;">"${encodedState}"</div></body></html>`;
        
        return finalHTML;
    }

    window.exportHTML = function() {
        const finalHTML = generateExportHTML();
        if(!finalHTML) return;
        const blob = new Blob([finalHTML], { type: 'text/html' }); 

        const url = window.URL.createObjectURL(blob); 
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = 'modulo_d2l_anahuac.html'; 
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a); 
        window.URL.revokeObjectURL(url);
    }

    window.copyHTMLToClipboard = async function() {
        const finalHTML = generateExportHTML();
        if(!finalHTML) return;
        try {
            await navigator.clipboard.writeText(finalHTML);
            alert("¡Código HTML copiado al portapapeles!");
        } catch (err) {
            console.error('Error al copiar al portapapeles: ', err);
            alert("No se pudo copiar al portapapeles. Prueba usar Https o asegurate de dar permisos.");
        }
    }


    
    window.processImportedHTML = function(htmlContent: string) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        const stateScript = doc.getElementById('lms-state');
        const isBuilder = doc.querySelector('.anahuac-builder-export') || doc.querySelector('meta[name="generator"]')?.getAttribute('content') === 'anahuac-builder-lms' || stateScript;
        
        if (!isBuilder) {
            alert('Este contenido no parece haber sido generado por Builder LMS. No se encuentra la estructura base.');
            return;
        }

        if (!stateScript) {
            alert('No se encontró el estado de Builder LMS en este contenido.');
            return;
        }

        try {
            // It could be a script tag or a textarea now or a div
            let rawData = "";
            if (stateScript.tagName.toLowerCase() === 'textarea') {
                rawData = (stateScript as HTMLTextAreaElement).value || stateScript.textContent || '""';
            } else if (stateScript.tagName.toLowerCase() === 'div' || stateScript.tagName.toLowerCase() === 'span') {
                rawData = stateScript.textContent || '""';
            } else {
                rawData = stateScript.textContent || '""';
                try { rawData = JSON.parse(rawData); } catch(e) {} // legacy script tags had JSON.parse string
            }
            
                        if(rawData.startsWith('"')) {
                 try { rawData = JSON.parse(rawData); } catch(e){}
            }

            const rawCanvasHTML = decodeURIComponent(atob(rawData));
            const restoredHtml = rawCanvasHTML;
            
            const container = document.getElementById('canvas-container-outer') || document.getElementById('canvas');
            if (container) {
                if (!restoredHtml.includes('id="canvas"')) {
                    // OLD FORMAT: restoredHtml only contains the blocks.
                    // Keep the outer container and inject into #canvas.
                    const innerCanvas = document.getElementById('canvas');
                    if (innerCanvas) {
                        innerCanvas.innerHTML = restoredHtml;
                        // Migrate old parallax wrapper from inside canvas to the outer container
                        const oldWrapper = innerCanvas.querySelector(':scope > .parallax-bg-wrapper');
                        if (oldWrapper) {
                            const newWrapper = container.querySelector(':scope > .parallax-bg-wrapper');
                            if (newWrapper) {
                                newWrapper.innerHTML = oldWrapper.innerHTML;
                            }
                            oldWrapper.remove();
                        }
                    }
                } else {
                    // NEW FORMAT
                    container.innerHTML = restoredHtml;
                }

                // FIX: Migrate old parallax containers that had overflow-hidden
                document.querySelectorAll('.parallax-container').forEach(container => {
                    if (container.classList.contains('overflow-hidden')) {
                        container.classList.remove('overflow-hidden');
                        const layers = container.querySelectorAll('.parallax-layer');
                        if (layers.length > 0 && !container.querySelector('.parallax-bg-wrapper')) {
                            const wrapper = document.createElement('div');
                            wrapper.className = 'absolute inset-0 overflow-hidden pointer-events-none parallax-bg-wrapper';
                            wrapper.style.borderRadius = 'inherit';
                            layers.forEach(l => wrapper.appendChild(l));
                            container.insertBefore(wrapper, container.firstChild);
                        }
                    }
                });

                // FIX: Migrate details tags that are accordion panels
                document.querySelectorAll('details.group').forEach(details => {
                    if (details.classList.contains('overflow-hidden')) {
                        details.classList.remove('overflow-hidden');
                        const summary = details.querySelector('summary');
                        if (summary) summary.classList.add('rounded-t');
                    }
                });

                // Clear sortable active flag to force re-initialization of SortableJS
                document.querySelectorAll('.lms-dropzone').forEach(zone => {
                    delete (zone as HTMLElement).dataset.sortableActive;
                });

                if (window.initNestedDropzones) {
                    window.initNestedDropzones();
                }
                if (window.initParallax) {
                    window.initParallax();
                }
                document.querySelectorAll('[data-type="titulo_imagen"]').forEach(element => {
                    window.updateTitleImageContrast(element as HTMLElement);
                });

                // Re-init sortables
                window.initNestedDropzones();
            }
        } catch(e) {
            console.error("Error parsing LMS state", e);
            alert('Error al procesar el archivo. El estado puede estar corrupto.');
        }
    }

    window.pasteHTMLFromClipboard = async function() {
        try {
            const htmlContent = await navigator.clipboard.readText();
            if(!htmlContent) {
                 alert("El portapapeles está vacío o no es texto.");
                 return;
            }
            window.processImportedHTML(htmlContent);
        } catch (err) {
            console.error('Error al leer del portapapeles: ', err);
            const p = prompt("No pudimos leer el portapapeles directamente. Pega el código HTML aquí:");
            if (p) {
                 window.processImportedHTML(p);
            }
        }
    }

    window.importHTML = function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'text/html';
        input.onchange = function(e: Event) {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(evt) {
                const htmlContent = evt.target?.result as string;
                if (!htmlContent) return;

                window.processImportedHTML(htmlContent);
            };
            reader.readAsText(file);
        };
        input.click();
    }

    window.isLmsDragging = false;
    window.lmsDraggedItem = null;
    window.lmsLayoutIntent = null;
    window.lmsLayoutIntentTarget = null;
    
    // UI indicator
    let layoutIndicator = document.getElementById('lms-layout-indicator');
    if (!layoutIndicator) {
        layoutIndicator = document.createElement('div');
        layoutIndicator.id = 'lms-layout-indicator';
        layoutIndicator.className = 'fixed border-2 border-dashed border-anahuac-orange bg-orange-50/50 z-[9999] pointer-events-none transition-all duration-75 rounded-lg';
        layoutIndicator.style.display = 'none';
        document.body.appendChild(layoutIndicator);
    }
    
    window.lmsOnSortableStart = function(evt: any) {
        window.isLmsDragging = true;
        window.lmsDraggedItem = evt.item;
    };
    
    window.lmsOnSortableEnd = function(evt: any) {
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        if (window.lmsLayoutIntent && window.lmsLayoutIntentTarget) {
            const item = evt.item;
            const intent = window.lmsLayoutIntent;
            const target = window.lmsLayoutIntentTarget;
            
            setTimeout(() => {
                window.createLayoutColumn(intent, target, item);
            }, 10);
        }
        
        window.isLmsDragging = false;
        window.lmsLayoutIntent = null;
        window.lmsLayoutIntentTarget = null;
        document.body.classList.remove('layout-intent-active');
        if (layoutIndicator) layoutIndicator.style.display = 'none';
        
        setTimeout(() => window.checkEmptyState(), 60);
    };

    function updateLayoutIndicator(e: MouseEvent | TouchEvent) {
        if (!window.isLmsDragging) {
             if (layoutIndicator && layoutIndicator.style.display !== 'none') layoutIndicator.style.display = 'none';
             document.body.classList.remove('layout-intent-active');
             return;
        }
        
        let clientX = (e as MouseEvent).clientX;
        if (e.type === 'touchmove') {
            clientX = (e as TouchEvent).touches[0].clientX;
        }
        
        const target = e.target as HTMLElement;

        const hoveredLmsEl = target.closest('.lms-element.is-rendered:not(.column-layout-wrapper):not(.parallax-container)') as HTMLElement;
        let shouldShowIndicator = false;
        
        if (hoveredLmsEl && !hoveredLmsEl.closest('.column-layout-wrapper') && hoveredLmsEl !== window.lmsDraggedItem && !window.lmsDraggedItem?.contains(hoveredLmsEl)) {
            // Do not allow left/right side-by-side placements directly in the root #canvas, 
            // nor allow pagina_basica to be split side-by-side or placed side-by-side with anything.
            if ((hoveredLmsEl.parentElement && hoveredLmsEl.parentElement.id === 'canvas') || 
                hoveredLmsEl.dataset.type === 'pagina_basica' || 
                window.lmsDraggedItem?.dataset?.type === 'pagina_basica') {
                shouldShowIndicator = false;
            } else {
                const rect = hoveredLmsEl.getBoundingClientRect();
                const relX = clientX - rect.left;
                
                // max 60px or 25% of width threshold, making the middle 50%+ safe for vertical sorting
                const threshold = Math.min(rect.width * 0.25, 60);
                
                if (relX < threshold) {
                    window.lmsLayoutIntent = 'left';
                    window.lmsLayoutIntentTarget = hoveredLmsEl;
                    shouldShowIndicator = true;
                    if (layoutIndicator) {
                        layoutIndicator.style.display = 'block';
                        layoutIndicator.className = 'fixed bg-anahuac-orange z-[9999] pointer-events-none transition-all duration-75 rounded-full shadow-[0_0_10px_rgba(255,89,0,0.5)]';
                        layoutIndicator.style.top = `${rect.top}px`;
                        layoutIndicator.style.left = `${rect.left - 4}px`;
                        layoutIndicator.style.width = `8px`;
                        layoutIndicator.style.height = `${rect.height}px`;
                    }
                } 
                else if (relX > rect.width - threshold) {
                    window.lmsLayoutIntent = 'right';
                    window.lmsLayoutIntentTarget = hoveredLmsEl;
                    shouldShowIndicator = true;
                    if (layoutIndicator) {
                        layoutIndicator.style.display = 'block';
                        layoutIndicator.className = 'fixed bg-anahuac-orange z-[9999] pointer-events-none transition-all duration-75 rounded-full shadow-[0_0_10px_rgba(255,89,0,0.5)]';
                        layoutIndicator.style.top = `${rect.top}px`;
                        layoutIndicator.style.left = `${rect.right - 4}px`;
                        layoutIndicator.style.width = `8px`;
                        layoutIndicator.style.height = `${rect.height}px`;
                    }
                }
            }
        }
        
        if (shouldShowIndicator) {
            document.body.classList.add('layout-intent-active');
        } else {
            window.lmsLayoutIntent = null;
            window.lmsLayoutIntentTarget = null;
            document.body.classList.remove('layout-intent-active');
            if (layoutIndicator && layoutIndicator.style.display !== 'none') {
                layoutIndicator.style.display = 'none';
            }
        }
    }

    window.addEventListener('mousemove', updateLayoutIndicator);
    window.addEventListener('touchmove', updateLayoutIndicator);
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        updateLayoutIndicator(e);
    });

    window.lmsOnSortableMove = function(evt: any, originalEvent: MouseEvent) {
         // Return false to prevent vertical sorting if we are in horizontal zone
         if (window.lmsLayoutIntent) return false;
         return true;
    };

    const dropzoneOptions: any = {
        group: 'shared', 
        animation: 150, 
        ghostClass: 'ghost-element', 
        dragClass: 'drag-item', 
        handle: '.drag-handle', 
        forceFallback: true, 
        fallbackTolerance: 3, 
        fallbackOnBody: true, 
        swapThreshold: 0.65,
        easing: "cubic-bezier(1, 0, 0, 1)",
        emptyInsertThreshold: 20, 
        direction: 'vertical',
        
        onStart: function(evt: any) {
            document.body.classList.add('is-dragging');
            if (window.lmsOnSortableStart) window.lmsOnSortableStart(evt);
        },
        
        onEnd: function(evt: any) {
            document.body.classList.remove('is-dragging');
            if (window.lmsOnSortableEnd) window.lmsOnSortableEnd(evt);
        },
        
        onMove: function(evt: any, originalEvent: MouseEvent) {
            if (window.lmsOnSortableMove) return window.lmsOnSortableMove(evt, originalEvent);
            return true;
        },

        onAdd: function (evt: any) {
            const item = evt.item; const type = item.dataset.type;
            
            if (window.lmsLayoutIntent && window.lmsLayoutIntentTarget) {
                 // Do not render temp elements if handled via layout column logic natively
                 return;
            }

            if(type && !item.classList.contains('is-rendered')) {
                setTimeout(() => {
                    let newHTML = '';
                    if(type === 'bienvenida') newHTML = getBienvenidaHTML();
                    else if(type === 'referencias') newHTML = getReferenciasHTML();
                    else if(type === 'requerimientos') newHTML = getRequerimientosHTML();
                    else if(type === 'indice') newHTML = getIndiceHTML();
                    else if(type === 'conclusiones') newHTML = getConclusionesHTML();
                    else if(type === 'profesor') newHTML = getProfesorHTML();
                    else if(type === 'pagina_basica') newHTML = getPaginaBasicaHTML();
                    else if(type === 'pestanas') newHTML = getTabsHTML();
                    else if(type === 'caja_texto') newHTML = getCajaTextoHTML();
                    else if(type === 'titulo_basico') newHTML = getTituloBasicoHTML();
                    else if(type === 'titulo_imagen') newHTML = getTituloImagenHTML();
                    else if(type === 'parrafo_basico') newHTML = getParrafoBasicoHTML();
                    else if(type === 'imagen_suelta') newHTML = getImagenSueltaHTML();
                    else if(type === 'grid_2x2') newHTML = getGrid2x2HTML();
                    else if(type === 'cuadro_naranja') newHTML = getCuadroNaranjaHTML();
                    else if(type === 'acordeon') newHTML = getAcordeonHTML();
                    else if(type === 'tabla_dinamica') newHTML = getTablaDinamicaHTML();
                    else if(type === 'separador') newHTML = getSeparadorHTML();
                    else if(type === 'icono_suelto') newHTML = getIconoSueltoHTML();
                    else if(type === 'profesor_datos') newHTML = getProfesorDatosHTML();
                    else if(type === 'referencia_item') newHTML = getReferenciaItemHTML();
                    else if(type === 'referencias_importer') newHTML = getReferenciasImporterHTML();
                    else if(type === 'flipcard') newHTML = getFlipcardHTML();
                    else if(type === 'calculadora_html') newHTML = getCalculadoraHTML();
                    else if(type.startsWith('embed_')) newHTML = getEmbedHTML(type);
                    
                    if (!newHTML) return;

                    const template = document.createElement('template'); 
                    template.innerHTML = newHTML.trim(); 
                    const renderedElement = template.content.firstElementChild as HTMLElement | null;
                    if(item.parentNode && renderedElement) {
                        item.parentNode.replaceChild(renderedElement, item);
                        if (type === 'titulo_imagen') {
                            window.updateTitleImageContrast(renderedElement);
                        }
                    }
                    
                    window.checkEmptyState();
                    if(window.initParallax) window.initParallax(); 
                    if(window.initNestedDropzones) window.initNestedDropzones();
                }, 10);
            }
            window.checkEmptyState();
        }
    };

    window.pasteReferencesClick = async function(btn: HTMLElement) {
        try {
            const text = await navigator.clipboard.readText();
            if (!text.trim()) {
                alert('El portapapeles está vacío o no contiene texto.');
                return;
            }

            const importerElement = btn.closest('.lms-element');
            const dropzone = importerElement?.parentElement;
            
            if (!dropzone) return;

            const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
            let entries: {text: string, url: string}[] = [];
            const urlRegex = /(https?:\/\/[^\s]+)/gi;
            
            for (const line of lines) {
                const matches = [...line.matchAll(urlRegex)];
                if (matches.length > 0) {
                    let lastIndex = 0;
                    for (const match of matches) {
                        const index = match.index;
                        const entryText = line.substring(lastIndex, index).trim();
                        if (entryText || match[0]) {
                            entries.push({ text: entryText, url: match[0] });
                        }
                        if (index !== undefined) {
                            lastIndex = index + match[0].length;
                        }
                    }
                    const trailingText = line.substring(lastIndex).trim();
                    if (trailingText) {
                        entries.push({ text: trailingText, url: '' });
                    }
                } else {
                    entries.push({ text: line.trim(), url: '' });
                }
            }

            if (entries.length === 0) {
                alert('No se pudieron procesar referencias del texto.');
                return;
            }

            let htmlToAppend = '';
            entries.forEach(entry => {
                htmlToAppend += getReferenciaItemHTML(entry.text, entry.url);
            });

            // Insert new items right before the importer block
            importerElement.insertAdjacentHTML('beforebegin', htmlToAppend);
            if (window.initNestedDropzones) window.initNestedDropzones();

        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            alert('No se pudo acceder al portapapeles automáticamente.\n\nPor favor, haz clic en el área gris y presiona Ctrl+V o Comando+V para pegar tus referencias.');
        }
    };

    window.handleReferencesPasteArea = function(event: ClipboardEvent, el: HTMLTextAreaElement) {
        event.preventDefault();
        const text = event.clipboardData?.getData('text/plain') || '';
        if (!text.trim()) return;

        const importerElement = el.closest('.lms-element');
        const dropzone = importerElement?.parentElement;
        if (!dropzone) return;

        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        let entries: {text: string, url: string}[] = [];
        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        
        for (const line of lines) {
            const matches = [...line.matchAll(urlRegex)];
            if (matches.length > 0) {
                let lastIndex = 0;
                for (const match of matches) {
                    const index = match.index;
                    const entryText = line.substring(lastIndex, index).trim();
                    if (entryText || match[0]) {
                        entries.push({ text: entryText, url: match[0] });
                    }
                    if (index !== undefined) {
                        lastIndex = index + match[0].length;
                    }
                }
                const trailingText = line.substring(lastIndex).trim();
                if (trailingText) {
                    entries.push({ text: trailingText, url: '' });
                }
            } else {
                entries.push({ text: line.trim(), url: '' });
            }
        }

        if (entries.length === 0) {
            alert('No se pudieron procesar referencias del texto.');
            return;
        }

        let htmlToAppend = '';
        entries.forEach(entry => {
            htmlToAppend += getReferenciaItemHTML(entry.text, entry.url);
        });

        importerElement.insertAdjacentHTML('beforebegin', htmlToAppend);
        if (window.initNestedDropzones) window.initNestedDropzones();
    };

    window.editReferenceLink = function(btn: HTMLElement) {
        const linkContainer = btn.closest('.reference-link-container') as HTMLElement;
        if (!linkContainer) return;
        const a = linkContainer.querySelector('a.reference-link') as HTMLAnchorElement;
        if (!a) return;
        
        a.style.display = 'none';
        btn.style.display = 'none';
        
        const currentUrl = a.getAttribute('href') || '';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentUrl;
        input.className = 'border border-anahuac-orange rounded px-2 py-1 text-sm font-sans flex-1 outline-none focus:ring-2 focus:ring-anahuac-orange transition-all';
        input.style.minWidth = '200px';
        
        const saveBtn = document.createElement('button');
        saveBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">check</span>';
        saveBtn.className = 'bg-anahuac-orange text-white rounded p-1 flex items-center justify-center hover:bg-orange-600 transition-colors ml-2';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">close</span>';
        cancelBtn.className = 'bg-gray-200 text-gray-700 rounded p-1 flex items-center justify-center hover:bg-gray-300 transition-colors ml-1';
        
        const editorDiv = document.createElement('div');
        editorDiv.className = 'flex items-center w-full z-20 reference-editor';
        editorDiv.appendChild(input);
        editorDiv.appendChild(saveBtn);
        editorDiv.appendChild(cancelBtn);
        
        linkContainer.appendChild(editorDiv);
        input.focus();
        
        const closeEditor = () => {
            a.style.display = '';
            btn.style.display = '';
            editorDiv.remove();
        };

        const saveUrl = () => {
            const newUrl = input.value.trim();
            if (newUrl) {
                a.setAttribute('href', newUrl);
                a.setAttribute('title', newUrl);
            }
            closeEditor();
        };

        saveBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); saveUrl(); };
        cancelBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); closeEditor(); };
        input.onkeydown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); saveUrl(); }
            if (e.key === 'Escape') { e.preventDefault(); closeEditor(); }
        };
    };

    window.initNestedDropzones = function() {
        document.querySelectorAll('.lms-dropzone').forEach(zone => { 
            const htmlZone = zone as HTMLElement;
            if(htmlZone.dataset.sortableActive !== "true") { 
                new Sortable(htmlZone, dropzoneOptions); 
                htmlZone.dataset.sortableActive = "true"; 
            } 
        });
        document.querySelectorAll('.lms-element[data-type="tabla_dinamica"] table').forEach(t => {
            if(window.setupTableHoverControls) {
                window.setupTableHoverControls(t as HTMLElement);
            }
        });
    };

    window.initParallax = function() {
        // Obsolete
    }
}
