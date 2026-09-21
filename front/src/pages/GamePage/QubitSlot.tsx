import { getCardImageUrl, getDiceImageUrl } from '../../lib/assets'
import type { CardId } from '../../types/card'
import type { DiceState } from '../../types/dice'
import s from './GamePage.module.css'

type SlotState = { dice: DiceState | null; frozen: boolean }

type Props = {
  slot: SlotState
  ready: boolean
  selected?: boolean
  disabled?: boolean
  /** Карта, лежащая на этом слоте (cardsOnField). */
  card?: CardId | null
  onClick: () => void
}

export function QubitSlot({ slot, ready, selected, disabled, card, onClick }: Props) {
  let className = `${s.boardSlot} ${s.boardSlotBtn}`
  if (slot.frozen) className += ` ${s.boardSlotFrozen}`
  if (ready) className += ` ${s.boardSlotReady}`
  if (selected) className += ` ${s.boardSlotSelected}`

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {card && (
        <img className={`${s.cardImage} ${s.cardInSlot}`} src={getCardImageUrl(card)} alt="" />
      )}
      {slot.dice && <img className={s.slotDice} src={getDiceImageUrl(slot.dice)} alt="" />}
    </button>
  )
}
