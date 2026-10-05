/** Keep Latin for future student input, plus scripts used by the authored text. */
export function necessaryFontFaces(css: string, text: string): string {
  const points = new Set(Array.from(text).map(char => char.codePointAt(0)!).filter(point => point >= 32));
  for (let point = 32; point <= 255; point++) points.add(point);
  return css.replace(/@font-face\s*\{[^}]*\}/g, face => {
    const ranges = face.match(/unicode-range\s*:\s*([^;]+)/i)?.[1];
    if (!ranges) return face;
    const needed = ranges.split(',').some(range => {
      const match = range.trim().match(/^U\+([\da-f?]+)(?:-([\da-f]+))?$/i);
      if (!match) return true;
      const start = parseInt(match[1].replace(/\?/g, '0'), 16);
      const end = parseInt(match[2] || match[1].replace(/\?/g, 'f'), 16);
      return Array.from(points).some(point => point >= start && point <= end);
    });
    return needed ? face : '';
  });
}
