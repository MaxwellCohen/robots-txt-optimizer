// Browser-only helpers: they rely on CompressionStream/DecompressionStream and are
// only called from client-side code (mounted hooks, debounced URL sync).
function assertClient() {
  if (!import.meta.client) {
    throw new Error('url-text helpers are only available in the browser')
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function base64UrlToBytes(encoded: string): Uint8Array<ArrayBuffer> {
  // Also accepts legacy standard-base64 links ('+' may arrive as a space in query strings).
  const base64 = encoded.replaceAll('-', '+').replaceAll('_', '/').replaceAll(' ', '+')
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0))
}

export async function compressTextForUrl(text: string): Promise<string> {
  assertClient()
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  return bytesToBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()))
}

export async function decompressTextFromUrl(encoded: string): Promise<string> {
  assertClient()
  const stream = new Blob([base64UrlToBytes(encoded)]).stream().pipeThrough(new DecompressionStream('gzip'))
  return await new Response(stream).text()
}
