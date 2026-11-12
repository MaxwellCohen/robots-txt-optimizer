/** Thrown by `readBodyCapped` when the body exceeds the byte limit. */
export class BodyTooLargeError extends Error {
  readonly maxBytes: number

  constructor(maxBytes: number) {
    super(`Response body is larger than ${maxBytes} bytes`)
    this.name = 'BodyTooLargeError'
    this.maxBytes = maxBytes
  }
}

/**
 * Reads a response body as bytes, cancelling the stream once `maxBytes` is
 * exceeded or `signal` aborts (so a stalled body cannot hang the caller).
 */
export async function readBodyCapped(response: Response, maxBytes: number, signal?: AbortSignal): Promise<Uint8Array> {
  const reader = response.body?.getReader()
  if (!reader) {
    return new Uint8Array()
  }
  const onAbort = () => {
    reader.cancel().catch(() => {})
  }
  signal?.addEventListener('abort', onAbort, { once: true })
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (signal?.aborted) {
        throw signal.reason ?? new DOMException('The operation was aborted', 'AbortError')
      }
      if (done) {
        break
      }
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        throw new BodyTooLargeError(maxBytes)
      }
      chunks.push(value)
    }
  } finally {
    signal?.removeEventListener('abort', onAbort)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}
