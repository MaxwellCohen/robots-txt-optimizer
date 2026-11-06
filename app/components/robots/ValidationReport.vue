<script setup lang="ts">
import type { ValidationResult } from '@robots-txt-optimizer/core'

const props = defineProps<{
  validation: ValidationResult
}>()

const errorCount = computed(() => props.validation.issues.filter(issue => issue.severity === 'error').length)
</script>

<template>
  <div class="space-y-4">
    <UAlert
      v-if="validation.ok"
      color="primary"
      variant="subtle"
      icon="i-lucide-check-circle"
      title="Validation passed"
      description="No syntax errors found. Review warnings below if any."
    />
    <UAlert
      v-else
      color="error"
      variant="subtle"
      icon="i-lucide-x-circle"
      title="Validation failed"
      :description="`${errorCount} error(s) found`"
    />

    <div
      v-if="validation.issues.length > 0"
      class="space-y-2"
    >
      <h3 class="text-sm font-medium text-muted">
        Issues
      </h3>
      <ul class="space-y-2">
        <li
          v-for="issue in validation.issues"
          :key="`${issue.severity}:${issue.line ?? ''}:${issue.message}`"
          class="flex items-start gap-2 text-sm rounded-lg border border-default p-3"
        >
          <UBadge
            :color="issue.severity === 'error' ? 'error' : 'warning'"
            variant="subtle"
            class="shrink-0"
          >
            {{ issue.severity }}
          </UBadge>
          <div>
            <p>{{ issue.message }}</p>
            <p
              v-if="issue.line !== undefined"
              class="text-muted text-xs mt-1"
            >
              Line {{ issue.line }}
            </p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
