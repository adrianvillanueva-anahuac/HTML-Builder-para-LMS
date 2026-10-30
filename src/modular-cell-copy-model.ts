import type {ModularCell} from './modular-model';
export type ModularCopyMode='all'|'content'|'style';
const copy=<T>(value:T):T=>structuredClone(value);
/** Clipboard is authored data, never DOM/toolbars or a shared mutable reference. */
export function copyModularCell(source:ModularCell,target:ModularCell,mode:ModularCopyMode):ModularCell{
 if(mode==='all')return copy(source);
 const result=copy(target);
 if(mode==='style'){
  result.color=source.color;result.radius=source.radius;result.padding=source.padding;
  if(source.strokeColor!==undefined)result.strokeColor=source.strokeColor;else delete result.strokeColor;
  result.verticalAlign=source.verticalAlign;
  result.textStyle=copy(source.textStyle);if(source.textLayout)result.textLayout=copy(source.textLayout);
  result.textBoxes?.forEach((box,index)=>{const original=source.textBoxes?.[index];if(original){box.layout=copy(original.layout);box.document.style=copy(original.document.style);}});
  if(source.textOverflow&&result.textOverflow){result.textOverflow.panel=copy(source.textOverflow.panel);result.textOverflow.button=copy(source.textOverflow.button);}
  if(source.badge&&result.badge){const content={text:result.badge.text,html:result.badge.html};result.badge={...copy(source.badge),...content};}
 }else{
  result.html=source.html;result.textLayout=copy(source.textLayout);result.textBoxes=copy(source.textBoxes);result.textStyle=copy(source.textStyle);
  result.studentPromptHtml=source.studentPromptHtml;result.studentPromptEnabled=source.studentPromptEnabled;
  if(source.textOverflow)result.textOverflow={...copy(source.textOverflow),panel:copy(target.textOverflow?.panel||source.textOverflow.panel),button:copy(target.textOverflow?.button||source.textOverflow.button)};
  else delete result.textOverflow;
  if(source.badge){result.badge={...copy(target.badge||source.badge),text:source.badge.text,html:source.badge.html,textStyle:source.badge.textStyle};}
  else if(result.badge){result.badge.text='';delete result.badge.html;}
 }
 return result;
}
