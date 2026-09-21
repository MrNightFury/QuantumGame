import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import s from './HistoryPage.module.css';
import { useEffect, useState } from "react";
import { MOCK_HISTORY } from "../../data/mock";
import type { GameHistoryItem } from "../../types/profile";

export const HistoryPage = () => {
    const navigate = useNavigate();
    const [history, setHistory] = useState<GameHistoryItem[]>([]);

    useEffect(() => {
        setHistory(MOCK_HISTORY);
    }, []);

    return (
        <>
            <header className={s.header} onClick={() => navigate('/profile')}>
                <ArrowLeft className={s.headerIcon} />
                <span className={s.headerTitle}>История</span>
            </header>

            <main className={s.main}>
                <div className={s.historyList}>
                    {history.map((item, index) => (
                        <div className={s.historyItem} key={index}>
                            <div className={s.historyItemInfo}>
                                <span className={s.historyItemTitle}>{item.opponentNickname}</span>
                                <div className={s.historyItemStatusContainer}>
                                    <div className={s.historyItemStatusIcon} style={{ backgroundColor: item.isWinner ? '#4CAF50' : '#F44336' }}/>
                                    <span className={s.historyItemStatus} >{item.isWinner ? 'Победа' : 'Поражение'}</span>
                                </div>
                                <span className={s.historyItemDate}>{new Date(item.playedAt).toLocaleDateString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className={s.historyItemStats}>
                                <span className={s.historyItemMoves}>{item.totalMoves} ходов</span>
                                <span className={`${s.historyItemRating} ${item.ratingChange > 0 ? s.positive : s.negative}`}>{item.ratingChange > 0 ? `+${item.ratingChange}` : item.ratingChange}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </>
    );
};
