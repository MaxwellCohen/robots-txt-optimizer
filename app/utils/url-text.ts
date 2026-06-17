function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function compressTextForUrl(text: string): Promise<string> {
  const input = new Blob([text])
  const stream = input.stream().pipeThrough(new CompressionStream('gzip'))
  const compressed = await new Response(stream).arrayBuffer()
  return bytesToBase64(new Uint8Array(compressed))
}

export async function decompressTextFromUrl(encoded: string): Promise<string> {
  const bytes = base64ToBytes(encoded)
  const stream = new Blob([Uint8Array.from(bytes)]).stream().pipeThrough(new DecompressionStream('gzip'))
  return await new Response(stream).text()
}
