import type { GateId } from '../../types/qubitDemo'
import s from './GamePage.module.css'

const GATES: { id: GateId; label: string }[] = [
  { id: 'X', label: 'X' },
  { id: 'Y', label: 'Y' },
  { id: 'Z', label: 'Z' },
  { id: 'H', label: 'H' },
  { id: 'P+', label: 'P+' },
  { id: 'P-', label: 'P−' },
  { id: 'SWAP', label: 'SWAP' },
]

type Props = {
  selected: GateId | null
  onSelect: (gate: GateId) => void
}

export function GatePanel({ selected, onSelect }: Props) {
  return (
    <section className={s.gateSection}>
      <span className={s.sectionLabel}>Гейт</span>
      <div className={s.gateRow}>
        {GATES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`${s.gateBtn} ${id === 'SWAP' ? s.gateBtnWide : ''} ${selected === id ? s.gateBtnActive : ''}`}
            onClick={() => onSelect(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}
