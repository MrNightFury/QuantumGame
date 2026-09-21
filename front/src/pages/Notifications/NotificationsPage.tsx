import { useState } from "react";
import s from "./NotificationsPage.module.css";
import { MOCK_INVITATIONS } from "../../data/mock";
import type { Invitation } from "../../types/profile";
import { Button } from "../../components/Button/Button";
import { ArrowLeft, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const NotificationsPage = () => {
    const [notifications] = useState<Invitation[]>(MOCK_INVITATIONS);
    const navigate = useNavigate();

    const handleAccept = (senderId: string) => {
        console.log(senderId);
    };

    const handleReject = (senderId: string) => {
        console.log(senderId);
    };

    return (
        <>
            <header className={s.header}>
                <div className={s.headerIconWrapper}>
                    <div className={s.headerIconButton}>
                        <ArrowLeft className={s.headerIcon} onClick={() => navigate('/')} />
                    </div>
                    <h2 className={s.headerTitle}>Приглашения</h2>
                </div>
            </header>
            <main className={s.notificationsWrapper}>
                {notifications ? (
                    <div className={s.notificationsList}>
                        {notifications.map((notification) => (
                            <div className={s.notification} key={notification.senderId}>
                                <div className={s.notificationInfo}>
                                    <h3 className={s.notificationTitle}>{notification.senderNickname}</h3>
                                    <p className={s.notificationText}>{new Date(notification.sendTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <div className={s.notificationButtons}>
                                    <Button type="secondary" onClick={() => handleReject(notification.senderId)}>
                                        <X color="#F87171" size={18} />
                                    </Button>
                                    <Button type="secondary" onClick={() => handleAccept(notification.senderId)}>
                                        <Check color="#4ADE80" size={18} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={s.notificationsEmpty}>
                        <p className={s.notificationsEmptyText}>Пока здесь ничего нет</p>
                    </div>
                )}
            </main>
        </>
    );
};