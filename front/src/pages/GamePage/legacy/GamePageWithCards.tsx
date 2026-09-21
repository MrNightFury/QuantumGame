import {
    DndContext,
    DragOverlay,
    PointerSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import { Menu } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/Button/Button';
import { Modal } from '../../../components/Modal/Modal';
import {
    applyGameAction,
    canPlayFieldCard,
    createDemoSession,
    endTurn,
    getAxisForCard,
    getStatesOnAxis,
    isMyTurn,
    parseSlotKey,
} from '../../../game';
import type { BoardSlotState, PlayTarget } from '../../../game/types';
import { getCardImageUrl, getDiceImageUrl } from '../../../lib/assets';
import type { HandCard } from '../../../types/card';
import type { GameAction, GameSession } from '../../../types/game';
import { BoardSlot, DraggableCard, TapCard } from './GameBoardWithCards';
import { RulesFrame } from '../RulesFrame';
import {
    DOUBLE_TAP_CARDS,
    DOUBLE_TAP_MS,
    TURN_SEC,
    formatTimer,
    handCardStyle,
} from '../gameHelpers';
import s from '../GamePage.module.css';

const avatar = (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11.25,17.25h1.5L12,18z"/>
        <path d="m15,12 l2,2"/>
        <path d="M18,6.5a0.5,0.5 0,0 0,-0.5 -0.5"/>
        <path d="M20.69,9.67a4.5,4.5 0,1 0,-7.04 -5.5,8.35 8.35,0 0,0 -3.3,0 4.5,4.5 0,1 0,-7.04 5.5C2.49,11.2 2,12.88 2,14.5 2,19.47 6.48,22 12,22s10,-2.53 10,-7.5c0,-1.62 -0.48,-3.3 -1.3,-4.83"/>
        <path d="M6,6.5a0.495,0.495 0,0 1,0.5 -0.5"/>
        <path d="m9,12 l-2,2"/>
    </svg>
);

export const GamePageWithCards = () => {
    const navigate = useNavigate();
    const [session, setSession] = useState<GameSession>(() => createDemoSession());
    const [timer, setTimer] = useState(TURN_SEC);
    const [menuOpen, setMenuOpen] = useState(false);
    const [rulesOpen, setRulesOpen] = useState(false);

    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [swapCardId, setSwapCardId] = useState<string | null>(null);
    const [swapFirst, setSwapFirst] = useState<PlayTarget | null>(null);
    const [rotatePick, setRotatePick] = useState<{ cardId: string; target: PlayTarget } | null>(null);
    const [reshuffleId, setReshuffleId] = useState<string | null>(null);
    const [reshuffleCount, setReshuffleCount] = useState<number | null>(null);
    const [reshuffleSelected, setReshuffleSelected] = useState<string[]>([]);
    const [previewCard, setPreviewCard] = useState<HandCard | null>(null);

    const lastTapRef = useRef<Record<string, number>>({});
    const skipNextTapRef = useRef(false);

    const myTurn = isMyTurn(session);
    const interactionDisabled = !myTurn || !!swapCardId || !!previewCard;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    );

    useEffect(() => {
        if (myTurn) {
            setTimer(TURN_SEC);
            return;
        }

        const id = window.setTimeout(() => {
            setSession((prev) => endTurn(prev));
        }, 1500);

        return () => window.clearTimeout(id);
    }, [session.currentPlayerId, myTurn]);

    useEffect(() => {
        const id = window.setInterval(() => {
            setTimer((t) => (t <= 1 ? TURN_SEC : t - 1));
        }, 1000);
        return () => window.clearInterval(id);
    }, []);

    const runAction = (action: GameAction) => {
        setSession((prev) => {
            const result = applyGameAction(prev, action);
            if (!result.ok) return prev;
            return result.state;
        });
    };

    const findCard = (id: string) => (
        session.myHand.find((c) => c.instanceId === id)
        ?? Object.values(session.fieldCards).find((c) => c.instanceId === id)
    );

    const onDragEnd = (event: DragEndEvent) => {
        setDraggingId(null);
        if (swapCardId || !myTurn) return;

        const { active, over } = event;
        if (!over) return;

        const card = findCard(String(active.id));
        if (!card || !session.myHand.some((c) => c.instanceId === card.instanceId)) return;

        const target = parseSlotKey(String(over.id));
        if (!target) return;
        if (!canPlayFieldCard(session, card.cardId, target)) return;

        if (card.cardId === 'rotate_x' || card.cardId === 'rotate_y' || card.cardId === 'rotate_z') {
            setRotatePick({ cardId: card.instanceId, target });
            return;
        }

        runAction({ type: 'PLAY_FIELD_CARD', cardInstanceId: card.instanceId, target });
    };

    const onSlotPick = (target: PlayTarget) => {
        if (!swapCardId) return;

        if (!swapFirst) {
            setSwapFirst(target);
            return;
        }

        if (swapFirst.owner === target.owner && swapFirst.index === target.index) {
            setSwapFirst(null);
            return;
        }

        const result = applyGameAction(session, {
            type: 'PLAY_SWAP',
            cardInstanceId: swapCardId,
            first: swapFirst,
            second: target,
        });

        if (!result.ok) return;

        setSession(result.state);
        setSwapCardId(null);
        setSwapFirst(null);
    };

    const onTapCard = (card: HandCard) => {
        if (!myTurn || interactionDisabled) return;
        if (!DOUBLE_TAP_CARDS.has(card.cardId)) return;

        const now = Date.now();
        const last = lastTapRef.current[card.instanceId];

        if (last && now - last < DOUBLE_TAP_MS) {
            delete lastTapRef.current[card.instanceId];
            if (card.cardId === 'identity') {
                runAction({ type: 'PLAY_IDENTITY', cardInstanceId: card.instanceId });
            } else if (card.cardId === 'kronecker_multiplication') {
                runAction({ type: 'PLAY_KRONECKER', cardInstanceId: card.instanceId });
            } else if (card.cardId === 'swap') {
                if (swapCardId === card.instanceId) {
                    setSwapCardId(null);
                    setSwapFirst(null);
                } else {
                    setSwapCardId(card.instanceId);
                    setSwapFirst(null);
                }
            } else if (card.cardId === 'reshuffle') {
                setReshuffleId(card.instanceId);
                setReshuffleCount(null);
                setReshuffleSelected([]);
            }
            return;
        }

        lastTapRef.current[card.instanceId] = now;
    };

    const activeCard = draggingId ? findCard(draggingId) : null;
    const draggingHandCard = activeCard && session.myHand.some((c) => c.instanceId === activeCard.instanceId)
        ? activeCard
        : null;

    const getDropOk = (owner: 'my' | 'opponent', index: number): boolean | null => {
        if (!draggingHandCard) return null;
        return canPlayFieldCard(session, draggingHandCard.cardId, { owner, index });
    };

    const rotateCard = rotatePick ? session.myHand.find((c) => c.instanceId === rotatePick.cardId) : null;
    const rotateDice = rotatePick
        ? (rotatePick.target.owner === 'my'
            ? session.mySlots[rotatePick.target.index].dice
            : session.opponentSlots[rotatePick.target.index].dice)
        : null;
    const rotateAxis = rotateCard ? getAxisForCard(rotateCard.cardId) : null;

    const renderRow = (owner: 'my' | 'opponent', slots: BoardSlotState[], label: string) => (
        <>
            <div className={s.rowLabel}>{label}</div>
            <div className={s.boardRow}>
                {slots.map((slot, index) => {
                    const slotId = `${owner}-${index}`;
                    const selected = swapFirst?.owner === owner && swapFirst.index === index;

                    return (
                        <BoardSlot
                            key={slotId}
                            slotId={slotId}
                            slot={slot}
                            card={session.fieldCards[slotId] ?? null}
                            disabled={interactionDisabled}
                            swapMode={!!swapCardId}
                            selected={selected}
                            dropOk={getDropOk(owner, index)}
                            onPick={onSlotPick}
                        />
                    );
                })}
            </div>
        </>
    );

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(e) => setDraggingId(String(e.active.id))}
            onDragEnd={onDragEnd}
            onDragCancel={() => setDraggingId(null)}
        >
            <header className={s.gameHeader}>
                <div className={s.menuButton} onClick={() => setMenuOpen(true)}>
                    <Menu className={s.menuIcon} />
                </div>
            </header>

            <main className={s.main}>
                <section className={s.playersBar}>
                    <div className={s.playersRow}>
                        <div className={`${s.playerCard} ${myTurn ? s.playerCardActive : ''}`}>
                            <div className={s.playerAvatar}>{avatar}</div>
                            <span className={s.playerName}>{session.myNickname}</span>
                            <span className={`${s.playerStatus} ${myTurn ? s.playerStatusActive : ''}`}>
                                {myTurn ? '╨Т╨Р╨и ╨е╨Ю╨Ф' : '╨Ц╨Ф╨Ш╨в╨Х'}
                            </span>
                        </div>
                        <div className={s.turnTimer}>
                            <span className={s.turnTimerText}>{formatTimer(timer)}</span>
                            <div className={s.turnTimerBar}>
                                <div className={s.turnTimerFill} style={{ width: `${(timer / TURN_SEC) * 100}%` }} />
                            </div>
                        </div>
                        <div className={`${s.playerCard} ${!myTurn ? s.playerCardActive : ''}`}>
                            <div className={s.playerAvatar}>{avatar}</div>
                            <span className={s.playerName}>{session.opponentNickname}</span>
                            <span className={`${s.playerStatus} ${!myTurn ? s.playerStatusActive : ''}`}>
                                {!myTurn ? '╨е╨Ю╨Ф╨Ш╨в' : '╨Ц╨Ф╨Ш╨в╨Х'}
                            </span>
                        </div>
                    </div>
                </section>

                <section className={s.targetSection}>
                    <span className={s.sectionLabel}>╨ж╨╡╨╗╤М</span>
                    <div className={s.targetRow}>
                        {session.targetSlots.map((state, i) => (
                            <div className={s.targetDiceSlot} key={i}>
                                <img className={s.targetDiceImage} src={getDiceImageUrl(state)} alt="" />
                            </div>
                        ))}
                    </div>
                </section>

                <section className={s.boardSection}>
                    <div className={s.boardContainer}>
                        {renderRow('opponent', session.opponentSlots, '╨б╨╛╨┐╨╡╤А╨╜╨╕╨║')}
                        {renderRow('my', session.mySlots, '╨Т╨░╤И ╤А╤П╨┤')}
                    </div>
                </section>

                <section className={s.handSection}>
                    <span className={s.sectionLabel}>╨а╤Г╨║╨░</span>
                    <div className={s.handContainer}>
                        {session.myHand.map((card, i) => {
                            const style = handCardStyle(i, session.myHand.length);

                            if (DOUBLE_TAP_CARDS.has(card.cardId)) {
                                return (
                                    <TapCard
                                        key={card.instanceId}
                                        card={card}
                                        style={style}
                                        disabled={interactionDisabled}
                                        onTap={onTapCard}
                                        onLongPress={setPreviewCard}
                                        skipNextTapRef={skipNextTapRef}
                                    />
                                );
                            }

                            return (
                                <DraggableCard
                                    key={card.instanceId}
                                    card={card}
                                    style={style}
                                    disabled={interactionDisabled}
                                    onLongPress={setPreviewCard}
                                />
                            );
                        })}
                    </div>
                </section>
            </main>

            <DragOverlay dropAnimation={null}>
                {activeCard && (
                    <div className={s.dragPreview}>
                        <img className={s.cardImage} src={getCardImageUrl(activeCard.cardId)} alt="" draggable={false} />
                    </div>
                )}
            </DragOverlay>

            {menuOpen && (
                <Modal title="╨Ь╨╡╨╜╤О" onClose={() => setMenuOpen(false)}>
                    <div className={s.menuModalContent}>
                        <button
                            type="button"
                            className={s.menuModalItem}
                            onClick={() => {
                                setMenuOpen(false);
                                setRulesOpen(true);
                            }}
                        >
                            ╨Я╤А╨░╨▓╨╕╨╗╨░
                        </button>
                        <button
                            type="button"
                            className={`${s.menuModalItem} ${s.menuModalItemDanger}`}
                            onClick={() => navigate('/')}
                        >
                            ╨б╨┤╨░╤В╤М╤Б╤П
                        </button>
                    </div>
                </Modal>
            )}

            {rulesOpen && (
                <Modal title="╨Я╤А╨░╨▓╨╕╨╗╨░" wide onClose={() => setRulesOpen(false)}>
                    <RulesFrame />
                </Modal>
            )}

            {previewCard && (
                <Modal fitContent title="" onClose={() => setPreviewCard(null)}>
                    <img
                        className={s.cardPreviewImage}
                        src={getCardImageUrl(previewCard.cardId)}
                        alt=""
                        draggable={false}
                    />
                </Modal>
            )}

            {rotatePick && rotateDice && rotateAxis && (
                <Modal title="" onClose={() => setRotatePick(null)}>
                    <div className={s.rotateGrid}>
                        {getStatesOnAxis(rotateAxis).map((state) => (
                            <button
                                key={state}
                                type="button"
                                className={`${s.rotateOption} ${state === rotateDice ? s.rotateOptionCurrent : ''}`}
                                onClick={() => {
                                    runAction({
                                        type: 'PLAY_FIELD_CARD',
                                        cardInstanceId: rotatePick.cardId,
                                        target: rotatePick.target,
                                        rotateTarget: state,
                                    });
                                    setRotatePick(null);
                                }}
                            >
                                <img src={getDiceImageUrl(state)} alt="" className={s.rotateDice} />
                            </button>
                        ))}
                    </div>
                    <Button type="secondary" onClick={() => setRotatePick(null)}>╨Ю╤В╨╝╨╡╨╜╨░</Button>
                </Modal>
            )}

            {reshuffleId && reshuffleCount === null && (
                <Modal title="" onClose={() => setReshuffleId(null)}>
                    <div className={s.reshuffleCountRow}>
                        {[1, 2, 3, 4].map((n) => (
                            <button key={n} type="button" className={s.reshuffleCountBtn} onClick={() => setReshuffleCount(n)}>
                                {n}
                            </button>
                        ))}
                    </div>
                </Modal>
            )}

            {reshuffleId && reshuffleCount !== null && (
                <Modal title="" onClose={() => { setReshuffleId(null); setReshuffleCount(null); }}>
                    <div className={s.reshuffleCards}>
                        {session.myHand
                            .filter((c) => c.instanceId !== reshuffleId)
                            .map((card) => {
                                const picked = reshuffleSelected.includes(card.instanceId);
                                return (
                                    <button
                                        key={card.instanceId}
                                        type="button"
                                        className={`${s.reshuffleCardBtn} ${picked ? s.reshuffleCardSelected : ''}`}
                                        onClick={() => {
                                            if (picked) {
                                                setReshuffleSelected(reshuffleSelected.filter((id) => id !== card.instanceId));
                                                return;
                                            }
                                            if (reshuffleSelected.length >= reshuffleCount) return;
                                            setReshuffleSelected([...reshuffleSelected, card.instanceId]);
                                        }}
                                    >
                                        <img src={getCardImageUrl(card.cardId)} alt="" />
                                    </button>
                                );
                            })}
                    </div>
                    <div className={s.modalActions}>
                        <Button type="secondary" onClick={() => setReshuffleId(null)}>╨Ю╤В╨╝╨╡╨╜╨░</Button>
                        <Button
                            type="primary"
                            onClick={() => {
                                if (reshuffleSelected.length !== reshuffleCount) return;
                                runAction({
                                    type: 'PLAY_RESHUFFLE',
                                    cardInstanceId: reshuffleId,
                                    discardInstanceIds: reshuffleSelected,
                                });
                                setReshuffleId(null);
                                setReshuffleCount(null);
                                setReshuffleSelected([]);
                            }}
                        >
                            ╨Ч╨░╨╝╨╡╨╜╨╕╤В╤М
                        </Button>
                    </div>
                </Modal>
            )}
        </DndContext>
    );
};
