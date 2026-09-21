import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useRef, type CSSProperties, type MutableRefObject, type PointerEvent as ReactPointerEvent } from 'react'
import { parseSlotKey } from '../../../game'
import type { BoardSlotState, PlayTarget } from '../../../game/types'
import { getCardImageUrl, getDiceImageUrl } from '../../../lib/assets'
import type { HandCard } from '../../../types/card'
import { LONG_PRESS_MS, LONG_PRESS_MOVE_PX } from '../gameHelpers'
import s from '../GamePage.module.css'

function useLongPress(onLongPress: (() => void) | undefined, disabled?: boolean) {
  const timerRef = useRef<number | null>(null)
  const originRef = useRef({ x: 0, y: 0 })

  const clear = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const onPointerDown = (event: ReactPointerEvent) => {
    clear()
    originRef.current = { x: event.clientX, y: event.clientY }
    if (!onLongPress || disabled) return

    timerRef.current = window.setTimeout(onLongPress, LONG_PRESS_MS)
  }

  const onPointerMove = (event: ReactPointerEvent) => {
    if (timerRef.current === null) return
    const dx = event.clientX - originRef.current.x
    const dy = event.clientY - originRef.current.y
    if (dx * dx + dy * dy > LONG_PRESS_MOVE_PX * LONG_PRESS_MOVE_PX) {
      clear()
    }
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
  }
}

export function DraggableCard({
  card,
  className = '',
  style,
  disabled,
  onLongPress,
}: {
  card: HandCard
  className?: string
  style?: CSSProperties
  disabled?: boolean
  onLongPress?: (card: HandCard) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.instanceId,
    disabled,
  })

  const hold = useLongPress(
    onLongPress ? () => onLongPress(card) : undefined,
    disabled,
  )

  let cardTransform = style?.transform ?? ''
  if (!isDragging && transform) {
    cardTransform = `${cardTransform} ${CSS.Translate.toString(transform)}`.trim()
  }

  return (
    <button
      type="button"
      ref={setNodeRef}
      className={`${s.draggableCard} ${isDragging ? s.draggableCardDragging : ''} ${className}`}
      style={{ ...style, opacity: isDragging ? 0.25 : 1, transform: cardTransform, zIndex: isDragging ? 100 : style?.zIndex }}
      {...attributes}
      {...listeners}
      onPointerDown={(event) => {
        listeners?.onPointerDown?.(event)
        hold.onPointerDown(event)
      }}
      onPointerMove={(event) => {
        listeners?.onPointerMove?.(event)
        hold.onPointerMove(event)
      }}
      onPointerUp={(event) => {
        listeners?.onPointerUp?.(event)
        hold.onPointerUp()
      }}
      onPointerLeave={(event) => {
        listeners?.onPointerLeave?.(event)
        hold.onPointerLeave()
      }}
      onPointerCancel={(event) => {
        listeners?.onPointerCancel?.(event)
        hold.onPointerCancel()
      }}
    >
      <img className={s.cardImage} src={getCardImageUrl(card.cardId)} alt="" draggable={false} />
    </button>
  )
}

export function TapCard({
  card,
  style,
  disabled,
  onTap,
  onLongPress,
  skipNextTapRef,
}: {
  card: HandCard
  style?: CSSProperties
  disabled?: boolean
  onTap: (card: HandCard) => void
  onLongPress: (card: HandCard) => void
  skipNextTapRef: MutableRefObject<boolean>
}) {
  const hold = useLongPress(() => {
    skipNextTapRef.current = true
    onLongPress(card)
  }, disabled)

  return (
    <button
      type="button"
      className={s.draggableCard}
      style={style}
      disabled={disabled}
      onClick={() => {
        if (skipNextTapRef.current) {
          skipNextTapRef.current = false
          return
        }
        onTap(card)
      }}
      onPointerDown={hold.onPointerDown}
      onPointerMove={hold.onPointerMove}
      onPointerUp={hold.onPointerUp}
      onPointerLeave={hold.onPointerLeave}
      onPointerCancel={hold.onPointerCancel}
    >
      <img className={s.cardImage} src={getCardImageUrl(card.cardId)} alt="" draggable={false} />
    </button>
  )
}

export function BoardSlot({
  slotId,
  slot,
  card,
  disabled,
  swapMode,
  selected,
  dropOk,
  onPick,
}: {
  slotId: string
  slot: BoardSlotState
  card: HandCard | null
  disabled?: boolean
  swapMode?: boolean
  selected?: boolean
  dropOk?: boolean | null
  onPick?: (target: PlayTarget) => void
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: slotId,
    disabled: disabled || swapMode,
  })

  let className = s.boardSlot
  if (isOver && dropOk === true) className += ` ${s.boardSlotOver}`
  if (isOver && dropOk === false) className += ` ${s.boardSlotInvalid}`
  if (slot.frozen) className += ` ${s.boardSlotFrozen}`
  if (swapMode) className += ` ${s.boardSlotSelectable}`
  if (selected) className += ` ${s.boardSlotSelected}`

  return (
    <div
      ref={setNodeRef}
      className={className}
      onClick={() => {
        if (!swapMode || !onPick) return
        const target = parseSlotKey(slotId)
        if (target) onPick(target)
      }}
    >
      <img className={s.slotDice} src={getDiceImageUrl(slot.dice)} alt="" />
      {card && (
        <DraggableCard
          card={card}
          className={`${s.cardInSlot}${swapMode ? ` ${s.cardInSlotPassthrough}` : ''}`}
          disabled={disabled}
        />
      )}
    </div>
  )
}
