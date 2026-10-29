import {flowColorGroups} from './flow-colors';
import type {FlowLaneStyle} from './flow-model';
export const flowLaneStyles:readonly {id:FlowLaneStyle;name:string}[]=[{id:'classic',name:'Clásico'},{id:'rounded',name:'Redondeado'},{id:'outline',name:'Contorno'},{id:'band',name:'Banda'}];
const color=(name:string,index:number)=>flowColorGroups.find(group=>group.name===name)!.colors[index].value;
export const flowLaneCombinations=([
  {id:'lavanda',name:'Lavanda clara',fill:color('Morado',4),stroke:color('Morado',2),textColor:color('Morado',0)},
  {id:'durazno',name:'Durazno claro',fill:color('Naranja',4),stroke:color('Naranja',2),textColor:color('Morado',5)},
  {id:'perla',name:'Perla',fill:color('Gris claro',4),stroke:color('Gris claro',0),textColor:color('Gris oscuro',0)},
  {id:'niebla',name:'Gris niebla',fill:color('Gris oscuro',4),stroke:color('Gris oscuro',2),textColor:color('Gris oscuro',6)}
]as const);
