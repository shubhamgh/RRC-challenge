export type ShareResult = {
  amounts: Record<string, number>
  notes: string[]
}

function largestRemainder(total: number, keys: string[], weights: number[]): ShareResult {
  const notes: string[] = []
  if (total <= 0 || keys.length === 0) {
    return { amounts: Object.fromEntries(keys.map((k) => [k, 0])), notes }
  }
  const weightSum = weights.reduce((a, b) => a + b, 0)
  const items = keys.map((key, i) => {
    const exact = (total * weights[i]) / weightSum
    const amount = Math.floor(exact)
    return { key, exact, amount, remainder: exact - amount }
  })
  let leftover = total - items.reduce((sum, item) => sum + item.amount, 0)
  const order = [...items].sort((a, b) => b.remainder - a.remainder || a.key.localeCompare(b.key))
  let i = 0
  while (leftover > 0 && order.length > 0) {
    const target = order[i % order.length]
    const item = items.find((x) => x.key === target.key)
    if (item) {
      item.amount += 1
      leftover -= 1
      notes.push(
        `Rounding: +₹1 to ${item.key} so the full ${new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format(total)} is accounted for.`,
      )
    }
    i += 1
  }
  return {
    amounts: Object.fromEntries(items.map((item) => [item.key, item.amount])),
    notes,
  }
}

export function splitShortPool(paidCount: number, entryAmount: number): ShareResult {
  const total = paidCount * entryAmount
  return largestRemainder(total, ['1st (50%)', '2nd (30%)', '3rd (20%)'], [50, 30, 20])
}

export function splitMainPool(paidCount: number, entryAmount: number): ShareResult {
  const total = paidCount * entryAmount
  return largestRemainder(
    total,
    ['1st (40%)', '2nd (25%)', '3rd (15%)', 'Weekly reserve (20%)'],
    [40, 25, 15, 20],
  )
}

export function splitWeeklyReserve(reserve: number, weekKeys: string[]): ShareResult {
  if (weekKeys.length === 0) return { amounts: {}, notes: [] }
  return largestRemainder(
    reserve,
    weekKeys,
    weekKeys.map(() => 1),
  )
}
