<script setup>
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useTravelStore } from '../stores/travel'
import { TRIP_TYPES } from '../constants'
import { formatDate, formatMoney } from '../utils/format'
import { planTotalSpend, planPackingRate } from '../services/selectors'

const store = useTravelStore()
const router = useRouter()

// 检索条件只存在页面内存中，不写入 store / 本地存储
const filters = reactive({
  keyword: '',
  tripType: '',
  dateFrom: '',
  dateTo: '',
})

function tripTypeClass(type) {
  return { 出国: 'tag-red', 长途: 'tag-orange', 出差: 'tag-blue' }[type] || 'tag-green'
}

function onDelete(plan) {
  if (confirm(`确认删除「${plan.name}」吗？此操作不可恢复。`)) {
    store.deletePlan(plan.id)
  }
}

const normalizedKeyword = computed(() => filters.keyword.trim().toLowerCase())

// 是否有任一检索条件生效
const hasActiveFilter = computed(
  () =>
    !!normalizedKeyword.value ||
    !!filters.tripType ||
    !!filters.dateFrom ||
    !!filters.dateTo,
)

const filteredPlans = computed(() => {
  if (!hasActiveFilter.value) return store.plans

  const keyword = normalizedKeyword.value
  const { tripType, dateFrom, dateTo } = filters

  return store.plans.filter((plan) => {
    // 关键词：匹配名称、目的地、备注
    if (keyword) {
      const haystack = [plan.name, plan.destination, plan.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(keyword)) return false
    }

    // 出行类型
    if (tripType && plan.tripType !== tripType) return false

    // 日期范围：行程区间 [startDate, endDate] 与所选范围有重叠即命中，任一端可单独填写
    if (dateFrom && plan.endDate < dateFrom) return false
    if (dateTo && plan.startDate > dateTo) return false

    return true
  })
})

function resetFilters() {
  filters.keyword = ''
  filters.tripType = ''
  filters.dateFrom = ''
  filters.dateTo = ''
}
</script>

<template>
  <div>
    <div class="flex-between mb-16">
      <p class="text-secondary">
        共 {{ store.plans.length }} 个出行计划
        <span v-if="hasActiveFilter" class="filter-count">· 检索到 {{ filteredPlans.length }} 个</span>
      </p>
      <button class="btn btn-primary" @click="router.push('/plans/new')">+ 新建出行计划</button>
    </div>

    <div class="card filter-bar mb-16">
      <div class="filter-keyword">
        <span class="filter-search-icon">🔍</span>
        <input
          v-model="filters.keyword"
          class="input"
          type="search"
          placeholder="搜索名称、目的地或备注关键词"
        />
      </div>
      <div class="filter-row">
        <div class="filter-field">
          <label class="filter-label">出行类型</label>
          <select v-model="filters.tripType" class="select">
            <option value="">全部类型</option>
            <option v-for="t in TRIP_TYPES" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div class="filter-field">
          <label class="filter-label">出发日期起</label>
          <input v-model="filters.dateFrom" class="input" type="date" />
        </div>
        <div class="filter-field">
          <label class="filter-label">返回日期止</label>
          <input v-model="filters.dateTo" class="input" type="date" />
        </div>
        <div class="filter-actions">
          <button class="btn btn-ghost" :disabled="!hasActiveFilter" @click="resetFilters">
            清空条件
          </button>
        </div>
      </div>
    </div>

    <div v-if="filteredPlans.length" class="plan-grid">
      <div v-for="plan in filteredPlans" :key="plan.id" class="plan-card" @click="router.push(`/plans/${plan.id}`)">
        <div class="plan-cover">
          <img v-if="plan.photo" :src="plan.photo" alt="目的地照片" />
          <div v-else class="plan-cover-placeholder">{{ plan.destination.slice(0, 1) }}</div>
        </div>
        <div class="plan-body">
          <div class="flex-between">
            <h3 class="plan-name">{{ plan.name }}</h3>
            <span class="tag" :class="tripTypeClass(plan.tripType)">{{ plan.tripType }}</span>
          </div>
          <p class="plan-dest text-secondary">{{ plan.destination }} · {{ plan.destinationType }}</p>
          <p class="plan-date text-muted">
            {{ formatDate(plan.startDate) }} 至 {{ formatDate(plan.endDate) }} · {{ plan.days }} 天
          </p>
          <div class="plan-meta">
            <span>{{ plan.memberCount }} 人 · {{ plan.transport }}</span>
          </div>
          <div class="plan-stats">
            <div class="plan-stat">
              <span class="text-muted">花费</span>
              <strong :class="planTotalSpend(plan) > plan.budget ? 'text-danger' : ''">
                {{ formatMoney(planTotalSpend(plan)) }}
                <small v-if="plan.budget"> / {{ formatMoney(plan.budget) }}</small>
              </strong>
            </div>
            <div class="plan-stat">
              <span class="text-muted">打包</span>
              <strong>{{ planPackingRate(plan) }}%</strong>
            </div>
          </div>
        </div>
        <div class="plan-actions" @click.stop>
          <button class="btn btn-ghost btn-sm" @click="router.push(`/plans/${plan.id}`)">详情</button>
          <button class="btn btn-ghost btn-sm" @click="router.push(`/plans/${plan.id}/edit`)">编辑</button>
          <button class="btn btn-danger btn-sm" @click="onDelete(plan)">删除</button>
        </div>
      </div>
    </div>

    <!-- 已有计划但检索无结果 -->
    <div v-else-if="store.plans.length" class="card empty">
      <p class="empty-icon">🔍</p>
      <p>没有符合条件的出行计划</p>
      <p class="text-muted mt-16">试试更换关键词，或放宽出行类型与日期范围</p>
      <button class="btn btn-primary mt-16" @click="resetFilters">清空检索条件</button>
    </div>

    <!-- 一个计划都还没有 -->
    <div v-else class="card empty">
      <p class="empty-icon">+</p>
      <p>还没有出行计划</p>
      <button class="btn btn-primary mt-16" @click="router.push('/plans/new')">新建出行计划</button>
    </div>
  </div>
</template>

<style scoped>
.filter-count {
  color: var(--primary);
  font-weight: 500;
}

.filter-keyword {
  position: relative;
  margin-bottom: 12px;
}

.filter-keyword .input {
  padding-left: 36px;
}

.filter-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  pointer-events: none;
  opacity: 0.6;
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
  gap: 12px;
  align-items: end;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.filter-actions {
  display: flex;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.plan-card {
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
  display: flex;
  flex-direction: column;
}

.plan-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.plan-cover {
  height: 140px;
  background: linear-gradient(135deg, #4f6ef7, #7c5cf0);
}

.plan-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.plan-cover-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 48px;
  font-weight: 700;
}

.plan-body {
  padding: 16px;
  flex: 1;
}

.plan-name {
  font-size: 16px;
  margin-bottom: 2px;
}

.plan-dest {
  font-size: 14px;
}

.plan-date {
  font-size: 13px;
}

.plan-meta {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.plan-stats {
  display: flex;
  gap: 24px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.plan-stat {
  display: flex;
  flex-direction: column;
  font-size: 12px;
}

.plan-stat strong {
  font-size: 15px;
}

.plan-stat small {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 400;
}

.plan-actions {
  display: flex;
  gap: 8px;
  padding: 0 16px 16px;
}

@media (max-width: 900px) {
  .filter-row {
    grid-template-columns: 1fr;
  }
}
</style>
