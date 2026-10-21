// Shared by the editor and exported HTML. Cross-origin sizes require cooperation.
/** @param {ParentNode} root */
export function setupMediaEmbeds(root = document, editor = false) {
  const state = setupMediaEmbeds.state || (setupMediaEmbeds.state = new WeakMap());
  const set = (el, key, value) => { if (el.style.getPropertyValue(key) !== value) el.style.setProperty(key, value); };
  root.querySelectorAll('[data-type^="embed_"]').forEach(block => {
    const frame = block.querySelector('.embed-result iframe');
    if (!frame) return;
    const result = block.querySelector('.embed-result');
    if (!editor) block.querySelectorAll('[data-media-resize],[data-media-height]').forEach(el => el.remove());
    for (const token of ['bg-black', 'pt-6']) if (result.classList.contains(token)) result.classList.remove(token);
    set(result, 'padding', '0px'); set(result, 'background', 'transparent');
    set(result, 'height', 'auto');
    set(frame, 'width', '100%'); set(frame, 'max-width', '100%');
    set(frame, 'display', 'block'); set(frame, 'border', '0px');
    const apply = () => {
      if (Number(block.dataset.mediaUserRatio) > 0) {
        set(frame, 'height', 'auto'); set(frame, 'aspect-ratio', block.dataset.mediaUserRatio); return;
      }
      const height = Number(block.dataset.mediaHeight || block.dataset.mediaMeasuredHeight);
      if (height > 0) { set(frame, 'aspect-ratio', 'auto'); set(frame, 'height', height + 'px'); }
      else { set(frame, 'height', 'auto'); set(frame, 'aspect-ratio', block.dataset.mediaRatio || block.dataset.canvaRatio || '16 / 9'); }
    };
    if (state.has(frame)) { apply(); return; }
    state.set(frame, true);
    frame.allowFullscreen = true;
    const input = block.querySelector('.embed-input');
    const original = new DOMParser().parseFromString(input?.value || input?.getAttribute('value') || '', 'text/html');
    const authored = original.querySelector('iframe');
    if (!block.dataset.mediaRatio && authored) {
      let ratio = '';
      for (let node = authored; node && node !== original.body; node = node.parentElement) {
        if (node.style.aspectRatio) { ratio = node.style.aspectRatio; break; }
        const padding = [node.style.paddingTop, node.style.paddingBottom].find(v => /^\d*\.?\d+%$/.test(v) && parseFloat(v) > 0);
        if (padding) { ratio = String(100 / parseFloat(padding)); break; }
      }
      const pixels = v => /^\d+(\.\d+)?(px)?$/.test(v || '') ? parseFloat(v) : 0;
      const width = pixels(authored.getAttribute('width')) || pixels(authored.style.width);
      const height = pixels(authored.getAttribute('height')) || pixels(authored.style.height);
      if (!ratio && width && height) ratio = String(width / height);
      if (ratio) block.dataset.mediaRatio = ratio;
      else if (height && !block.dataset.mediaHeight) block.dataset.mediaHeight = String(height);
    }
    apply();
    const measure = () => {
      if (block.dataset.mediaUserRatio || block.dataset.mediaHeight || ['embed_youtube','embed_vimeo','embed_sketchfab'].includes(block.dataset.type)) return;
      try {
        const doc = frame.contentDocument;
        if (!doc?.body || (!frame.srcdoc && doc.URL === 'about:blank')) return;
        const height = Math.ceil(Math.max(doc.body.offsetHeight, doc.body.scrollHeight) + parseFloat(getComputedStyle(doc.body).marginTop || 0) + parseFloat(getComputedStyle(doc.body).marginBottom || 0));
        if (height > 0 && height <= 20000) { block.dataset.mediaMeasuredHeight = String(height); apply(); }
      } catch { /* Cross-origin resources keep their authored size and scroll. */ }
    };
    let observer;
    const loaded = () => {
      observer?.disconnect();
      measure();
      try { if (frame.contentDocument?.body) { observer = new ResizeObserver(measure); observer.observe(frame.contentDocument.body); } } catch { /* External provider. */ }
    };
    if (frame.isConnected) { frame.addEventListener('load', loaded); loaded(); }
    const receive = event => {
      if (!frame.isConnected) { window.removeEventListener('message', receive); observer?.disconnect(); return; }
      let origin; try { origin = new URL(frame.src, location.href).origin; } catch { return; }
      if (event.source !== frame.contentWindow || event.origin !== origin || origin === 'null') return;
      if (event.data?.type !== 'lms:embed-size' || block.dataset.mediaHeight || block.dataset.mediaUserRatio) return;
      const height = event.data.height;
      if (typeof height !== 'number' || !Number.isFinite(height) || height < 120 || height > 20000) return;
      block.dataset.mediaMeasuredHeight = String(Math.ceil(height)); apply();
    };
    if (frame.isConnected) window.addEventListener('message', receive);
    let fullscreen = block.querySelector('[data-media-fullscreen]');
    if (!fullscreen) {
      fullscreen = document.createElement('button'); fullscreen.type = 'button'; fullscreen.dataset.mediaFullscreen = '';
      fullscreen.title = 'Ver recurso en pantalla completa'; fullscreen.setAttribute('aria-label', fullscreen.title);
      fullscreen.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">fullscreen</span>';
      fullscreen.style.cssText = 'display:flex;margin:4px 0 0 auto;border:0;border-radius:6px;padding:6px;background:#5d428c;color:white;cursor:pointer';
      result.after(fullscreen);
    }
    fullscreen.onclick = async event => {
      event.preventDefault(); event.stopPropagation();
      try { await frame.requestFullscreen(); } catch { window.alert('Este navegador o LMS no permite pantalla completa. Usa la opción de pantalla completa del recurso.'); }
    };
    if (editor) {
      block.querySelectorAll('[data-media-height]').forEach(el => el.remove());
      set(result, 'position', 'relative');
      let handle = result.querySelector('[data-media-resize]');
      if (!handle) {
        handle = document.createElement('div'); handle.dataset.mediaResize = ''; result.append(handle);
      }
      handle.tabIndex = 0; handle.setAttribute('role', 'separator'); handle.setAttribute('aria-orientation', 'horizontal');
      handle.setAttribute('aria-valuemin', '120'); handle.setAttribute('aria-valuemax', '6000'); handle.setAttribute('aria-valuenow', String(frame.clientHeight));
      handle.setAttribute('aria-label', 'Ajustar altura del recurso');
      handle.title = 'Arrastra para ajustar la proporción. Doble clic para volver a automático. Flechas arriba/abajo para ajustar.';
      handle.style.cssText = 'position:absolute;bottom:0;left:0;width:100%;height:18px;z-index:20;cursor:ns-resize;touch-action:none;user-select:none;display:flex;justify-content:center;align-items:center;background:#5d428c22;color:#5d428c';
      handle.innerHTML = '<span aria-hidden="true" style="width:40px;height:4px;border-radius:4px;background:currentColor;pointer-events:none"></span>';
      const notify = () => block.dispatchEvent(new Event('input', {bubbles:true}));
      const resize = height => {
        const width = frame.clientWidth; if (!width) return;
        block.dataset.mediaUserRatio = String(width / Math.min(6000, Math.max(120, height)));
        delete block.dataset.mediaHeight; delete block.dataset.mediaMeasuredHeight;
        apply(); handle.setAttribute('aria-valuenow', String(Math.round(frame.clientHeight)));
      };
      const reset = () => { delete block.dataset.mediaUserRatio; delete block.dataset.mediaHeight; delete block.dataset.mediaMeasuredHeight; apply(); measure(); notify(); };
      handle.ondblclick = event => { event.preventDefault(); event.stopPropagation(); reset(); };
      handle.onkeydown = event => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); event.stopPropagation(); resize(frame.clientHeight + (event.key === 'ArrowDown' ? 1 : -1) * (event.shiftKey ? 50 : 10)); notify(); }
        if (event.key === 'Home') { event.preventDefault(); reset(); }
      };
      let drag;
      const finish = cancelled => {
        if (!drag) return;
        if (cancelled) for (const [key,value] of Object.entries(drag.saved)) { if (value === undefined) delete block.dataset[key]; else block.dataset[key] = value; }
        frame.style.pointerEvents = drag.pointerEvents;
        const id = drag.id; drag = null;
        if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
        window.removeEventListener('keydown', escape); apply(); if (!cancelled) notify();
      };
      const escape = event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finish(true); } };
      handle.onpointerdown = event => {
        if (event.button !== 0 || drag) return;
        event.preventDefault(); event.stopPropagation();
        const rect = frame.getBoundingClientRect();
        drag = {id:event.pointerId, y:event.clientY, height:frame.clientHeight, scale:rect.width / frame.clientWidth || 1, pointerEvents:frame.style.pointerEvents,
          saved:{mediaUserRatio:block.dataset.mediaUserRatio,mediaHeight:block.dataset.mediaHeight,mediaMeasuredHeight:block.dataset.mediaMeasuredHeight}};
        frame.style.pointerEvents = 'none'; handle.setPointerCapture(event.pointerId); window.addEventListener('keydown', escape);
      };
      handle.onpointermove = event => { if (drag && drag.id === event.pointerId) { event.preventDefault(); resize(drag.height + (event.clientY - drag.y) / drag.scale); } };
      handle.onpointerup = event => { if (drag?.id === event.pointerId) finish(false); };
      handle.onpointercancel = () => finish(true);
      handle.onlostpointercapture = () => finish(true);
    }
  });
}
