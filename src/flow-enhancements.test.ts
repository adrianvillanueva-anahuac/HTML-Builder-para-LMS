import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlowModel,normalizeFlowModel,addFlowNode,addFlowEdge,addFlowLane,type FlowSide} from './flow-model';
import {flowSnap,resizeFlowBox,flowEdgeGeometry,flowGumGeometry,type FlowResizeHandle} from './flow-geometry';
import {renderFlowSVG} from './flow-svg';
import {applyFlowSelectionPatch} from './flow-selection';
import {flowLaneCombinations,flowLaneStyles} from './flow-lane-presets';
import {flowContrastRatio,flowRelativeLuminance,isFlowPaletteColor} from './flow-colors';

test('proyectos sin ajuste usan píxeles y conservan extremos de flecha y carril clásico',()=>{
  const model=normalizeFlowModel({nodes:[{id:'a'},{id:'b'}],edges:[{id:'e',from:'a',to:'b'}],lanes:[{id:'lane'}]});
  assert.equal(model.edges[0].startMarker,'arrow');assert.equal(model.edges[0].endMarker,'arrow');assert.equal(model.edges[0].bend,null);
  assert.equal(model.snapMode,'pixels');assert.equal(model.snapSize,10);assert.equal(model.lanes[0].style,'classic');assert.equal(model.lanes[0].fontFamily,'Roboto');assert.equal(model.lanes[0].textPosition,'top');
});
test('normaliza nuevos estilos, posiciones y snapping sin aceptar atributos arbitrarios',()=>{
  const model=normalizeFlowModel({background:'transparent',snapMode:'pixels',snapSize:999,nodes:[{id:'a'},{id:'b'}],edges:[{id:'e',from:'a',to:'b',startMarker:'evil',endMarker:'circle',width:999,bend:{axis:'x',position:99999}}],lanes:[{id:'lane',style:'<script>',fontFamily:'evil" onload="x',textPosition:'middle',textColor:'url(https://evil)'}]});
  assert.equal(model.background,'transparent');assert.equal(model.snapSize,100);assert.equal(model.edges[0].width,24);assert.equal(model.edges[0].bend?.position,1200);assert.equal(model.edges[0].startMarker,'arrow');
  assert.equal(model.lanes[0].style,'classic');assert.equal(model.lanes[0].fontFamily,'Roboto');assert.equal(model.lanes[0].textPosition,'top');assert.equal(model.lanes[0].textColor,'#5d428c');assert.ok(!renderFlowSVG(model).includes('https://evil'));
  assert.equal(normalizeFlowModel({...model,edges:[{...model.edges[0],bend:{axis:'y',position:NaN}}]}).edges[0].bend,null);
});
test('snapping libre, retícula y paso de píxeles producen posiciones reproducibles',()=>{
  const model=createFlowModel();model.snapMode='free';assert.equal(flowSnap(17.5,model),17.5);
  model.snapMode='grid';assert.equal(flowSnap(17.5,model),20);assert.equal(flowSnap(29,model),20);
  model.snapMode='pixels';model.snapSize=7;assert.equal(flowSnap(17.5,model),21);assert.equal(flowSnap(9,model),7);
});
test('ocho tiradores de carril conservan los bordes opuestos y permiten proporción libre',()=>{
  const model=createFlowModel(),start={x:100,y:100,width:300,height:400};model.snapMode='free';
  for(const handle of ['n','ne','e','se','s','sw','w','nw']as FlowResizeHandle[]){
    const result=resizeFlowBox(start,handle,25,35,model);
    if(handle.includes('w'))assert.equal(result.x+result.width,start.x+start.width);else assert.equal(result.x,start.x);
    if(handle.includes('n'))assert.equal(result.y+result.height,start.y+start.height);else assert.equal(result.y,start.y);
    if(!handle.includes('n')&&!handle.includes('s'))assert.equal(result.height,start.height);
    if(!handle.includes('w')&&!handle.includes('e'))assert.equal(result.width,start.width);
  }
  assert.notEqual(resizeFlowBox(start,'se',25,35,model).width/resizeFlowBox(start,'se',25,35,model).height,start.width/start.height);
});
test('redimensionar carriles aplica snapping, mínimos y límites del lienzo',()=>{
  const model=createFlowModel();model.snapMode='grid';
  const result=resizeFlowBox({x:100,y:100,width:300,height:400},'nw',-97,-93,model);
  assert.equal(result.x,0);assert.equal(result.y,0);assert.equal(result.width,400);assert.equal(result.height,500);
  const minimum=resizeFlowBox({x:100,y:100,width:300,height:400},'nw',500,500,model);assert.equal(minimum.width,80);assert.equal(minimum.height,80);
  const maximum=resizeFlowBox({x:100,y:100,width:300,height:400},'se',9999,9999,model);assert.equal(maximum.x+maximum.width,model.width);assert.equal(maximum.y+maximum.height,model.height);
});
test('el tirador ortogonal ajusta su tramo y conserva anclas al mover figuras',()=>{
  const model=createFlowModel(),a=addFlowNode(model,'process',50,50),b=addFlowNode(model,'process',600,300),edge=addFlowEdge(model,a.id,b.id,{fromSide:'right',toSide:'left'})!;
  const initial=flowEdgeGeometry(edge,a,b);assert.ok(initial.bendHandle);assert.equal(initial.bendHandle.axis,'x');
  edge.bend={axis:'x',position:450};const changed=flowEdgeGeometry(edge,a,b);assert.notEqual(initial.path,changed.path);assert.equal(changed.bendHandle?.x,450);assert.deepEqual(initial.start,changed.start);assert.deepEqual(initial.end,changed.end);
  b.y+=100;assert.equal(flowEdgeGeometry(edge,a,b).bendHandle?.x,450);assert.notDeepEqual(flowEdgeGeometry(edge,a,b).end,initial.end);
  edge.route='curve';assert.equal(flowEdgeGeometry(edge,a,b).bendHandle,undefined);edge.route='orthogonal';edge.bend=null;assert.deepEqual(flowEdgeGeometry(edge,a,b).bendHandle?.axis,'x');
});
test('conectores alineados permiten un desvío perpendicular con el tirador',()=>{
  const model=createFlowModel(),a=addFlowNode(model,'process',50,100),b=addFlowNode(model,'process',600,100),edge=addFlowEdge(model,a.id,b.id,{fromSide:'right',toSide:'left'})!;
  assert.equal(flowEdgeGeometry(edge,a,b).bendHandle?.axis,'y');edge.bend={axis:'y',position:300};assert.equal(flowEdgeGeometry(edge,a,b).bendHandle?.y,300);
  const svg=renderFlowSVG(model,{interactive:true,selectedEdgeId:edge.id});assert.ok(svg.includes(`data-flow-bend="${edge.id}"`));assert.ok(!renderFlowSVG(model).includes('data-flow-bend='));
});
test('geometría finita para todos los puertos, solapamientos y recorridos',()=>{
  const model=createFlowModel(),a=addFlowNode(model,'process',100,100),b=addFlowNode(model,'document',100,100);
  for(const fromSide of ['top','right','bottom','left']as FlowSide[])for(const toSide of ['top','right','bottom','left']as FlowSide[])for(const route of ['orthogonal','straight','curve']as const){
    const edge=addFlowEdge(model,a.id,b.id,{fromSide,toSide,route,startArrow:true,startMarker:'gum',endMarker:'gum'})!,geometry=flowEdgeGeometry(edge,a,b),gum=flowGumGeometry(edge,a,b,geometry)!;
    assert.ok(!/NaN|Infinity/.test(geometry.path+gum.path));assert.ok(geometry.samples.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)));
  }
});
test('chicle abraza tres cuartos del lado de cada figura y se estrecha en el centro',()=>{
  const model=createFlowModel(),a=addFlowNode(model,'process',50,100),b=addFlowNode(model,'process',600,300);a.height=120;b.height=180;
  const edge=addFlowEdge(model,a.id,b.id,{fromSide:'right',toSide:'left',startArrow:true,startMarker:'gum',endMarker:'gum',width:2})!;
  const gum=flowGumGeometry(edge,a,b)!;assert.equal(gum.startWidth,90);assert.equal(gum.endWidth,135);assert.equal(gum.waist,2);
  b.height=240;assert.equal(flowGumGeometry(edge,a,b)!.endWidth,180);edge.width=24;a.height=32;assert.ok(flowGumGeometry(edge,a,b)!.waist<flowGumGeometry(edge,a,b)!.startWidth);
});
test('chicle se controla por extremo y combina gradiente con todos los recorridos',()=>{
  const model=createFlowModel(),a=addFlowNode(model,'circle',50,50),b=addFlowNode(model,'document',650,350);
  a.stroke='#ff5900';b.stroke='#5d428c';const edge=addFlowEdge(model,a.id,b.id,{startArrow:true,startMarker:'gum',endMarker:'circle',colorMode:'gradient'})!;
  for(const route of ['orthogonal','straight','curve']as const){edge.route=route;const svg=renderFlowSVG(model);assert.ok(svg.includes('data-flow-gum="true"'));assert.match(svg,/<path data-flow-gum="true"[^>]* fill="url\(#/);assert.ok(svg.includes('data-flow-marker="circle"'));assert.ok(!svg.includes('marker-start='));assert.ok(svg.includes('marker-end='));}
  edge.startArrow=false;assert.equal(flowGumGeometry(edge,a,b),null);assert.ok(!renderFlowSVG(model).includes('data-flow-gum='));
});
test('flecha, círculo y cuadrado escalan con el grosor conservando activación independiente',()=>{
  const model=createFlowModel(),a=addFlowNode(model,'process'),b=addFlowNode(model,'process',600,300),edge=addFlowEdge(model,a.id,b.id,{width:8,startArrow:true,startMarker:'circle',endMarker:'square'})!;
  let svg=renderFlowSVG(model);assert.ok(svg.includes('markerWidth="28"'));assert.ok(svg.includes('data-flow-marker="circle"'));assert.ok(svg.includes('data-flow-marker="square"'));
  edge.endMarker='arrow';svg=renderFlowSVG(model);assert.ok(svg.includes('data-flow-marker="arrow"'));edge.startArrow=false;assert.ok(!renderFlowSVG(model).includes('marker-start='));
});
test('fondo transparente se conserva y la publicación no incorpora la retícula del editor',()=>{
  const model=createFlowModel();model.background='transparent';const a=addFlowNode(model,'process'),b=addFlowNode(model,'process',600,300);addFlowEdge(model,a.id,b.id,{label:'Ejemplo'});
  const svg=renderFlowSVG(model);assert.match(svg,/<rect width="1200" height="720" fill="transparent"[^>]*data-flow-background="true"\/>/);assert.ok(!svg.includes('<pattern'));assert.equal(normalizeFlowModel(JSON.parse(JSON.stringify(model))).background,'transparent');
});
test('cuatro estilos y títulos en cuatro lados usan fuentes institucionales seguras',()=>{
  const model=createFlowModel(),lane=addFlowLane(model);assert.equal(flowLaneStyles.length,4);
  const renders=new Set<string>();for(const {id}of flowLaneStyles){lane.style=id;renders.add(renderFlowSVG(model));}assert.equal(renders.size,4);
  lane.fontFamily='Zilla Slab';lane.textColor='#646464';lane.textPosition='left';let svg=renderFlowSVG(model);assert.ok(svg.includes('rotate(-90'));assert.ok(svg.includes("font-family=\"'Zilla Slab',Georgia,serif\""));assert.ok(svg.includes('fill="#646464"'));
  lane.textPosition='right';assert.ok(renderFlowSVG(model).includes('rotate(90'));lane.textPosition='bottom';assert.ok(!renderFlowSVG(model).includes('rotate('));
  svg=renderFlowSVG(model,{interactive:true,selectedLaneId:lane.id});assert.equal((svg.match(/data-flow-lane-resize=/g)||[]).length,8);assert.ok(!renderFlowSVG(model).includes('data-flow-lane-resize='));
});
test('cuatro combinaciones de carril son claras, institucionales y legibles',()=>{
  assert.equal(flowLaneCombinations.length,4);assert.equal(new Set(flowLaneCombinations.map(value=>value.fill)).size,4);
  for(const preset of flowLaneCombinations){assert.ok(flowRelativeLuminance(preset.fill)>.65);assert.ok(flowContrastRatio(preset.fill,preset.textColor)>=4.5);for(const key of ['fill','stroke','textColor']as const)assert.ok(isFlowPaletteColor(preset[key]));}
});
test('lote de carriles y conectores mantiene nuevas opciones sin tocar contenido ni extremos',()=>{
  const model=createFlowModel(),a=addFlowNode(model,'process'),b=addFlowNode(model,'process',600,300),lane=addFlowLane(model),lane2=addFlowLane(model),edge=addFlowEdge(model,a.id,b.id)!;
  applyFlowSelectionPatch(model,{kind:'lane',ids:[lane.id,lane2.id]},{style:'rounded',fontFamily:'Lato',textPosition:'right',textColor:'#646464'});
  applyFlowSelectionPatch(model,{kind:'edge',ids:[edge.id]},{startMarker:'gum',startArrow:true,endMarker:'square',bend:{axis:'x',position:400},width:12});
  assert.equal(lane.style,'rounded');assert.equal(lane2.fontFamily,'Lato');assert.equal(edge.from,a.id);assert.equal(edge.to,b.id);assert.equal(edge.width,12);assert.equal(model.nodes.length,2);assert.equal(a.x,80);
  assert.deepEqual(normalizeFlowModel(JSON.parse(JSON.stringify(model))),model);
});
test('tiradores de carril y doblez están en la capa superior sobre figuras y conectores',()=>{
  const model=createFlowModel(),lane=addFlowLane(model),a=addFlowNode(model,'process'),b=addFlowNode(model,'process',600,300),edge=addFlowEdge(model,a.id,b.id)!;
  const svg=renderFlowSVG(model,{interactive:true,selectedLaneId:lane.id,selectedEdgeId:edge.id});
  assert.ok(svg.indexOf('data-flow-lane-resize=')>svg.lastIndexOf('data-flow-node='));assert.ok(svg.indexOf('data-flow-bend=')>svg.lastIndexOf('data-flow-node='));
});
