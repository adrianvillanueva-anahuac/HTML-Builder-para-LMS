// Shared by the editor and the standalone HTML fallback.
export function promptLayout(position = 'top', width = 35) {
  const edge = ['top','bottom','left','right'].includes(position) ? position : 'top';
  const percent = Number.isFinite(width) ? Math.max(20, Math.min(80, width)) : 35;
  return {edge, percent, side: edge === 'left' || edge === 'right'};
}
export function applyPromptLayout(card:HTMLElement) {
  if(card.dataset.studentPrompt !== 'true') return;
  const prompt = card.querySelector<HTMLElement>('.mod-student-prompt');
  const answer = card.querySelector<HTMLElement>('.mod-text');
  if(!prompt || !answer) return;
  const {edge,percent,side} = promptLayout(card.dataset.promptPosition, Number(card.dataset.promptWidth ?? 35));
  const reverse = edge === 'bottom' || edge === 'right';
  Object.assign(card.style,{display:'flex',flexDirection:side ? (reverse?'row-reverse':'row') : (reverse?'column-reverse':'column'),gap:'8px',justifyContent:'flex-start'});
  Object.assign(prompt.style,{width:side?'auto':'100%',minWidth:'0',minHeight:'24px',flex:side?`0 0 calc(${percent}% - ${8*percent/100}px)`:'0 0 auto',overflowWrap:'anywhere'});
  Object.assign(answer.style,{width:side?'0':'100%',height:side?'100%':'auto',minWidth:'0',flex:side?'1 1 0':'1 0 30px',maxHeight:'none'});
  const divider = card.querySelector<HTMLElement>('.mod-prompt-resize');
  if(divider) {
    divider.hidden = !side;
    const ratio = (edge === 'right' ? 100-percent : percent)/100;
    const padding = parseFloat(card.style.getPropertyValue('--card-padding')) || 0;
    divider.style.left = `calc(${ratio*100}% + ${(1-2*ratio)*padding+4-8*ratio}px)`;
    divider.setAttribute('aria-valuenow',String(Math.round(percent)));
  }
}
