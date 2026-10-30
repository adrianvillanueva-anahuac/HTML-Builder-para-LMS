import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultOverflowPanel,moveOverflowButton,normalizeModularOverflow} from './modular-overflow-model';
test('overflow is individual and opt-in, including legacy global clipping',()=>{
 const a=normalizeModularOverflow(undefined,['primary','text-1']),b=normalizeModularOverflow(undefined);
 assert.equal(a.enabled,false);assert.deepEqual(a.boxIds,['primary','text-1']);a.boxIds.pop();assert.deepEqual(b.boxIds,['primary']);
});
test('configuration removes deleted and duplicate text ids and rejects hostile styling',()=>{
 const value=normalizeModularOverflow({enabled:'true',boxIds:['primary','text-2','primary','<img>'],panel:{fill:'url(javascript:x)',style:'evil',opacity:-9,dim:9,width:Infinity,height:1,x:99,blur:88}},['primary']);
 assert.equal(value.enabled,false);assert.deepEqual(value.boxIds,['primary']);assert.equal(value.panel.fill,'#ffffff');assert.equal(value.panel.style,'normal');assert.equal(value.panel.opacity,0);assert.equal(value.panel.dim,.85);assert.equal(value.panel.width,380);assert.equal(value.panel.height,120);assert.equal(value.panel.x,1);assert.equal(value.panel.blur,24);
});
test('selected content, appearance and independent button position survive JSON round trip',()=>{
 for(const style of ['normal','dialogue','thought','hologram']){const value=normalizeModularOverflow({enabled:true,boxIds:['text-1'],button:{x:.2,y:.8},panel:{style,fill:'#ff5900',opacity:.45,blur:9,dim:.3,width:540,height:440,radius:35}},['primary','text-1']);assert.deepEqual(normalizeModularOverflow(JSON.parse(JSON.stringify(value)),['primary','text-1']),value);}
});
test('reset returns a fresh regular design without retaining previous style changes',()=>{
 const a=defaultOverflowPanel();a.fill='#000000';a.width=900;assert.equal(defaultOverflowPanel().fill,'#ffffff');assert.equal(defaultOverflowPanel().width,380);
});
test('button centers cannot move outside their rectangle, even smaller than the button',()=>{
 for(const [width,height]of [[300,200],[30,10],[1,1]])for(const x of [-100,0,.5,1,100])for(const y of [-100,0,.5,1,100]){const next=moveOverflowButton(x,y,width,height,46,22);assert.ok(next.x>=0&&next.x<=1&&next.y>=0&&next.y<=1);if(width>=46)assert.ok(next.x*width>=23&&(1-next.x)*width>=23-1e-8);if(height>=22)assert.ok(next.y*height>=11-1e-8&&(1-next.y)*height>=11-1e-8);}
});

test('overflow text geometry is independent, safe and survives a project round trip',()=>{
 const result=normalizeModularOverflow({enabled:true,textLayouts:{primary:{x:.2,y:.3,width:.5,height:.25},'text-1':{x:999,y:-9,width:2,height:-3},deleted:{x:0,y:0,width:1,height:1}}},['primary','text-1']);
 assert.deepEqual(result.textLayouts?.primary,{x:.2,y:.3,width:.5,height:.25});
 assert.deepEqual(result.textLayouts?.['text-1'],{x:0,y:0,width:1,height:.02});
 assert.equal(result.textLayouts?.deleted,undefined);
 assert.deepEqual(normalizeModularOverflow(JSON.parse(JSON.stringify(result)),['primary','text-1']),result);
 assert.equal(normalizeModularOverflow(undefined).textLayouts,undefined);
});
