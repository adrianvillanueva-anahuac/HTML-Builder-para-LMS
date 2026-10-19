// Match the editor's existing LMS width; shrink naturally inside narrower hosts.
export function prepareExportPageLayout(root:HTMLElement) {
  root.removeAttribute('id');root.removeAttribute('data-tour');
  root.className='anahuac-builder-export parallax-container';
  Object.assign(root.style,{position:'relative',boxSizing:'border-box',width:'100%',maxWidth:'850px',minWidth:'0',height:'auto',minHeight:'0',margin:'0 auto',display:'flex',flexDirection:'column',isolation:'isolate'});
  const canvas=root.querySelector<HTMLElement>('#canvas');
  if(canvas){
    // The editor's 2px dashed outline occupies space. Keep that space, not the ink.
    Object.assign(canvas.style,{boxSizing:'border-box',width:'100%',minWidth:'0',height:'auto',minHeight:'0',flex:'none',border:'2px solid transparent'});
  }
}
