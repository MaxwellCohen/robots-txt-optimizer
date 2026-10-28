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
const report = ref<SitemapReport | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Results describe a specific robots.txt; drop them when the sitemap list changes.
watch(declaredSitemaps, (next, previous) => {
  if (next.join('\n') !== previous?.join('\n')) {
    report.value = null
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
  loading.value = true
  error.value = null
  try {
    report.value = await $fetch<SitemapReport>('/api/sitemap/check', { query: { url: urls } })
  } catch (err) {
    report.value = null
    error.value = err instanceof Error ? err.message : 'Failed to check sitemaps'
  } finally {
    loading.value = false
  }
}

function checkCustom() {
  const value = customSitemap.value.trim()
  if (isAbsoluteHttpUrl(value)) {
    check([value])
  } else {
    error.value = 'Enter a full sitemap URL, e.g. https://example.com/sitemap.xml'
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
              name="i-lucide-map"
              class="size-5"
            />
            <h2 class="font-semibold">
              Sitemap check
            </h2>
            <UBadge
              v-if="report"
              :color="conflicts.length ? 'error' : 'primary'"
              variant="subtle"
            >
              {{ conflicts.length ? `${conflicts.length} blocked` : 'No conflicts' }}
            </UBadge>
            <UIcon
              name="i-lucide-chevron-down"
              class="size-4 text-muted transition-transform duration-200"
              :class="{ 'rotate-180': open }"
            />
          </div>
          <p class="text-sm text-muted">
            Fetch your sitemaps and find URLs you ask search engines to index but block in robots.txt
          </p>
        </div>
      </template>

      <template #content>
        <div class="mt-4 space-y-4 border-t border-default pt-4">
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
      </template>
    </UCollapsible>
  </UCard>
</template>
