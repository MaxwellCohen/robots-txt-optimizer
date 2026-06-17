<script setup lang="ts">
import type { FetchError, ValidationIssue } from '@robots-txt-optimizer/core'

const emit = defineEmits<{
  analyzeUrl: [url: string]
  analyzeText: [text: string]
}>()

const props = defineProps<{
  loading?: boolean
  fetchError?: FetchError | null
  initialUrl?: string
  initialPastedText?: string
  loadedUrl?: string | null
  loadedText?: string | null
  validationIssues?: ValidationIssue[]
}>()

const url = ref(props.initialUrl ?? '')
const pastedText = ref(props.initialPastedText ?? '')

watch(() => props.initialPastedText, (value) => {
  if (value !== undefined && value !== pastedText.value) {
    pastedText.value = value
  }
})

watch(() => props.loadedText, (value) => {
  if (value !== null && value !== undefined) {
    pastedText.value = value
  }
})

watch(() => props.initialUrl, (value) => {
  if (value) {
    url.value = value
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
    <div class="space-y-4">
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

      <UAlert
        v-if="props.fetchError"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        :title="props.fetchError.message"
      >
        <template #description>
          <p>
            Open
            <a
              :href="props.fetchError.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-current underline"
            >{{ props.fetchError.url }}</a>
            in your browser, copy the robots.txt content, then paste it below to analyze.
          </p>
        </template>
      </UAlert>

      <UFormField label="robots.txt content">
        <RobotsLineNumberTextarea
          v-model="pastedText"
          :rows="12"
          :validation-issues="props.validationIssues ?? []"
          placeholder="User-agent: *
Disallow: /private/"
        />
      </UFormField>
    </div>
  </UCard>
</template>
