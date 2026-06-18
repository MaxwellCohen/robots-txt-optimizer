<script setup lang="ts">
import {
  collectUserAgentOptions,
  normalizeSimulationPath,
  SIMULATION_PATH_DELIMITER,
  simulatePaths,
  SIMULATION_ORIGIN,
  type RobotsDocument,
  type SimulationConfig
} from '@robots-txt-optimizer/core'

const props = defineProps<{
  document: RobotsDocument
  config: SimulationConfig
}>()

const emit = defineEmits<{
  'update:config': [config: SimulationConfig]
}>()

const userAgentOptions = computed(() =>
  collectUserAgentOptions(props.document, props.config.userAgents)
)

const selectedUserAgents = computed({
  get: () => props.config.userAgents,
  set: (userAgents: string[]) => {
    if (userAgents.length === 0) {
      return
    }
    emit('update:config', { ...props.config, userAgents })
  }
})

function onCreateUserAgent(agent: string) {
  const trimmed = agent.trim()
  if (!trimmed || props.config.userAgents.includes(trimmed)) {
    return
  }
  emit('update:config', {
    ...props.config,
    userAgents: [...props.config.userAgents, trimmed]
  })
}

const paths = computed({
  get: () => props.config.paths,
  set: (nextPaths: string[]) => {
    const normalized = nextPaths.map(normalizeSimulationPath).filter(Boolean)
    if (normalized.length === 0) {
      return
    }
    emit('update:config', { ...props.config, paths: normalized })
  }
})

const verdicts = computed(() =>
  simulatePaths(props.document, props.config.userAgents, props.config.paths)
)

const columns = [
  { accessorKey: 'userAgent', header: 'User-agent' },
  { accessorKey: 'path', header: 'Path' },
  { accessorKey: 'verdict', header: 'Verdict' },
  { accessorKey: 'matchedRule', header: 'Matched rule' }
]

const tableData = computed(() =>
  verdicts.value.map(v => ({
    userAgent: v.userAgent,
    path: v.path,
    verdict: v.allowed ? 'Allowed' : 'Blocked',
    verdictColor: (v.allowed ? 'primary' : 'error') as 'primary' | 'error',
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
            Test paths against user-agents on {{ SIMULATION_ORIGIN }}
          </p>
        </div>
      </template>

      <template #content>
        <div class="mt-4 space-y-4 border-t border-default pt-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField
              label="User-agents"
              hint="Select or type custom user-agents"
            >
              <USelectMenu
                v-model="selectedUserAgents"
                :items="userAgentOptions"
                multiple
                create-item="always"
                placeholder="Select user-agents"
                class="w-full"
                @create="onCreateUserAgent"
              />
            </UFormField>

            <UFormField
              label="Paths"
              hint="Type a path and press Enter, or paste multiple paths separated by newlines, spaces, or commas"
            >
              <UInputTags
                v-model="paths"
                add-on-paste
                :delimiter="SIMULATION_PATH_DELIMITER"
                :convert-value="normalizeSimulationPath"
                placeholder="/your-path"
                class="w-full font-mono"
              />
            </UFormField>
          </div>

          <UTable
            v-if="tableData.length > 0"
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
