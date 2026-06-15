<script setup lang="ts">
import type { PathVerdict } from '#shared/robots/types'

const props = defineProps<{
  verdicts: PathVerdict[]
}>()

const columns = [
  { accessorKey: 'userAgent', header: 'User-agent' },
  { accessorKey: 'path', header: 'Path' },
  { accessorKey: 'verdict', header: 'Verdict' },
  { accessorKey: 'matchedRule', header: 'Matched rule' }
]

const tableData = computed(() =>
  props.verdicts.map(v => ({
    userAgent: v.userAgent,
    path: v.path,
    verdict: v.allowed ? 'Allowed' : 'Blocked',
    verdictColor: (v.allowed ? 'success' : 'error') as 'success' | 'error',
    matchedRule: v.matchingLine > 0
      ? `Line ${v.matchingLine}: ${v.matchedRuleType} ${v.matchedRule}`
      : v.matchedRule
  }))
)
</script>

<template>
  <UCard>
    <UCollapsible
      :default-open="true"
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
              name="i-lucide-route"
              class="size-5"
            />
            <h2 class="font-semibold">
              Path simulation
            </h2>
            <UIcon
              name="i-lucide-chevron-down"
              class="size-4 text-muted transition-transform duration-200"
              :class="{ 'rotate-180': open }"
            />
          </div>
          <p class="text-sm text-muted">
            Simulated against common paths on example.com
          </p>
        </div>
      </template>

      <template #content>
        <div class="mt-4 border-t border-default pt-4">
          <UTable
            :data="tableData"
            :columns="columns"
          >
            <template #verdict-cell="{ row }">
              <UBadge
                :color="row.original.verdictColor"
                variant="subtle"
              >
                {{ row.original.verdict }}
              </UBadge>
            </template>
          </UTable>
        </div>
      </template>
    </UCollapsible>
  </UCard>
</template>
