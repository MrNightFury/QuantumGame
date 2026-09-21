import { Modal } from '../Modal/Modal'
import { getDiceImageUrl } from '../../lib/assets'
import type { DiceState } from '../../types/dice'
import s from './DiceChoiceModal.module.css'

type Props = {
  title: string
  /** Варианты выбора — состояния кубитов, отображаются горизонтальным рядом. */
  options: DiceState[]
  onSelect: (state: DiceState) => void
  onClose: () => void
}

export function DiceChoiceModal({ title, options, onSelect, onClose }: Props) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className={s.optionsRow}>
        {options.map((state) => (
          <button
            key={state}
            type="button"
            className={s.option}
            onClick={() => onSelect(state)}
          >
            <img className={s.optionDice} src={getDiceImageUrl(state)} alt="" />
          </button>
        ))}
      </div>
    </Modal>
  )
}