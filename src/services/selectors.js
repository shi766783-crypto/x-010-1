import { EXPENSE_CATEGORIES } from '../constants'
import { luggageCompletionRate } from './luggage'

function toNum(value) {
  return Number(value) || 0
}

// 单次出行总花费
export function planTotalSpend(plan) {
  return (plan.records || []).reduce(
    (sum, r) =>
      sum +
      toNum(r.transportCost) +
      toNum(r.mealCost) +
      toNum(r.ticketCost) +
      toNum(r.shoppingCost) +
      toNum(r.otherCost),
    0
  )
}

// 单次出行花费分类汇总
export function planSpendBreakdown(plan) {
  const records = plan.records || []
  return EXPENSE_CATEGORIES.reduce((acc, { key, label }) => {
    acc[label] = records.reduce((sum, r) => sum + toNum(r[key]), 0)
    return acc
  }, {})
}

// 单次出行行李打包完成率（各成员平均）
export function planPackingRate(plan) {
  const lists = plan.luggage || []
  if (!lists.length) return 0
  const sum = lists.reduce((s, l) => s + luggageCompletionRate(l.items), 0)
  return Math.round(sum / lists.length)
}

// 单次出行待办完成进度（0-100）
export function planTodoProgress(plan) {
  const todos = plan.todos || []
  if (!todos.length) return 0
  return Math.round((todos.filter((t) => t.done).length / todos.length) * 100)
}

// 判断待办是否全部完成
export function planTodosAllDone(plan) {
  const todos = plan.todos || []
  return todos.length > 0 && todos.every((t) => t.done)
}

// 按关键词、出行类型与日期范围组合筛选计划
// 关键词同时匹配名称、目的地、备注；日期范围按行程区间重叠判断。
// 纯内存计算，返回新数组，不修改计划数据。
export function filterPlans(plans, { keyword = '', tripType = '', dateFrom = '', dateTo = '' } = {}) {
  const kw = keyword.trim().toLowerCase()
  // 起止颠倒时自动交换，避免误操作导致全部落空
  let from = dateFrom
  let to = dateTo
  if (from && to && from > to) [from, to] = [to, from]

  return plans.filter((plan) => {
    if (kw) {
      const matched = [plan.name, plan.destination, plan.notes]
        .some((text) => (text || '').toLowerCase().includes(kw))
      if (!matched) return false
    }
    if (tripType && plan.tripType !== tripType) return false
    // 日期为 YYYY-MM-DD 字符串，可直接按字典序比较
    if (from && (!plan.endDate || plan.endDate < from)) return false
    if (to && (!plan.startDate || plan.startDate > to)) return false
    return true
  })
}
