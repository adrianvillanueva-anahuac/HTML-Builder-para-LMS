// Keep editing-only colors outside the authored DOM and exported HTML.
export function setupEditingContrast() {
  const canvas = document.getElementById('canvas-container-outer');
  if (!canvas) return;
  const style = document.createElement('style');
  document.head.append(style);
  let frame = 0;
  const update = () => {
    frame = 0;
    const selectors: string[] = [];
    canvas.querySelectorAll<HTMLElement>('.editable-text[contenteditable="true"]').forEach(editor => {
      const hasWhiteText = [editor, ...editor.querySelectorAll<HTMLElement>('*')].some(el => {
        const channels = getComputedStyle(el).color.match(/[\d.]+/g)?.map(Number);
        return channels && channels[0] >= 245 && channels[1] >= 245 && channels[2] >= 245 &&
          (channels.length < 4 || channels[3] > 0);
      });
      if (!hasWhiteText) return;
      const parts: string[] = [];
      let node: Element = editor;
      while (node !== canvas) {
        const parent = node.parentElement!;
        parts.unshift(`:nth-child(${Array.from(parent.children).indexOf(node) + 1})`);
        node = parent;
      }
      selectors.push('#canvas-container-outer > ' + parts.join(' > ') + '[contenteditable="true"]');
    });
    style.textContent = selectors.length ? `${selectors.join(',')} {background-color:#f3a077!important}` : '';
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const observer = new MutationObserver(schedule);
  observer.observe(canvas, {subtree:true, childList:true, characterData:true, attributes:true,
    attributeFilter:['contenteditable','style','class','color']});
  schedule();
  return () => { observer.disconnect(); cancelAnimationFrame(frame); style.remove(); };
}
