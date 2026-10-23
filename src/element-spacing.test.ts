import test from 'node:test';
import assert from 'node:assert/strict';
import {footerSpacingGrowth} from './element-spacing';

test('footer spacing starts at 10+10 and changes both halves additively',()=>{
  assert.equal(footerSpacingGrowth(10,10),0);
  assert.equal(footerSpacingGrowth(10,20),10);
  assert.equal(footerSpacingGrowth(20,10),10);
  assert.equal(footerSpacingGrowth(20,20),20);
  assert.equal(footerSpacingGrowth(30,30),40);
  assert.equal(footerSpacingGrowth(0,0),-20);
});
test('footer spacing clamps each side independently to 0–30 pixels',()=>{
  assert.equal(footerSpacingGrowth(-50,90),10);
  assert.equal(footerSpacingGrowth(Number.NaN,Number.POSITIVE_INFINITY),0);
  assert.equal(footerSpacingGrowth(80,15),25);
});
