<script setup lang="ts">
import type { FetchResult } from '@robots-txt-optimizer/core'
import { diagnoseFetch, type FetchDiagnosticSeverity } from '@robots-txt-optimizer/core/fetch'

const props = defineProps<{
  result: FetchResult
  requestedUrl?: string | null
}>()

const diagnostics = computed(() => diagnoseFetch(props.result, props.requestedUrl ?? undefined))

const hasProblems = computed(() =>
  diagnostics.value.some(d => d.severity === 'error' || d.severity === 'warning')
)

const severityStyle: Record<FetchDiagnosticSeverity, { icon: string }> = {
  ok: { icon: 'i-lucide-check-circle' },
  info: { icon: 'i-lucide-info' },
  warning: { icon: 'i-lucide-alert-triangle' },
  error: { icon: 'i-lucide-x-circle' }
}
</script>

<template>
  <RobotsCollapsibleCard
    icon="i-lucide-server"
    title="Fetch diagnostics"
    :description="`How crawlers will treat the response from ${result.finalUrl || requestedUrl}`"
    :default-open="hasProblems"
  >
    <template #badge>
      <UBadge
        :color="hasProblems ? 'warning' : 'primary'"
        variant="subtle"
      >
        HTTP {{ result.status }}
      </UBadge>
    </template>

    <ul class="space-y-2">
      <li
        v-for="(diagnostic, index) in diagnostics"
        :key="index"
        class="flex items-start gap-3 rounded-lg border border-default p-3 text-sm"
      >
        <UIcon
          :name="severityStyle[diagnostic.severity].icon"
          class="mt-0.5 size-4 shrink-0"
          :class="{
            'text-primary': diagnostic.severity === 'ok',
            'text-muted': diagnostic.severity === 'info',
            'text-warning': diagnostic.severity === 'warning',
            'text-error': diagnostic.severity === 'error'
          }"
        />
        <div>
          <p class="font-medium">
            {{ diagnostic.title }}
          </p>
          <p class="text-muted">
            {{ diagnostic.detail }}
          </p>
        </div>
      </li>
    </ul>
  </RobotsCollapsibleCard>
</template>
