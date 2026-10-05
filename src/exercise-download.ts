// A self-contained download target, never a fragment pointing at the LMS page.
// Percent encoding is not base64. No script execution is needed to follow it.
export function exerciseDownloadURL(html: string): string {
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
}
