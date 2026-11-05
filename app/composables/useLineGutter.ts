import type { MaybeRefOrGetter } from 'vue'

/** Shared line-number gutter logic for the line-numbered text components. */
export function useLineGutter(text: MaybeRefOrGetter<string>) {
  const lineCount = computed(() => toValue(text).split('\n').length)

  const lineNumbers = computed(() =>
    Array.from({ length: lineCount.value }, (_, index) => index + 1).join('\n')
  )

  /** Mirrors the vertical scroll position of the event target onto the given elements. */
  function syncScroll(event: Event, ...targets: Array<HTMLElement | null | undefined>) {
    const { scrollTop } = event.target as HTMLElement
    for (const target of targets) {
      if (target) {
        target.scrollTop = scrollTop
      }
    }
  }

  return { lineCount, lineNumbers, syncScroll }
}
