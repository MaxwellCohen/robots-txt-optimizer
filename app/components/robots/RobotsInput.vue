<script setup lang="ts">
const emit = defineEmits<{
  analyzeUrl: [url: string]
  analyzeText: [text: string]
}>()

const props = defineProps<{
  loading?: boolean
  fetchError?: string | null
}>()

const tab = ref('url')
const url = ref('')
const pastedText = ref('')

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
