import './dev-annotations.css';

export interface DevAnnotation {
  id: string;
  number: number;
  comment: string;
  selector: string;
  blockType: string;
  tag: string;
  textSnippet: string;
  rx: number;
  ry: number;
  fallbackX: number;
  fallbackY: number;
  resolved: boolean;
  createdAt: string;
  context?: 'main' | 'exercise';
}

const STORAGE_KEY = 'lms_dev_annotations_v1';

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'ann_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
};

function buildSelector(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const parts: string[] = [];
  let current: Element | null = el;
  let depth = 0;
  while (current && current !== document.body && depth < 5) {
    let part = current.tagName.toLowerCase();
    if (current.id) {
      parts.unshift(`#${CSS.escape(current.id)}`);
      break;
    }
    const dataType = current.getAttribute('data-type');
    if (dataType) {
      part += `[data-type="${dataType}"]`;
    } else if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children).filter(
        sibling => sibling.tagName === current!.tagName,
      );
      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
    }
    parts.unshift(part);
    current = current.parentElement;
    depth++;
  }
  return parts.join(' > ');
}

function describeElement(el: Element): {selector: string; blockType: string; tag: string; textSnippet: string; label: string} {
  const selector = buildSelector(el);
  const blockEl = el.closest('[data-type]');
  const blockType = blockEl?.getAttribute('data-type') || '';
  const tag = el.tagName.toLowerCase();
  const rawText = (el.getAttribute('title') || el.getAttribute('aria-label') || el.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 70);
  const labelParts = [
    blockType ? `Bloque: ${blockType}` : '',
    tag,
    rawText ? `"${rawText.slice(0, 32)}"` : '',
  ].filter(Boolean);
  return {
    selector,
    blockType,
    tag,
    textSnippet: rawText,
    label: labelParts.join(' · '),
  };
}

export function setupDevAnnotations(): void {
  if (typeof window === 'undefined') return;
  if (location.search.includes('check=')) return;
  const isExerciseMode = new URLSearchParams(location.search).get('editor') === 'exercise';
  if (window !== window.top && !isExerciseMode) return;

  const win = window as unknown as {__lmsDevAnnotationsCleanup?: () => void};
  if (typeof win.__lmsDevAnnotationsCleanup === 'function') {
    win.__lmsDevAnnotationsCleanup();
  }
  document.getElementById('dev-annotations-root')?.remove();
  document.getElementById('dev-ann-header-btn')?.remove();
  document.body.classList.remove('dev-annotating');

  const root = document.createElement('div');
  root.id = 'dev-annotations-root';
  document.body.appendChild(root);

  let annotations: DevAnnotation[] = [];
  let annotating = false;
  let pinsVisible = true;
  let listOpen = false;
  let selectedId: string | null = null;
  let hoveredTarget: Element | null = null;

  const banner = document.createElement('div');
  banner.className = 'dev-ann-banner';
  banner.style.display = 'none';
  banner.innerHTML = `<span>💬 ${isExerciseMode ? '[Editor de ejercicio] ' : ''}Haz clic en cualquier elemento para agregar una nota</span><button type="button" aria-label="Salir del modo comentarios">Esc</button>`;
  banner.querySelector('button')!.onclick = () => setAnnotating(false);
  root.appendChild(banner);

  const highlight = document.createElement('div');
  highlight.className = 'dev-ann-highlight';
  highlight.style.display = 'none';
  const highlightLabel = document.createElement('div');
  highlightLabel.className = 'dev-ann-highlight-label';
  highlight.appendChild(highlightLabel);
  root.appendChild(highlight);

  const pinsLayer = document.createElement('div');
  root.appendChild(pinsLayer);

  const cardContainer = document.createElement('div');
  root.appendChild(cardContainer);

  const listContainer = document.createElement('div');
  root.appendChild(listContainer);

  const toolbar = document.createElement('div');
  toolbar.className = 'dev-ann-toolbar';
  root.appendChild(toolbar);

  const syncToServer = async (items: DevAnnotation[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota errors
    }
    try {
      await fetch('/__dev-annotations', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(items),
      });
    } catch {
      // Fallback to localStorage only
    }
  };

  const loadInitial = async () => {
    try {
      const res = await fetch('/__dev-annotations');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          annotations = data;
          renderAll();
          return;
        }
      }
    } catch {
      // Ignore
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        annotations = JSON.parse(raw);
        renderAll();
      }
    } catch {
      // Ignore
    }
  };

  let renderedPins: {ann: DevAnnotation; pin: HTMLButtonElement; target: Element | null}[] = [];
  let pinScrollRaf = 0;

  const computePinCoords = (ann: DevAnnotation, cachedTarget?: Element | null): {x: number; y: number; target: Element | null} => {
    let el: Element | null = cachedTarget && cachedTarget.isConnected ? cachedTarget : null;
    if (!el) {
      try {
        el = document.querySelector(ann.selector);
      } catch {
        el = null;
      }
    }
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return {
          x: Math.max(16, Math.min(window.innerWidth - 16, rect.left + rect.width * ann.rx)),
          y: Math.max(28, Math.min(window.innerHeight - 16, rect.top + rect.height * ann.ry)),
          target: el,
        };
      }
    }
    return {
      x: Math.max(16, Math.min(window.innerWidth - 16, ann.fallbackX)),
      y: Math.max(28, Math.min(window.innerHeight - 16, ann.fallbackY)),
      target: el,
    };
  };

  const resolvePinPosition = (ann: DevAnnotation): {x: number; y: number} => {
    const {x, y} = computePinCoords(ann);
    return {x, y};
  };

  const setAnnotating = (active: boolean) => {
    annotating = active;
    document.body.classList.toggle('dev-annotating', annotating);
    banner.style.display = annotating ? 'flex' : 'none';
    if (!annotating) {
      hoveredTarget = null;
      highlight.style.display = 'none';
    }
    renderToolbar();
  };

  const renderToolbar = () => {
    const pendingCount = annotations.filter(
      a => !a.resolved && (isExerciseMode ? a.context === 'exercise' : (a.context || 'main') === 'main'),
    ).length;
    toolbar.innerHTML = '';

    const commentBtn = document.createElement('button');
    commentBtn.type = 'button';
    commentBtn.className = 'dev-ann-btn';
    commentBtn.dataset.active = String(annotating);
    commentBtn.title = 'Modo Comentarios estilo Figma (Alt + C)';
    commentBtn.innerHTML = `<span>💬 ${isExerciseMode ? 'Comentar ejercicio' : 'Comentar'} (Alt+C)</span>${
      pendingCount > 0 ? `<span class="dev-ann-badge">${pendingCount}</span>` : ''
    }`;
    commentBtn.onclick = e => {
      e.stopPropagation();
      setAnnotating(!annotating);
    };
    toolbar.appendChild(commentBtn);

    const relevantCount = annotations.filter(
      a => (isExerciseMode ? a.context === 'exercise' : (a.context || 'main') === 'main'),
    ).length;

    if (annotations.length > 0) {
      const listBtn = document.createElement('button');
      listBtn.type = 'button';
      listBtn.className = 'dev-ann-btn';
      listBtn.dataset.active = String(listOpen);
      listBtn.title = 'Ver lista de anotaciones';
      listBtn.textContent = `Notas (${relevantCount}/${annotations.length})`;
      listBtn.onclick = e => {
        e.stopPropagation();
        listOpen = !listOpen;
        renderList();
        renderToolbar();
      };
      toolbar.appendChild(listBtn);

      const toggleVisBtn = document.createElement('button');
      toggleVisBtn.type = 'button';
      toggleVisBtn.className = 'dev-ann-btn';
      toggleVisBtn.title = pinsVisible ? 'Ocultar pines en pantalla' : 'Mostrar pines en pantalla';
      toggleVisBtn.textContent = pinsVisible ? '👁️' : '🙈';
      toggleVisBtn.onclick = e => {
        e.stopPropagation();
        pinsVisible = !pinsVisible;
        renderPins();
        renderToolbar();
      };
      toolbar.appendChild(toggleVisBtn);
    }
  };

  const renderPins = () => {
    pinsLayer.innerHTML = '';
    renderedPins = [];
    if (!pinsVisible) return;

    const visibleAnnotations = annotations.filter(ann => {
      const annContext = ann.context || 'main';
      return isExerciseMode ? annContext === 'exercise' : annContext === 'main';
    });

    for (const ann of visibleAnnotations) {
      const coords = computePinCoords(ann);
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'dev-ann-pin';
      pin.dataset.selected = String(ann.id === selectedId);
      pin.dataset.resolved = String(ann.resolved);
      pin.style.left = `${coords.x}px`;
      pin.style.top = `${coords.y}px`;
      pin.title = ann.comment || `Nota #${ann.number}`;
      pin.innerHTML = `<span>${ann.number}</span>`;
      pin.onclick = e => {
        e.stopPropagation();
        selectedId = selectedId === ann.id ? null : ann.id;
        renderPins();
        renderCard();
      };
      pinsLayer.appendChild(pin);
      renderedPins.push({ann, pin, target: coords.target});
    }
  };

  const updatePinPositions = () => {
    pinScrollRaf = 0;
    if (!pinsVisible || !renderedPins.length) return;
    for (const entry of renderedPins) {
      const coords = computePinCoords(entry.ann, entry.target);
      entry.target = coords.target;
      entry.pin.style.left = `${coords.x}px`;
      entry.pin.style.top = `${coords.y}px`;
    }
  };

  const schedulePinPositions = () => {
    if (!pinsVisible || !renderedPins.length || pinScrollRaf) return;
    pinScrollRaf = requestAnimationFrame(updatePinPositions);
  };

  const renderCard = () => {
    cardContainer.innerHTML = '';
    if (!selectedId) return;
    const ann = annotations.find(item => item.id === selectedId);
    if (!ann) return;

    const pos = resolvePinPosition(ann);
    const card = document.createElement('div');
    card.className = 'dev-ann-card';
    const left = Math.min(window.innerWidth - 326, Math.max(16, pos.x + 18));
    const top = Math.min(window.innerHeight - 230, Math.max(16, pos.y - 20));
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;

    const header = document.createElement('div');
    header.className = 'dev-ann-card-header';
    header.innerHTML = `<span>Pin #${ann.number} ${ann.context === 'exercise' ? '· [Ejercicio]' : ''} ${ann.blockType ? `· ${ann.blockType}` : ''}</span>`;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'dev-ann-action-btn dev-ann-action-secondary';
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => {
      selectedId = null;
      renderPins();
      renderCard();
    };
    header.appendChild(closeBtn);
    card.appendChild(header);

    const meta = document.createElement('div');
    meta.className = 'dev-ann-target-meta';
    meta.textContent = `${ann.selector}${ann.textSnippet ? ` ("${ann.textSnippet.slice(0, 45)}")` : ''}`;
    card.appendChild(meta);

    const textarea = document.createElement('textarea');
    textarea.className = 'dev-ann-textarea';
    textarea.placeholder = 'Escribe tu observación para Antigravity... (Enter para guardar)';
    textarea.value = ann.comment;
    card.appendChild(textarea);
    setTimeout(() => {
      textarea.focus();
    }, 50);

    const saveComment = () => {
      const value = textarea.value.trim();
      if (!value) {
        annotations = annotations
          .filter(item => item.id !== ann.id)
          .map((item, idx) => ({...item, number: idx + 1}));
      } else {
        ann.comment = value;
      }
      selectedId = null;
      void syncToServer(annotations);
      renderAll();
    };

    textarea.addEventListener('input', () => {
      ann.comment = textarea.value;
      void syncToServer(annotations);
    });

    textarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveComment();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (!ann.comment.trim()) {
          annotations = annotations
            .filter(item => item.id !== ann.id)
            .map((item, idx) => ({...item, number: idx + 1}));
          void syncToServer(annotations);
        }
        selectedId = null;
        renderAll();
      }
    });

    const actions = document.createElement('div');
    actions.className = 'dev-ann-card-actions';

    const leftActions = document.createElement('div');
    leftActions.style.display = 'flex';
    leftActions.style.gap = '6px';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'dev-ann-action-btn dev-ann-action-danger';
    deleteBtn.textContent = 'Borrar';
    deleteBtn.onclick = () => {
      annotations = annotations
        .filter(item => item.id !== ann.id)
        .map((item, idx) => ({...item, number: idx + 1}));
      selectedId = null;
      void syncToServer(annotations);
      renderAll();
    };
    leftActions.appendChild(deleteBtn);

    const resolveBtn = document.createElement('button');
    resolveBtn.type = 'button';
    resolveBtn.className = 'dev-ann-action-btn dev-ann-action-secondary';
    resolveBtn.textContent = ann.resolved ? 'Reabrir' : '✓ Resuelto';
    resolveBtn.onclick = () => {
      ann.resolved = !ann.resolved;
      void syncToServer(annotations);
      renderAll();
    };
    leftActions.appendChild(resolveBtn);

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'dev-ann-action-btn dev-ann-action-save';
    saveBtn.textContent = 'Guardar';
    saveBtn.onclick = saveComment;

    actions.append(leftActions, saveBtn);
    card.appendChild(actions);
    cardContainer.appendChild(card);

    requestAnimationFrame(() => textarea.focus());
  };

  const renderList = () => {
    listContainer.innerHTML = '';
    if (!listOpen || annotations.length === 0) return;

    const panel = document.createElement('div');
    panel.className = 'dev-ann-list-panel';

    const topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.justifyContent = 'space-between';
    topRow.style.alignItems = 'center';
    topRow.innerHTML = `<strong style="font-size:13px">Anotaciones en vivo (${annotations.length})</strong>`;

    const clearAllBtn = document.createElement('button');
    clearAllBtn.type = 'button';
    clearAllBtn.className = 'dev-ann-action-btn dev-ann-action-danger';
    clearAllBtn.textContent = 'Limpiar todas';
    clearAllBtn.onclick = () => {
      annotations = [];
      selectedId = null;
      listOpen = false;
      void syncToServer(annotations);
      renderAll();
    };
    topRow.appendChild(clearAllBtn);
    panel.appendChild(topRow);

    for (const ann of annotations) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'dev-ann-list-item';
      item.innerHTML = `
        <span class="dev-ann-badge" style="background:${ann.resolved ? '#10b981' : '#0d99ff'}">${ann.number}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;color:#fff;margin-bottom:2px">
            ${ann.context === 'exercise' ? '<span style="background:#5d428c;color:#fff;font-size:10px;padding:1px 5px;border-radius:4px;margin-right:4px">Ejercicio</span>' : ''}
            ${ann.comment ? ann.comment.replace(/</g, '&lt;') : '<em>(Sin texto aún)</em>'}
          </div>
          <div style="font-size:11px;color:#9ca3af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${
            ann.blockType ? `[${ann.blockType}] ` : ''
          }${ann.selector}</div>
        </div>
      `;
      item.onclick = () => {
        selectedId = ann.id;
        try {
          document.querySelector(ann.selector)?.scrollIntoView({behavior: 'smooth', block: 'center'});
        } catch {
          // Ignore
        }
        renderPins();
        renderCard();
      };
      panel.appendChild(item);
    }

    listContainer.appendChild(panel);
  };

  const renderAll = () => {
    renderToolbar();
    renderPins();
    renderCard();
    renderList();
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!annotating) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || root.contains(target) || target === document.body || target === document.documentElement) {
      hoveredTarget = null;
      highlight.style.display = 'none';
      return;
    }
    hoveredTarget = target;
    const rect = target.getBoundingClientRect();
    highlight.style.display = 'block';
    highlight.style.left = `${rect.left}px`;
    highlight.style.top = `${rect.top}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;
    highlightLabel.textContent = describeElement(target).label;
  };

  const onClickCapture = (e: MouseEvent) => {
    if (!annotating) return;
    const target = e.target as Node | null;
    if (target && root.contains(target)) return;

    e.preventDefault();
    e.stopPropagation();

    const el = hoveredTarget || (e.target instanceof Element ? e.target : document.body);
    const rect = el.getBoundingClientRect();
    const info = describeElement(el);
    const rx = rect.width > 0 ? Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width)) : 0.5;
    const ry = rect.height > 0 ? Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height)) : 0.5;

    const newAnn: DevAnnotation = {
      id: generateId(),
      number: annotations.length + 1,
      comment: '',
      selector: info.selector,
      blockType: info.blockType,
      tag: info.tag,
      textSnippet: info.textSnippet,
      rx,
      ry,
      fallbackX: e.clientX,
      fallbackY: e.clientY,
      resolved: false,
      createdAt: new Date().toISOString(),
      context: isExerciseMode ? 'exercise' : 'main',
    };

    annotations.push(newAnn);
    selectedId = newAnn.id;
    setAnnotating(false);
    void syncToServer(annotations);
    renderAll();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      e.stopPropagation();
      const childFrame = getExerciseFrame();
      if (childFrame) {
        // The exercise editor overlay covers this window: forward the toggle to the iframe.
        childFrame.contentWindow?.postMessage({type: 'dev-ann-toggle'}, location.origin);
        childFrame.focus();
        return;
      }
      setAnnotating(!annotating);
    } else if (e.key === 'Escape' && annotating) {
      e.preventDefault();
      e.stopPropagation();
      setAnnotating(false);
    }
  };

  // While annotating, swallow press events so editor handlers (selection, toolbars, drag) don't react.
  const onPressCapture = (e: Event) => {
    if (!annotating) return;
    const target = e.target as Node | null;
    if (target && root.contains(target)) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const onMessage = (e: MessageEvent) => {
    if (e.origin !== location.origin || e.data?.type !== 'dev-ann-toggle') return;
    setAnnotating(!annotating);
  };

  // The exercise editor is an iframe overlay appended directly to <body> of the main window.
  // Hide the main window's annotation UI while it's open so it doesn't cover the iframe's own toolbar.
  const getExerciseFrame = (): HTMLIFrameElement | null =>
    isExerciseMode ? null : document.querySelector<HTMLIFrameElement>('.exercise-editor-overlay iframe');
  let overlayWasOpen = false;
  const syncOverlayState = () => {
    const open = !!getExerciseFrame();
    if (open === overlayWasOpen) return;
    overlayWasOpen = open;
    root.style.display = open ? 'none' : '';
    if (open) {
      if (annotating) setAnnotating(false);
    } else {
      // Reload so annotations created inside the exercise editor are not overwritten later.
      void loadInitial();
    }
  };
  const overlayObserver = isExerciseMode ? null : new MutationObserver(syncOverlayState);
  // childList only (no subtree): never reacts to our own DOM updates inside #dev-annotations-root.
  overlayObserver?.observe(document.body, {childList: true});

  window.addEventListener('pointermove', onPointerMove, true);
  window.addEventListener('pointerdown', onPressCapture, true);
  window.addEventListener('mousedown', onPressCapture, true);
  window.addEventListener('click', onClickCapture, true);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('message', onMessage);
  window.addEventListener('scroll', schedulePinPositions, {capture: true, passive: true});
  window.addEventListener('resize', schedulePinPositions);

  win.__lmsDevAnnotationsCleanup = () => {
    overlayObserver?.disconnect();
    window.removeEventListener('pointermove', onPointerMove, true);
    window.removeEventListener('pointerdown', onPressCapture, true);
    window.removeEventListener('mousedown', onPressCapture, true);
    window.removeEventListener('click', onClickCapture, true);
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('message', onMessage);
    window.removeEventListener('scroll', schedulePinPositions, true);
    window.removeEventListener('resize', schedulePinPositions);
    if (pinScrollRaf) {
      cancelAnimationFrame(pinScrollRaf);
      pinScrollRaf = 0;
    }
    document.body.classList.remove('dev-annotating');
    root.remove();
  };

  void loadInitial();
  renderToolbar();
  syncOverlayState();
}

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    setupDevAnnotations();
  });
}
