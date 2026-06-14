<script setup lang="ts">
const emit = defineEmits<{
  analyzeUrl: [url: string]
  analyzeText: [text: string]
  updateLoadedText: [text: string]
}>()

const props = defineProps<{
  loading?: boolean
  fetchError?: string | null
  initialUrl?: string
  loadedUrl?: string | null
  loadedText?: string | null
}>()

const tab = ref('url')
const url = ref(props.initialUrl ?? '')
const pastedText = ref('')
const previewText = ref('')

watch(() => props.loadedText, (value) => {
  previewText.value = value ?? ''
})

watch(previewText, (value) => {
  if (props.loadedText === null) {
    return
  }
  if (value === props.loadedText) {
    return
  }
  emit('updateLoadedText', value)
})

watch(() => props.initialUrl, (value) => {
  if (value) {
    url.value = value
    tab.value = 'url'
  }
})

function submitUrl() {
  if (url.value.trim()) {
    emit('analyzeUrl', url.value.trim())
  }
}

watch(pastedText, (value) => {
  emit('analyzeText', value)
})
</script>

<template>
  <UCard>
    <UTabs
      v-model="tab"
      :items="[
        { label: 'From URL', value: 'url', icon: 'i-lucide-globe' },
        { label: 'Paste text', value: 'paste', icon: 'i-lucide-file-text' }
      ]"
      class="w-full"
    >
      <template #content="{ item }">
        <div
          v-if="item.value === 'url'"
          class="space-y-4 pt-2"
        >
          <UFormField
            label="Website URL"
            hint="We'll fetch /robots.txt from this site"
          >
            <div class="flex gap-2">
              <UInput
                v-model="url"
                placeholder="example.com"
                class="flex-1"
                @keyup.enter="submitUrl"
              />
              <UButton
                :loading="props.loading"
                icon="i-lucide-search"
                @click="submitUrl"
              >
                Analyze
              </UButton>
            </div>
          </UFormField>
          <p
            v-if="props.loadedUrl"
            class="text-sm text-muted"
          >
            Loaded
            <a
              :href="props.loadedUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary hover:underline"
            >{{ props.loadedUrl }}</a>
          </p>
          <UFormField
            v-if="props.loadedUrl"
            label="robots.txt preview"
          >
            <UTextarea
              v-model="previewText"
              :rows="12"
              class="font-mono text-sm w-full"
            />
          </UFormField>
          <UAlert
            v-if="props.fetchError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-circle"
            :title="props.fetchError"
          />
        </div>

        <div
          v-else
          class="space-y-2 pt-2"
        >
          <UFormField label="robots.txt content">
            <UTextarea
              v-model="pastedText"
              :rows="12"
              placeholder="User-agent: *
Disallow: /private/"
              class="font-mono text-sm w-full"
            />
          </UFormField>
        </div>
      </template>
    </UTabs>
  </UCard>
</template>
