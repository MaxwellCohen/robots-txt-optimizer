<script setup lang="ts">
import type { FetchError, ValidationIssue } from '@robots-txt-optimizer/core'
import { getRobotsTemplates } from '@robots-txt-optimizer/core/templates'

const emit = defineEmits<{
  analyzeUrl: [url: string]
}>()

const props = defineProps<{
  loading?: boolean
  fetchError?: FetchError | null
  loadedUrl?: string | null
  validationIssues?: ValidationIssue[]
}>()

const url = defineModel<string>('url', { default: '' })
const pastedText = defineModel<string>('text', { default: '' })

const textPlaceholder = 'User-agent: *\nDisallow: /private/'

function submitUrl() {
  if (url.value.trim()) {
    emit('analyzeUrl', url.value.trim())
  }
}

type RobotsTemplate = ReturnType<typeof getRobotsTemplates>[number]

const pendingTemplate = ref<RobotsTemplate | null>(null)
const confirmOpen = computed({
  get: () => pendingTemplate.value !== null,
  set: (open) => {
    if (!open) {
      pendingTemplate.value = null
    }
  }
})

function applyTemplate(template: RobotsTemplate) {
  pastedText.value = template.text
  pendingTemplate.value = null
}

const templateItems = computed(() => [
  getRobotsTemplates().map(template => ({
    label: template.name,
    description: template.description,
    onSelect: () => {
      if (pastedText.value.trim()) {
        pendingTemplate.value = template
      } else {
        applyTemplate(template)
      }
    }
  }))
])
</script>

<template>
  <div class="rounded-lg overflow-hidden bg-default ring ring-default divide-y divide-default">
    <div class="space-y-4 p-4 sm:p-6">
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
        <template #hint>
          <UDropdownMenu
            :items="templateItems"
            :content="{ align: 'end' }"
            :ui="{ content: 'w-80', itemDescription: 'whitespace-normal' }"
          >
            <UButton
              variant="link"
              size="xs"
              icon="i-lucide-layout-template"
              trailing-icon="i-lucide-chevron-down"
              class="p-0"
            >
              Start from a template
            </UButton>
          </UDropdownMenu>
        </template>
        <RobotsLineNumberTextarea
          v-model="pastedText"
          :rows="12"
          :validation-issues="props.validationIssues ?? []"
          :placeholder="textPlaceholder"
        />
      </UFormField>
    </div>

    <UModal
      v-model:open="confirmOpen"
      title="Replace current content?"
      :description="`This replaces the current content with the ${pendingTemplate?.name ?? ''} template.`"
    >
      <template #footer="{ close }">
        <UButton
          variant="outline"
          color="neutral"
          @click="close"
        >
          Cancel
        </UButton>
        <UButton
          @click="pendingTemplate && applyTemplate(pendingTemplate)"
        >
          Replace
        </UButton>
      </template>
    </UModal>
  </div>
</template>
