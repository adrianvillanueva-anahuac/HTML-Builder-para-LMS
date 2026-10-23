import test from 'node:test';
import assert from 'node:assert/strict';
import {fullCrop,normalizeCrop,resizeCrop,cropForAspect,imageAdjustments,imageFilter,imageTextLayout} from './image-model';
test('los ocho tiradores conservan el borde opuesto y no fijan la proporción',()=>{
  const crop={x:.2,y:.2,width:.6,height:.6};
  for(const handle of ['nw','n','ne','e','se','s','sw','w']){
    const next=resizeCrop(crop,handle,.05,.1);
    assert.ok(next.x>=0&&next.y>=0&&next.x+next.width<=1&&next.y+next.height<=1);
    if(!handle.includes('w'))assert.equal(next.x,crop.x);
    if(!handle.includes('n'))assert.equal(next.y,crop.y);
    if(!handle.includes('e'))assert.ok(Math.abs(next.x+next.width-.8)<1e-9);
    if(!handle.includes('s'))assert.ok(Math.abs(next.y+next.height-.8)<1e-9);
  }
  assert.notEqual(resizeCrop(crop,'se',.1,-.1).width/resizeCrop(crop,'se',.1,-.1).height,1);
});
test('recorte y movimiento permanecen dentro de la imagen con tamaño mínimo',()=>{
  for(const h of ['nw','n','ne','e','se','s','sw','w','move'])for(const dx of [-10,10]){
    const next=resizeCrop({x:.2,y:.2,width:.5,height:.5},h,dx,-dx);
    assert.ok(next.width>=.02-1e-9&&next.height>=.02-1e-9);
    assert.ok(next.x>=0&&next.y>=0&&next.x+next.width<=1+1e-9&&next.y+next.height<=1+1e-9);
  }
});
test('proporciones predefinidas y original corresponden a las dimensiones naturales',()=>{
  for(const target of [1,16/9,4/3]){
    const crop=cropForAspect(2,target);assert.ok(Math.abs(2*crop.width/crop.height-target)<1e-9);
  }
  assert.deepEqual(cropForAspect(2,0),fullCrop);
});
test('ajustes son no destructivos, acotados y serializables',()=>{
  const s=imageAdjustments({hue:999,contrast:-1,brightness:140,saturation:80,tintHue:34,tint:999});
  assert.equal(s.hue,180);assert.equal(s.contrast,0);assert.equal(s.tint,100);
  assert.equal(imageFilter(s),'hue-rotate(180deg) contrast(0%) brightness(140%) saturate(80%)');
  assert.deepEqual(imageAdjustments(JSON.parse(JSON.stringify(s))),s);
  assert.deepEqual(normalizeCrop(JSON.parse(JSON.stringify(fullCrop))),fullCrop);
});
test('los controles del texto mantienen márgenes, tamaño y posición dentro del marco',()=>{
  const t=imageTextLayout({margin:200,x:-2,y:999,width:400,size:0});
  assert.deepEqual(t,{margin:25,x:0,y:100,width:100,size:10});
  assert.equal(imageTextLayout().margin,5);
});
