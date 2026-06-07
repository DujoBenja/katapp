// EUR price formatting (Croatian locale), e.g. 19.9 -> "19,90 €"
const eur = new Intl.NumberFormat('hr-HR', {
  style: 'currency',
  currency: 'EUR',
})

export function formatEUR(value) {
  const n = Number(value)
  return eur.format(Number.isFinite(n) ? n : 0)
}
