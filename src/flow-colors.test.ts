import test from 'node:test';
import assert from 'node:assert/strict';
import {tabPalette} from './project-model';
import {flowColorGroups,flowPaletteColors,flowShapeCombinations,normalizeFlowHex,mixFlowHex,flowRelativeLuminance,flowContrastRatio,isFlowPaletteColor} from './flow-colors';

test('cada color institucional conserva su token y ofrece cuatro claros y cuatro oscuros',()=>{
  assert.equal(flowColorGroups.length,5);
  for(const source of tabPalette){
    const group=flowColorGroups.find(item=>item.name===source.name)!;
    assert.equal(group.base,source.colors[0]);assert.equal(group.colors.length,9);
    assert.equal(group.colors[0].value,group.base);
    assert.equal(new Set(group.colors.map(color=>color.value)).size,9);
    const baseLuminance=flowRelativeLuminance(group.base);
    for(let index=1;index<=4;index++){
      assert.ok(flowRelativeLuminance(group.colors[index].value)>baseLuminance);
      assert.ok(flowRelativeLuminance(group.colors[index+4].value)<baseLuminance);
      if(index>1){
        assert.ok(flowRelativeLuminance(group.colors[index].value)>flowRelativeLuminance(group.colors[index-1].value));
        assert.ok(flowRelativeLuminance(group.colors[index+4].value)<flowRelativeLuminance(group.colors[index+3].value));
      }
    }
  }
});

test('blanco y negro son neutros únicos y la lista final no duplica valores',()=>{
  const neutrals=flowColorGroups.find(group=>group.name==='Neutros')!;
  assert.deepEqual(neutrals.colors.map(color=>color.value),['#ffffff','#000000']);
  assert.equal(flowPaletteColors.length,38);
  assert.equal(new Set(flowPaletteColors).size,flowPaletteColors.length);
  assert.ok(flowColorGroups.flatMap(group=>group.colors).every(color=>/^#[0-9a-f]{6}$/.test(color.value)&&color.label.trim()));
  assert.ok(Object.isFrozen(flowColorGroups)&&Object.isFrozen(flowPaletteColors)&&flowColorGroups.every(group=>Object.isFrozen(group.colors)));
});

test('normaliza hexadecimal opaco y rechaza texto CSS o canales alfa',()=>{
  assert.equal(normalizeFlowHex(' #F90 '),'#ff9900');assert.equal(normalizeFlowHex('#ABCDEF'),'#abcdef');
  for(const bad of [null,42,'red','transparent','none','#12','#gggggg','#ff590080','rgb(255,89,0)','url(javascript:alert(1))'])assert.equal(normalizeFlowHex(bad),null);
  assert.equal(isFlowPaletteColor('#FFF'),true);assert.equal(isFlowPaletteColor(' #5D428C '),true);
  assert.equal(isFlowPaletteColor('#123456'),false);assert.equal(isFlowPaletteColor('red'),false);
});

test('mezclas institucionales reproducibles sin salir del rango de canales',()=>{
  assert.equal(mixFlowHex('#ff5900','#ffffff',.2),'#ff7a33');
  assert.equal(mixFlowHex('#5d428c','#000000',.2),'#4a3570');
  assert.equal(mixFlowHex('#fff','#000',0),'#ffffff');assert.equal(mixFlowHex('#fff','#000',1),'#000000');
  assert.equal(mixFlowHex('#fff','#000',-1),'#ffffff');assert.equal(mixFlowHex('#fff','#000',2),'#000000');
  assert.throws(()=>mixFlowHex('red','#fff',.5),TypeError);assert.throws(()=>mixFlowHex('#fff','#000',NaN),TypeError);
});

test('contraste relativo canónico, simétrico y sin certificación para entradas desconocidas',()=>{
  assert.equal(flowRelativeLuminance('#000000'),0);assert.equal(flowRelativeLuminance('#ffffff'),1);
  assert.equal(flowContrastRatio('#000','#fff'),21);assert.equal(flowContrastRatio('#fff','#fff'),1);
  assert.equal(flowContrastRatio('#ff5900','#000000'),flowContrastRatio('#000000','#ff5900'));
  assert.equal(flowContrastRatio('transparent','#ffffff'),0);assert.throws(()=>flowRelativeLuminance('red'),TypeError);
});

test('ocho combinaciones nombradas usan solo la paleta extendida con texto legible',()=>{
  assert.equal(flowShapeCombinations.length,8);
  assert.equal(new Set(flowShapeCombinations.map(combination=>combination.id)).size,8);
  assert.equal(new Set(flowShapeCombinations.map(combination=>combination.name)).size,8);
  assert.equal(new Set(flowShapeCombinations.map(({fill,stroke,textColor})=>[fill,stroke,textColor].join(':'))).size,8);
  for(const combination of flowShapeCombinations){
    assert.ok(combination.id&&combination.name.trim());
    assert.ok([combination.fill,combination.stroke,combination.textColor].every(isFlowPaletteColor));
    assert.ok(flowContrastRatio(combination.fill,combination.textColor)>=4.5,`${combination.name}: contraste insuficiente`);
  }
  const orange=flowShapeCombinations.find(combination=>combination.id==='naranja-institucional')!;
  assert.equal(orange.textColor,'#000000');
  assert.ok(flowContrastRatio(orange.fill,'#ffffff')<4.5);
});
