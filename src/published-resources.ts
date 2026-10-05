// Published documents must not depend on temporary browser URLs or local files.
export function imageURL(value: string): string {
  if (/^(data:|blob:|file:)/i.test(value)) throw new Error('Hay una imagen incrustada o local. Sustitúyela por una URL HTTPS pública antes de exportar.');
  const url = new URL(value, location.href);
  if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    const path = url.pathname.match(/\/imagenes\/(.+)$/);
    if (!path) throw new Error('La imagen necesita una dirección pública, no localhost.');
    return 'https://raw.githubusercontent.com/adrianvillanueva-anahuac/HTML-Builder-para-LMS/main/public/imagenes/' + path[1];
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Usa una URL HTTP o HTTPS para la imagen.');
  return url.href;
}

export function externalizeImages(root: ParentNode) {
  root.querySelectorAll('img[src],source[srcset],img[srcset]').forEach(el => {
    if (el.hasAttribute('srcset')) throw new Error('Esta imagen usa srcset. Configura una única URL de imagen para exportarla.');
    const src = el.getAttribute('src'); if (src) el.setAttribute('src', imageURL(src));
  });
  root.querySelectorAll('[style]').forEach(el => {
    const style = el.getAttribute('style')!;
    el.setAttribute('style', style.replace(/url\(["']?([^)'"\s]+)["']?\)/gi, (_, url) => {
      // Existing decorative SVG patterns are source text, not base64 images.
      if (/^data:image\/svg\+xml[;,]/i.test(url) && !/;base64,/i.test(url)) return `url("${url}")`;
      return `url("${imageURL(url)}")`;
    }));
  });
}
