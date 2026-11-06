/** The four institutional text sizes, shared by existing and new fields. */
export const builderFontSizes = [12,14,20,30] as const;
export function normalizeBuilderTypography(root:ParentNode){
 const nodes=new Set<HTMLElement>();
 root.querySelectorAll<HTMLElement>('.editable-text').forEach(text=>{nodes.add(text);text.querySelectorAll<HTMLElement>('*').forEach(node=>nodes.add(node));});
 const changes=[...nodes].filter(node=>!node.closest('.editable-icon,.material-symbols-outlined,svg,.mod-editor')).map(node=>{
  const size=parseFloat(getComputedStyle(node).fontSize);
  const nearest=builderFontSizes.reduce((best,value)=>Math.abs(value-size)<Math.abs(best-size)?value:best,14 as number);
  return {node,size,nearest};
 });
 for(const {node,size,nearest} of changes)if(Number.isFinite(size)&&size!==nearest)node.style.fontSize=nearest+'px';
}
