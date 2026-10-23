import test from 'node:test';
import assert from 'node:assert/strict';
import {buttonQuickIcons,iconCatalog,iconDisplayName} from './icon-catalog';
import {materialIconSVG,materialIconVectors} from './material-icon-vectors';

test('every catalog icon and quick choice has a bundled LMS-safe vector',()=>{
  const names=new Set([...Object.values(iconCatalog).flat(),...buttonQuickIcons.map(([name])=>name)].filter(Boolean));
  assert.equal(Object.keys(iconCatalog).length,8);assert.equal(names.size,110);
  for(const name of names){assert.ok(materialIconVectors[name],name);assert.match(materialIconSVG(name),/^<svg /,name);}
});
test('bundled icons need neither external fonts nor remote resources',()=>{
  for(const name of Object.keys(materialIconVectors)){
    const svg=materialIconSVG(name);assert.ok(svg.includes('fill="currentColor"'));
    assert.doesNotMatch(svg,/<(?:script|image|use|foreignObject)\b|\bon\w+\s*=|\bhref\s*=/i);
  }
  assert.equal(materialIconSVG('not_a_catalog_icon'),'');
  assert.equal(materialIconSVG('constructor'),'');
});
test('current icon labels preserve quick labels, full names and the no-icon choice',()=>{
  assert.equal(iconDisplayName(''),'Sin icono');assert.equal(iconDisplayName('menu_book'),'Libro');assert.equal(iconDisplayName('rocket_launch'),'rocket launch');
});
