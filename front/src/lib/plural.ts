/**
 * Склонение слова «кубит» с числом: 1 кубит, 4 кубита, 5 кубитов.
 * Диапазон выбора — QUBIT_COUNT_OPTIONS, но функции гарантируют форму
 * для любого целого числа.
 */
export function cubitCountLabel(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod100 >= 11 && mod100 <= 14) return `${count} кубитов`
  if (mod10 === 1) return `${count} кубит`
  if (mod10 >= 2 && mod10 <= 4) return `${count} кубита`
  return `${count} кубитов`
}
