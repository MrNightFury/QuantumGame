import { Menu } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button/Button'
import { getConnectionState, subscribeConnection } from '../../api/connection'
import { getGameData, giveUp, selectTarget, startGame, subscribeGame } from '../../api/game'
import type { GameStateData } from '../../api/events'
import type { BoardOwner } from '../../game/types'
import { getDiceImageUrl } from '../../lib/assets'
import { parseDiceFace } from '../../lib/dice'
import { DICE_STATES, type DiceState } from '../../types/dice'
import { ALL_CARD_IDS } from '../../data/cards'
import type { CardId } from '../../types/card'
import { Modal } from '../../components/Modal/Modal'
import { DiceChoiceModal } from '../../components/DiceChoiceModal/DiceChoiceModal'
import { QubitSlot } from './QubitSlot'
import { RulesFrame } from './RulesFrame'
import s from './GamePage.module.css'

const avatar = (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11.25,17.25h1.5L12,18z"/>
    <path d="m15,12 l2,2"/>
    <path d="M18,6.5a0.5,0.5 0,0 0,-0.5 -0.5"/>
    <path d="M20.69,9.67a4.5,4.5 0,1 0,-7.04 -5.5,8.35 8.35,0 0,0 -3.3,0 4.5,4.5 0,1 0,-7.04 5.5C2.49,11.2 2,12.88 2,14.5 2,19.47 6.48,22 12,22s10,-2.53 10,-7.5c0,-1.62 -0.48,-3.3 -1.3,-4.83"/>
    <path d="M6,6.5a0.495,0.495 0,0 1,0.5 -0.5"/>
    <path d="m9,12 l-2,2"/>
  </svg>
)

type Slot = { dice: DiceState | null; frozen: boolean }

type Target = { player: number; cubit: number }

type Selection = {
  /** Состояние поля, к которому относится выбор. При новом setGameState выбор сбрасывается. */
  forState: GameStateData | null
  target: Target | null
}

function toSlots(faces: string[] | undefined): Slot[] {
  return (faces ?? []).map((face) => ({ dice: parseDiceFace(face), frozen: false }))
}

const KNOWN_CARD_IDS = new Set<string>(ALL_CARD_IDS)

function toCardId(name: string): CardId | null {
  return KNOWN_CARD_IDS.has(name) ? (name as CardId) : null
}

export const GamePage = () => {
  const navigate = useNavigate()
  const { userId, onlineUsers } = useSyncExternalStore(subscribeConnection, getConnectionState)
  const { started, state, ended } = useSyncExternalStore(subscribeGame, getGameData)

  const [selection, setSelection] = useState<Selection>({ forState: null, target: null })
  const [menuOpen, setMenuOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [choiceOpen, setChoiceOpen] = useState(false)

  const myIndex = started && userId !== null ? started.players.indexOf(userId) : -1
  const inGame = myIndex >= 0
  const otherIndex = myIndex === 0 ? 1 : 0

  const myRegister = inGame && state ? state.registers[myIndex] : undefined
  const opponentRegister = inGame && state ? state.registers[otherIndex] : undefined
  const mySlots = toSlots(myRegister)
  const opponentSlots = toSlots(opponentRegister)
  const targetFaces = state ? state.targetRegister : []

  const myTurn = inGame && state !== null && state.currentPlayer === myIndex

  const selectionFresh = selection.forState === state
  const selectedTarget = selectionFresh ? selection.target : null

  const onSlotClick = (player: number, cubit: number) => {
    if (!myTurn) return
    if (!selectTarget(player, cubit)) return
    setSelection({
      forState: state,
      target: { player, cubit },
    })
  }
  const nicknameOf = (playerId: number): string =>
    onlineUsers.find((user) => user.id === playerId)?.name ?? 'Игрок'

  const fieldCardAt = (playerIndex: number, cubit: number): CardId | null => {
    if (!state) return null
    const entry = state.cardsOnField.find(
      (card) => card.player === playerIndex && card.cubit === cubit,
    )
    return entry ? toCardId(entry.card) : null
  }

  const restart = () => {
    if (started) startGame(started.players, started.cubitCount)
  }

  const renderRow = (owner: BoardOwner, label: string, slots: Slot[], playerIndex: number) => (
    <>
      <div className={s.rowLabel}>{label}</div>
      <div className={s.boardRow}>
        {slots.map((slot, index) => (
          <QubitSlot
            key={`${owner}-${index}`}
            slot={slot}
            ready={myTurn}
            selected={
              selectedTarget !== null &&
              selectedTarget.player === playerIndex &&
              selectedTarget.cubit === index
            }
            disabled={!myTurn}
            card={fieldCardAt(playerIndex, index)}
            onClick={() => onSlotClick(playerIndex, index)}
          />
        ))}
      </div>
    </>
  )

  if (!started || !inGame) {
    return (
      <main className={s.main}>
        <p className={s.modalText}>Ожидание начала игры…</p>
      </main>
    )
  }

  const myId = started.players[myIndex]
  const opponentId = started.players[otherIndex]

  return (
    <>
      <header className={s.gameHeader}>
        <div className={s.menuButton} onClick={() => setMenuOpen(true)}>
          <Menu className={s.menuIcon} />
        </div>
      </header>

      <main className={s.main}>
        <section className={s.playersBar}>
          <div className={s.playersRow}>
            <div className={`${s.playerCard} ${myTurn ? s.playerCardActive : ''}`}>
              <div className={s.playerAvatar} onClick={() => setChoiceOpen(true)}>{avatar}</div>
              <span className={s.playerName}>{nicknameOf(myId)}</span>
              <span className={`${s.playerStatus} ${myTurn ? s.playerStatusActive : ''}`}>
                {myTurn ? 'ВАШ ХОД' : 'ЖДИТЕ'}
              </span>
            </div>
            <div className={`${s.playerCard} ${!myTurn && state ? s.playerCardActive : ''}`}>
              <div className={s.playerAvatar} onClick={() => setChoiceOpen(true)}>{avatar}</div>
              <span className={s.playerName}>{nicknameOf(opponentId)}</span>
              <span className={`${s.playerStatus} ${!myTurn && state ? s.playerStatusActive : ''}`}>
                {!myTurn && state ? 'ВАШ ХОД' : 'ЖДИТЕ'}
              </span>
            </div>
          </div>
        </section>

        <section className={s.targetSection}>
          <span className={s.sectionLabel}>Цель · {started.cubitCount} кубита</span>
          <div className={s.targetRow}>
            {targetFaces.map((face, i) => {
              const dice = parseDiceFace(face)
              return (
                <div className={s.targetDiceSlot} key={i}>
                  {dice && <img className={s.targetDiceImage} src={getDiceImageUrl(dice)} alt="" />}
                </div>
              )
            })}
          </div>
        </section>

        <section className={s.boardSection}>
          <div className={s.boardContainer}>
            {renderRow('opponent', 'Соперник', opponentSlots, otherIndex)}
            {renderRow('my', 'Ваш ряд', mySlots, myIndex)}
          </div>
        </section>
      </main>

      {choiceOpen && (
        <DiceChoiceModal
          title="Выберите состояние кубита"
          options={[...DICE_STATES]}
          onSelect={(state) => {
            console.log('Выбран кубит:', state)
            setChoiceOpen(false)
          }}
          onClose={() => setChoiceOpen(false)}
        />
      )}

      {menuOpen && (
        <Modal title="Меню" onClose={() => setMenuOpen(false)}>
          <div className={s.menuModalContent}>
            <button
              type="button"
              className={s.menuModalItem}
              onClick={() => {
                setMenuOpen(false)
                setRulesOpen(true)
              }}
            >
              Правила
            </button>
            <button
              type="button"
              className={`${s.menuModalItem} ${s.menuModalItemDanger}`}
              onClick={() => {
                giveUp()
                navigate('/')
              }}
            >
              Сдаться
            </button>
          </div>
        </Modal>
      )}

      {rulesOpen && (
        <Modal title="Правила" wide onClose={() => setRulesOpen(false)}>
          <RulesFrame />
        </Modal>
      )}

      {ended && (
        <Modal title={ended.winnerId === myId ? 'Победа' : 'Поражение'} onClose={() => {}}>
          <p className={s.modalText}>
            {ended.winnerId === myId
              ? 'Ваш ряд совпал с целью.'
              : `Победил ${nicknameOf(ended.winnerId)}.`}
          </p>
          <div className={s.modalActions}>
            <Button type="secondary" onClick={() => navigate('/')}>На главную</Button>
            <Button type="primary" onClick={restart}>Ещё раз</Button>
          </div>
        </Modal>
      )}
    </>
  )
}
