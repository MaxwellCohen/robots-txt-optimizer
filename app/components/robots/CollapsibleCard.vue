<script setup lang="ts">
const props = withDefaults(defineProps<{
  icon: string
  title: string
  description?: string
  defaultOpen?: boolean
}>(), {
  defaultOpen: true
})

const open = ref(props.defaultOpen)
const contentId = useId()
</script>

<template>
  <UCard>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0 flex-1 space-y-1">
        <h2 class="font-semibold">
          <button
            type="button"
            class="flex cursor-pointer items-center gap-2 rounded-md text-left focus-visible:outline-2 focus-visible:outline-primary"
            :aria-expanded="open"
            :aria-controls="contentId"
            @click="open = !open"
          >
            <UIcon
              :name="icon"
              class="size-5"
            />
            <span>{{ title }}</span>
            <slot name="badge" />
            <UIcon
              name="i-lucide-chevron-down"
              class="size-4 text-muted transition-transform duration-200"
              :class="{ 'rotate-180': open }"
            />
          </button>
        </h2>
        <p
          v-if="description"
          class="text-sm text-muted"
        >
          {{ description }}
        </p>
      </div>
      <div
        v-if="$slots.actions"
        class="flex items-center gap-2"
      >
        <slot name="actions" />
      </div>
    </div>

    <div
      v-show="open"
      :id="contentId"
      class="mt-4 border-t border-default pt-4"
    >
      <slot />
    </div>
  </UCard>
</template>
