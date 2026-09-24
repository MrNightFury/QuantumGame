import { Pencil, Star, Flag } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import s from './ProfilePage.module.css';
import { useNavigate } from 'react-router-dom';
import { MOCK_PROFILE } from '../../data/mock';
import type { AuthorizedUser } from '../../types/profile';
import { useState, useSyncExternalStore } from 'react';
import { Modal } from '../../components/Modal/Modal';
import { getConnectionState, subscribeConnection, setPlayerName } from '../../api/connection';

export const ProfilePage = () => {
    const navigate = useNavigate();
    const profile: AuthorizedUser = MOCK_PROFILE;
    const { userId, onlineUsers } = useSyncExternalStore(subscribeConnection, getConnectionState);

    // Ник как на странице онлайна (player+id). Черновик переименования валиден,
    // пока подтверждённое имя не менялось (base) или сервер временно снял его
    // (removeOnlineUser перед addOnlineUser — см. setPlayerName в EVENTS.md).
    // Когда приходит новое подтверждённое имя (возможно, обрезанное до 32
    // символов или с суффиксом при занятом), черновик замещается им.
    const confirmedName = onlineUsers.find((user) => user.id === userId)?.name ?? null;
    const [draft, setDraft] = useState<{ value: string; base: string | null } | null>(null);
    const isDraftValid = draft !== null && (confirmedName === null || confirmedName === draft.base);
    const displayedNickname = (isDraftValid ? draft.value : null) ?? confirmedName ?? 'Игрок';
    const [isEditMode, setIsEditMode] = useState(false);

    const handleOpenEdit = () => {
        setDraft({ value: displayedNickname, base: confirmedName });
        setIsEditMode(true);
    };

    const handleCloseEdit = () => {
        setDraft(null);
        setIsEditMode(false);
    };

    const handleSaveProfile = () => {
        const nextName = (draft?.value ?? '').trim();
        // Пустая строка игнорируется сервером (EVENTS.md); false от отправки —
        // нет соединения. В обоих случаях откатываемся на подтверждённое имя.
        const sent = nextName !== '' && setPlayerName(nextName);
        if (!sent) {
            setDraft(null);
        }
        setIsEditMode(false);
    };

    return (
        <>
            <header className={s.header}>
                <div className={s.headerInfo}>
                    <Button type="secondary" onClick={() => navigate('/')}>Выйти</Button>
                </div>
            </header>

            <main className={s.main}>
                <div className={s.profileInfo}>
                    <div className={s.profileInfoHeader}>
                        <div className={s.profileAvatar}>
                            <svg xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#FFFFFF"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round">
                                <path d="M11.25,17.25h1.5L12,18z"/>
                                <path d="m15,12 l2,2"/>
                                <path d="M18,6.5a0.5,0.5 0,0 0,-0.5 -0.5"/>
                                <path d="M20.69,9.67a4.5,4.5 0,1 0,-7.04 -5.5,8.35 8.35,0 0,0 -3.3,0 4.5,4.5 0,1 0,-7.04 5.5C2.49,11.2 2,12.88 2,14.5 2,19.47 6.48,22 12,22s10,-2.53 10,-7.5c0,-1.62 -0.48,-3.3 -1.3,-4.83"/>
                                <path d="M6,6.5a0.495,0.495 0,0 1,0.5 -0.5"/>
                                <path d="m9,12 l-2,2"/>
                            </svg>
                        </div>
                        <div className={s.profileInfoTitle}>
                            <div className={s.profileInfoTitleContainer}>
                                <h2 className={s.profileInfoTitle}>{displayedNickname}</h2>
                                <div className={s.profileInfoTitleEditButton} onClick={handleOpenEdit}>
                                    <Pencil className={s.profileInfoTitleEditIcon} />
                                </div>
                            </div>
                            <span className={s.profileInfoTitleId}>#{userId ?? '—'}</span>
                        </div>
                    </div>

                    <div className={s.profileInfoItems}>
                        <div className={s.profileInfoItem}>
                            <Star color="#6C8CFF" />
                            <h3 className={s.profileInfoItemValue}>{profile.ratingPoints}</h3>
                            <span className={s.profileInfoItemLabel}>Рейтинг</span>
                        </div>
                        <div className={s.profileInfoItem}>
                            <Flag color="#FFD700" />
                            <h3 className={s.profileInfoItemValue}>WIP</h3>
                            <span className={s.profileInfoItemLabel}>Победы</span>
                        </div>
                    </div>
                </div>
            </main>

            {isEditMode && (
                <Modal title="Редактирование профиля" onClose={handleCloseEdit}>
                    <div className={s.profileInfoEditModalContent}>
                        <div className={s.profileInfoEditModalItem}>
                            <label className={s.profileInfoEditModalLabel}>Никнейм</label>
                            <input className={s.profileInfoEditModalInput} type="text" placeholder="Никнейм" maxLength={32} value={draft?.value ?? ''} onChange={(e) => setDraft({ value: e.target.value, base: draft?.base ?? confirmedName })} />
                        </div>
                        <Button type="primary" onClick={handleSaveProfile}>Сохранить</Button>
                    </div>
                </Modal>
            )}
        </>
    );
};
