// Selection lives outside the authored DOM: no classes/attributes enter history,
// project snapshots or the published page.
export function setupToolbarSelection() {
  const canvas = document.getElementById('canvas-container-outer');
  if (!canvas) return () => {};
  const style = document.createElement('style');
  document.head.append(style);
  let selected: HTMLElement | null = null;
  let ignoreClickUntil = 0;
  const clear = () => { selected = null; style.textContent = ''; };
  const dragging = () => document.body.classList.contains('is-dragging') || window.isLmsDragging;
  const render = () => {
    if (!selected) return;
    if (!canvas.contains(selected) || dragging()) { clear(); return; }
    const parts: string[] = [];
    const layers: string[] = [];
    let node: Element = selected;
    while (node !== canvas) {
      const parent = node.parentElement!;
      parts.unshift(`:nth-child(${Array.from(parent.children).indexOf(node) + 1})`);
      node = parent;
    }
    const path = '#canvas-container-outer > ' + parts.join(' > ');
    // Lift only the selected branch, never change geometry or drop targets.
    node = selected;
    for (let count = parts.length; count > 0; count--, node = node.parentElement!) {
      if (node.matches('.lms-element')) layers.push('#canvas-container-outer > ' + parts.slice(0, count).join(' > '));
    }
    style.textContent = `
      body:not(.is-dragging) #canvas-container-outer .block-toolbar {
        opacity:0!important; pointer-events:none!important;
      }
      body:not(.is-dragging) #canvas-container-outer .block-toolbar * {pointer-events:none!important}
      body:not(.is-dragging) ${path} > .block-toolbar {opacity:1!important;pointer-events:auto!important}
      body:not(.is-dragging) ${path} > .block-toolbar * {pointer-events:auto!important}
      ${layers.map(s => `body:not(.is-dragging) ${s}`).join(',')} {z-index:60}
    `;
  };
  const click = (event: MouseEvent) => {
    if (!(event.target instanceof Element) || dragging() || performance.now() < ignoreClickUntil) return;
    const target = event.target;
    // Controls keep their native click behaviour; no preventDefault/stopPropagation.
    if (target.closest('dialog,[role="dialog"],[id$="-modal"],#rtf-toolbar,#image-toolbar,#inline-icon-toolbar,.exercise-editor-overlay')) return;
    if (!canvas.contains(target)) { clear(); return; }
    if (target.closest('[contenteditable="true"]')) { clear(); return; }
    const block = target.closest<HTMLElement>('.lms-element');
    if (!block || !block.querySelector(':scope > .block-toolbar')) { clear(); return; }
    selected = block;
    render();
  };
  const doubleClick = (event: MouseEvent) => {
    if (event.target instanceof Element && canvas.contains(event.target) && event.target.closest('.editable-text,.exercise-name,.editable-icon')) clear();
  };
  const key = (event: KeyboardEvent) => { if (event.key === 'Escape') clear(); };
  const dragStart = () => { ignoreClickUntil = Infinity; clear(); };
  const dragEnd = () => { ignoreClickUntil = performance.now() + 150; };
  const observer = new MutationObserver(render);
  observer.observe(canvas, {childList:true,subtree:true});
  const bodyObserver = new MutationObserver(() => {
    if (dragging()) dragStart();
    else if (ignoreClickUntil === Infinity) dragEnd();
  });
  bodyObserver.observe(document.body, {attributes:true,attributeFilter:['class']});
  document.addEventListener('click', click, true);
  document.addEventListener('dblclick', doubleClick, true);
  document.addEventListener('keydown', key, true);
  document.addEventListener('dragstart', dragStart, true);
  document.addEventListener('dragend', dragEnd, true);
  return () => {
    observer.disconnect(); bodyObserver.disconnect(); style.remove();
    document.removeEventListener('click', click, true);
    document.removeEventListener('dblclick', doubleClick, true);
    document.removeEventListener('keydown', key, true);
    document.removeEventListener('dragstart', dragStart, true);
    document.removeEventListener('dragend', dragEnd, true);
  };
}
