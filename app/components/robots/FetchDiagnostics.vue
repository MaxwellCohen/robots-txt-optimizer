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

const severityStyle: Record<FetchDiagnosticSeverity, { color: 'primary' | 'neutral' | 'warning' | 'error', icon: string }> = {
  ok: { color: 'primary', icon: 'i-lucide-check-circle' },
  info: { color: 'neutral', icon: 'i-lucide-info' },
  warning: { color: 'warning', icon: 'i-lucide-alert-triangle' },
  error: { color: 'error', icon: 'i-lucide-x-circle' }
}
</script>

<template>
  <UCard>
    <UCollapsible
      :default-open="hasProblems"
      :unmount-on-hide="false"
    >
      <template #default="{ open }">
        <div
          class="flex w-full cursor-pointer flex-col gap-1"
          role="button"
          tabindex="0"
        >
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-server"
              class="size-5"
            />
            <h2 class="font-semibold">
              Fetch diagnostics
            </h2>
            <UBadge
              :color="hasProblems ? 'warning' : 'primary'"
              variant="subtle"
            >
              HTTP {{ result.status }}
            </UBadge>
            <UIcon
              name="i-lucide-chevron-down"
              class="size-4 text-muted transition-transform duration-200"
              :class="{ 'rotate-180': open }"
            />
          </div>
          <p class="text-sm text-muted">
            How crawlers will treat the response from {{ result.finalUrl || requestedUrl }}
          </p>
        </div>
      </template>

      <template #content>
        <ul class="mt-4 space-y-2 border-t border-default pt-4">
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
      </template>
    </UCollapsible>
  </UCard>
</template>
