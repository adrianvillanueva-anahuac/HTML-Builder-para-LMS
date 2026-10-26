export const tableStyles = [
  {id:'standard', name:'Estándar', header:'#f3f4f6', ink:'#374151', line:'#cdd5dc', stripe:'#ffffff', grid:true},
  {id:'striped', name:'Filas alternas', header:'#ffffff', ink:'#374151', line:'#cdd5dc', stripe:'#f3f4f6', grid:false},
  {id:'borderless', name:'Sin bordes', header:'#ffffff', ink:'#374151', line:'#cdd5dc', stripe:'#ffffff', grid:false},
  {id:'anahuac', name:'Anáhuac naranja', header:'#ff5900', ink:'#ffffff', line:'#ff5900', stripe:'#ffffff', grid:true},
  {id:'purple', name:'Encabezado morado', header:'#5d428c', ink:'#ffffff', line:'#cdd5dc', stripe:'#f3eef9', grid:true},
  {id:'soft', name:'Suave naranja', header:'#fff0e7', ink:'#5d428c', line:'#ff5900', stripe:'#fff8f3', grid:false},
  {id:'first-column', name:'Primera columna', header:'#646464', ink:'#ffffff', line:'#cdd5dc', stripe:'#ffffff', grid:true},
] as const;
export function tableStyle(value?:string) {return tableStyles.find(style=>style.id===value)||tableStyles[0];}
export function tableRadius(value:unknown) {
  const number=Number(value);return Number.isFinite(number)?Math.round(Math.min(40,Math.max(0,number))):0;
}

// Visual grid coordinates also work for cells spanning multiple rows/columns.
export function tableCellPositions(rows: readonly (readonly {colSpan:number;rowSpan:number}[])[]) {
  const occupied:boolean[][]=[],positions:{row:number;col:number;rowEnd:number;colEnd:number}[]=[];
  rows.forEach((cells,row)=>{
    let col=0;occupied[row]??=[];
    cells.forEach(cell=>{
      while(occupied[row][col])col++;
      const rowEnd=Math.min(rows.length,row+Math.max(1,cell.rowSpan||rows.length-row)),colEnd=col+Math.max(1,cell.colSpan);
      positions.push({row,col,rowEnd,colEnd});
      for(let r=row;r<rowEnd;r++){occupied[r]??=[];for(let c=col;c<colEnd;c++)occupied[r][c]=true;}
      col=colEnd;
    });
  });
  return {positions,columns:Math.max(0,...positions.map(p=>p.colEnd)),rows:rows.length};
}
