import Shepherd from 'shepherd.js';
import type {StepOptions,StepOptionsButton,Tour} from 'shepherd.js';
import {TUTORIALS,TUTORIAL_TOPICS,type TutorialTopicId,type TutorialStep} from './tutorial-content';
export {TUTORIAL_TOPICS,type TutorialTopicId,type TutorialTopic} from './tutorial-content';

let activeSession:{tour:Tour;cancel:()=>void}|null=null;
const sidebar=()=>document.querySelector<HTMLElement>('[data-tour="sidebar"] > .overflow-y-auto');
const normalizeShell=()=>{
  // Hidden layout boxes can still be scrolled by scrollIntoView/focus. Only
  // the catalog, canvas viewport and tab strip are intentional scroll areas.
  document.querySelectorAll<HTMLElement>('html,body,#root,#root > div,#root main,[data-tour="sidebar"],.builder-header').forEach(node=>{
    if(node.scrollTop||node.scrollLeft)node.scrollTo({top:0,left:0,behavior:'instant'});
  });
};
const anchor=(step:TutorialStep)=>{
  const node=document.querySelector<HTMLElement>(step.selector);
  return node&&node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden'?node:null;
};
const buttons=(index:number,total:number):StepOptionsButton[]=>[
 {text:'Salir',secondary:true,classes:'lms-tour-exit',action(){void this.cancel();}},
 ...(index?[{text:'Anterior',secondary:true,action(){this.back();}} as StepOptionsButton]:[]),
 {text:index===total-1?'Finalizar':'Siguiente',action(){if(index===total-1)this.complete();else void this.next();}}
];
export const cancelActiveTutorial=()=>{activeSession?.cancel();};

export const startTutorial=(topicId:TutorialTopicId)=>{
  cancelActiveTutorial();
  const definition=TUTORIALS[topicId];if(!definition)return;
  normalizeShell();
  const originalTab=document.querySelector<HTMLElement>('.btn-tab.border-anahuac-orange')?.dataset.target;
  const originalFocus=document.activeElement as HTMLElement|null;
  const scrolls=Array.from(new Set([sidebar(),document.getElementById('scroll-container'),...document.querySelectorAll<HTMLElement>('.project-tabs')].filter((node):node is HTMLElement=>!!node))).map(node=>({node,top:node.scrollTop,left:node.scrollLeft}));
  const details=Array.from(document.querySelectorAll<HTMLDetailsElement>('[data-tour="sidebar"] details')).map(node=>({node,open:node.open}));
  let stopped=false,timer=0;
  const tour=new Shepherd.Tour({
    tourName:`lms-${topicId}`,useModalOverlay:true,keyboardNavigation:true,exitOnEsc:true,
    defaultStepOptions:{
      classes:'lms-shepherd-theme',cancelIcon:{enabled:true,label:'Cerrar tutorial'},canClickTarget:false,
      // Do not scroll document, hidden layout boxes or iframe ancestors.
      scrollTo:false,floatingUIOptions:{strategy:'fixed',middleware:[{
        name:'lms-viewport',fn:({x,y,rects})=>({
          x:Math.max(12,Math.min(x,innerWidth-rects.floating.width-12)),
          y:Math.max(12,Math.min(y,innerHeight-rects.floating.height-12))
        })
      }]},modalOverlayOpeningPadding:8,modalOverlayOpeningRadius:10
    }
  });
  const restore=()=>{
    if(stopped)return;stopped=true;clearTimeout(timer);
    // The library otherwise calls focus() without preventScroll on exit.
    tour.focusedElBeforeOpen=null;
    if(originalTab)window.switchTab?.(originalTab);
    details.forEach(({node,open})=>{if(node.isConnected)node.open=open;});
    const focus=originalFocus?.isConnected&&originalFocus!==document.body?originalFocus:document.querySelector<HTMLElement>('.project-menu-toggle');
    focus?.focus({preventScroll:true});
    scrolls.forEach(({node,top,left})=>{if(node.isConnected)node.scrollTo({top,left,behavior:'instant'});});
    normalizeShell();
    if(activeSession?.tour===tour)activeSession=null;
  };
  const prepare=(step:TutorialStep)=>{
    if(stopped)return;
    const tab=step.tab||definition.tab;if(tab)window.switchTab?.(tab);
    const node=document.querySelector<HTMLElement>(step.selector),scroll=sidebar();
    // Reveal closed catalog categories, never authored accordions.
    if(node&&scroll?.contains(node)){
      let parent=node.parentElement;while(parent&&parent!==scroll){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}
      const r=node.getBoundingClientRect(),bounds=scroll.getBoundingClientRect(),padding=12;
      let top=scroll.scrollTop;
      if(r.height>bounds.height-padding*2||r.top<bounds.top+padding)top+=r.top-bounds.top-padding;
      else if(r.bottom>bounds.bottom-padding)top+=r.bottom-bounds.bottom+padding;
      scroll.scrollTo({top:Math.max(0,Math.min(top,scroll.scrollHeight-scroll.clientHeight)),left:scroll.scrollLeft,behavior:'instant'});
    }
    normalizeShell();
  };
  const topic=TUTORIAL_TOPICS.find(item=>item.id===topicId);
  definition.steps.forEach((step,index)=>tour.addStep({
    id:step.id,title:step.title,
    text:`<span class="lms-tour-topic">${topic?.title||'Tutorial'}</span><p>${step.text}</p><span class="lms-tour-progress">Paso ${index+1} de ${definition.steps.length}</span>`,
    buttons:buttons(index,definition.steps.length),attachTo:{element:()=>anchor(step),on:step.on},
    when:{'before-show':()=>prepare(step),show:()=>normalizeShell()}
  } as StepOptions));
  tour.on('cancel',restore);tour.on('complete',restore);
  activeSession={tour,cancel:()=>{clearTimeout(timer);void tour.cancel();restore();}};
  // React first dismisses the topic picker. Pending starts remain cancellable.
  timer=window.setTimeout(()=>{if(!stopped&&activeSession?.tour===tour)void tour.start().catch(()=>{void tour.cancel();restore();});},120);
  return tour;
};
