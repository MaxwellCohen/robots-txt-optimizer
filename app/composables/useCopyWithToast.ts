import { useClipboard } from '@vueuse/core'

/** Copies text to the clipboard and confirms with a toast. */
export function useCopyWithToast() {
  const { copy } = useClipboard({ legacy: true })
  const toast = useToast()

  return async function copyWithToast(text: string, title = 'Copied to clipboard') {
    await copy(text)
    toast.add({ title, icon: 'i-lucide-check' })
  }
}
