import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activateAllCells,createModular,removeCell,removeLastTrack} from './modular-model';
import {alignBadges,createBadge,normalizeBadge,perimeterPoint,projectToPerimeter,stepPerimeter} from './modular-badges-model';

test('figuras del perímetro: tres formas, valores seguros y modelos antiguos compatibles',()=>{
  for(const shape of ['circle','rounded','hexagon'] as const){
    const badge=createBadge(shape);assert.equal(badge.shape,shape);
    assert.deepEqual(badge.position,{edge:'top',offset:.5});assert.equal(badge.scale,1);
    assert.deepEqual(normalizeBadge(badge),badge);
  }
  assert.equal(normalizeBadge(undefined),undefined);assert.equal(normalizeBadge({shape:'__proto__'}),undefined);
  assert.deepEqual(normalizeBadge({shape:'circle',color:'url(x)',scale:Infinity,position:{edge:'oops',offset:NaN},text:42}),createBadge('circle'));
  assert.equal(normalizeBadge({...createBadge('circle'),scale:99})!.scale,2);
  assert.equal(normalizeBadge({...createBadge('circle'),scale:-1})!.scale,.5);
});
test('proyección al borde más cercano, dentro o fuera de rectángulos de cualquier tamaño',()=>{
  assert.deepEqual(projectToPerimeter(70,10,200,100),{edge:'top',offset:.35});
  assert.deepEqual(projectToPerimeter(198,65,200,100),{edge:'right',offset:.65});
  assert.deepEqual(projectToPerimeter(120,90,200,100),{edge:'bottom',offset:.6});
  assert.deepEqual(projectToPerimeter(-200,30,200,100),{edge:'left',offset:.3});
  for(const [width,height] of [[40,800],[800,40],[200,100],[1,1]]){
    for(let x=-50;x<=width+50;x+=17)for(let y=-50;y<=height+50;y+=19){
      const position=projectToPerimeter(x,y,width,height),p=perimeterPoint(position,width,height);
      assert.ok(p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height);
      assert.ok(p.x===0||p.x===width||p.y===0||p.y===height);
    }
  }
  assert.ok(Number.isFinite(projectToPerimeter(NaN,Infinity,0,0).offset));
});
test('la posición proporcional conserva el borde al cambiar dimensiones',()=>{
  for(const edge of ['top','right','bottom','left'] as const){
    const a=perimeterPoint({edge,offset:.32},200,100),b=perimeterPoint({edge,offset:.32},700,300);
    assert.equal(a.x/200,b.x/700);assert.equal(a.y/100,b.y/300);
  }
});
test('posición conjunta y manual: la última acción gana sin enlazar objetos',()=>{
  const m=createModular(2,2);activateAllCells(m);
  m.cells['0:0'].badge=createBadge('circle');m.cells['1:1'].badge=createBadge('hexagon');
  alignBadges(m,{edge:'right',offset:.7});
  assert.deepEqual(m.cells['0:0'].badge.position,{edge:'right',offset:.7});
  assert.notEqual(m.cells['0:0'].badge.position,m.cells['1:1'].badge.position);
  m.cells['0:0'].badge.position={edge:'left',offset:.2};
  assert.deepEqual(m.cells['1:1'].badge.position,{edge:'right',offset:.7});
  alignBadges(m,{edge:'bottom',offset:.4});
  assert.deepEqual(m.cells['0:0'].badge.position,{edge:'bottom',offset:.4});
  assert.equal(m.cells['0:1'].badge,undefined);
});
test('teclado recorre las cuatro caras y cruza esquinas en ambos sentidos',()=>{
  const next=stepPerimeter({edge:'top',offset:.9},.2);
  assert.equal(next.edge,'right');assert.ok(Math.abs(next.offset-.1)<1e-12);
  const previous=stepPerimeter({edge:'top',offset:0},-.25);
  assert.deepEqual(previous,{edge:'left',offset:.25});
  let p={edge:'top' as const,offset:.5};
  for(let i=0;i<16;i++)p=stepPerimeter(p,.25) as typeof p;
  assert.deepEqual(p,{edge:'top',offset:.5});
});
test('figuras, texto enriquecido y escala sobreviven a JSON; eliminación no deja huérfanos',()=>{
  const m=createModular(2,2);activateAllCells(m);
  const badge=createBadge('rounded');badge.html='<b>01</b>';badge.text='01';badge.textStyle='font-family: Lato;';badge.scale=1.3;
  m.cells['1:1'].badge=badge;m.cells['0:0'].badge=createBadge('circle');
  assert.deepEqual(JSON.parse(JSON.stringify(m)),m);
  removeLastTrack(m,'column');assert.equal(Object.values(m.cells).filter(c=>c.badge).length,1);
  removeCell(m,'0:0');assert.equal(Object.values(m.cells).filter(c=>c.badge).length,0);
});
