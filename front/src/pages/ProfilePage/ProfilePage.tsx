import { Pencil, Star, Flag } from 'lucide-react';
import { Button } from '../../components/Button/Button';
import s from './ProfilePage.module.css';
import { useNavigate } from 'react-router-dom';
import { MOCK_PROFILE } from '../../data/mock';
import type { AuthorizedUser } from '../../types/profile';
import { useState } from 'react';
import { Modal } from '../../components/Modal/Modal';

export const ProfilePage = () => {
    const navigate = useNavigate();
    const profile: AuthorizedUser = MOCK_PROFILE;

    const [isEditMode, setIsEditMode] = useState(false);
    const [profileNickname, setProfileNickname] = useState(profile.nickname);

    const handleSaveProfile = () => {
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
                                <h2 className={s.profileInfoTitle}>{profileNickname}</h2>
                                <div className={s.profileInfoTitleEditButton} onClick={() => setIsEditMode(true)}>
                                    <Pencil className={s.profileInfoTitleEditIcon} />
                                </div>
                            </div>
                            <span className={s.profileInfoTitleId}>#{profile.id}</span>
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
                            <h3 className={s.profileInfoItemValue}>{profile.winsAmount}</h3>
                            <span className={s.profileInfoItemLabel}>Победы</span>
                        </div>
                    </div>
                </div>
            </main>

            {isEditMode && (
                <Modal title="Редактирование профиля" onClose={() => setIsEditMode(false)}>
                    <div className={s.profileInfoEditModalContent}>
                        <div className={s.profileInfoEditModalItem}>
                            <label className={s.profileInfoEditModalLabel}>Никнейм</label>
                            <input className={s.profileInfoEditModalInput} type="text" placeholder="Никнейм" value={profileNickname} onChange={(e) => setProfileNickname(e.target.value)} />
                        </div>
                        <Button type="primary" onClick={handleSaveProfile}>Сохранить</Button>
                    </div>
                </Modal>
            )}
        </>
    );
};
