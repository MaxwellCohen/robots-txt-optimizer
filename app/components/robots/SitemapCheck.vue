<script setup lang="ts">
import {
  findBlockedSitemapUrls,
  type RobotsDocument,
  type SitemapReport
} from '@robots-txt-optimizer/core'

const props = defineProps<{
  document: RobotsDocument
}>()

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

const declaredSitemaps = computed(() =>
  props.document.sitemaps.map(sitemap => sitemap.url).filter(isAbsoluteHttpUrl)
)

const customSitemap = ref('')
const validationError = ref<string | null>(null)
const sitemapUrls = ref<string[]>([])

const { data, status, error: fetchError, execute, clear } = useFetch<SitemapReport>('/api/sitemap/check', {
  key: 'sitemap-check',
  query: { url: sitemapUrls },
  immediate: false,
  watch: false,
  server: false
})

const report = computed(() => status.value === 'success' ? (data.value ?? null) : null)
const loading = computed(() => status.value === 'pending')
const error = computed(() =>
  validationError.value ?? (fetchError.value ? fetchError.value.message || 'Failed to check sitemaps' : null)
)

// Results describe a specific robots.txt; drop them when the sitemap list changes.
watch(declaredSitemaps, (next, previous) => {
  if (next.join('\n') !== previous?.join('\n')) {
    clear()
  }
})

const conflicts = computed(() =>
  report.value ? findBlockedSitemapUrls(props.document, report.value.urls) : []
)

const failedSitemaps = computed(() => report.value?.sitemaps.filter(sitemap => sitemap.error) ?? [])

async function check(urls: string[]) {
  if (urls.length === 0) {
    return
  }
  validationError.value = null
  sitemapUrls.value = urls
  await execute()
}

function checkCustom() {
  const value = customSitemap.value.trim()
  if (isAbsoluteHttpUrl(value)) {
    check([value])
  } else {
    validationError.value = 'Enter a full sitemap URL, e.g. https://example.com/sitemap.xml'
  }
}

const columns = [
  { accessorKey: 'userAgent', header: 'User-agent' },
  { accessorKey: 'path', header: 'Sitemap URL' },
  { accessorKey: 'rule', header: 'Blocked by' }
]

const tableData = computed(() =>
  conflicts.value.slice(0, 200).map(conflict => ({
    userAgent: conflict.userAgent,
    path: conflict.path,
    url: conflict.url,
    rule: conflict.line ? `Line ${conflict.line}: Disallow ${conflict.matchedRule}` : conflict.matchedRule
  }))
)
</script>

<template>
  <RobotsCollapsibleCard
    icon="i-lucide-map"
    title="Sitemap check"
    description="Fetch your sitemaps and find URLs you ask search engines to index but block in robots.txt"
  >
    <template
      v-if="report"
      #badge
    >
      <UBadge
        :color="conflicts.length ? 'error' : 'primary'"
        variant="subtle"
      >
        {{ conflicts.length ? `${conflicts.length} blocked` : 'No conflicts' }}
      </UBadge>
    </template>

    <div class="space-y-4">
      <div
        v-if="declaredSitemaps.length"
        class="flex flex-wrap items-center gap-2"
      >
        <UButton
          icon="i-lucide-scan-search"
          :loading="loading"
          @click="check(declaredSitemaps)"
        >
          Check {{ declaredSitemaps.length }} sitemap{{ declaredSitemaps.length === 1 ? '' : 's' }}
        </UButton>
        <span class="text-xs text-muted">
          Follows sitemap indexes · up to 10 files and 5,000 URLs
        </span>
      </div>

      <div class="flex gap-2">
        <UInput
          v-model="customSitemap"
          :placeholder="declaredSitemaps.length ? 'Or check another sitemap URL' : 'No Sitemap: lines found — enter a sitemap URL'"
          class="flex-1"
          @keyup.enter="checkCustom"
        />
        <UButton
          variant="outline"
          :loading="loading && !declaredSitemaps.length"
          @click="checkCustom"
        >
          Check
        </UButton>
      </div>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        :title="error"
      />

      <template v-if="report">
        <ul class="space-y-1 text-sm">
          <li
            v-for="sitemap in report.sitemaps"
            :key="sitemap.url"
            class="flex items-center gap-2"
          >
            <UIcon
              :name="sitemap.error ? 'i-lucide-x-circle' : 'i-lucide-check-circle'"
              class="size-4 shrink-0"
              :class="sitemap.error ? 'text-error' : 'text-primary'"
            />
            <span class="truncate font-mono text-xs">{{ sitemap.url }}</span>
            <span class="shrink-0 text-xs text-muted">
              {{ sitemap.error ?? `${sitemap.urlCount} ${sitemap.kind === 'sitemapindex' ? 'sitemaps' : 'URLs'}` }}
            </span>
          </li>
        </ul>

        <UAlert
          v-if="failedSitemaps.length"
          color="warning"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :title="`${failedSitemaps.length} sitemap${failedSitemaps.length === 1 ? '' : 's'} could not be read`"
          description="Search engines will report the same errors in their webmaster tools."
        />

        <p class="text-sm text-muted">
          Checked {{ report.urls.length.toLocaleString() }} URLs against Googlebot and Bingbot<template v-if="report.truncated">
            (limit reached — remaining URLs were not checked)
          </template>.
        </p>

        <UEmpty
          v-if="conflicts.length === 0 && report.urls.length > 0"
          icon="i-lucide-check-circle"
          title="Every sitemap URL is crawlable"
          description="No URL in your sitemaps is blocked by robots.txt."
        />

        <template v-else-if="conflicts.length > 0">
          <UTable
            :data="tableData"
            :columns="columns"
          >
            <template #path-cell="{ row }">
              <a
                :href="row.original.url"
                target="_blank"
                rel="noopener noreferrer"
                class="font-mono text-xs hover:underline"
              >{{ row.original.path }}</a>
            </template>
          </UTable>
          <p
            v-if="conflicts.length > tableData.length"
            class="text-xs text-muted"
          >
            Showing the first {{ tableData.length }} of {{ conflicts.length }} conflicts.
          </p>
        </template>
      </template>
    </div>
  </RobotsCollapsibleCard>
</template>
