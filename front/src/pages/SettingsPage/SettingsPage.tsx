import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Mail, Trash, Info } from "lucide-react";
import { Switch } from "../../components/Switch/Switch";
import s from './SettingsPage.module.css';
import { Modal } from "../../components/Modal/Modal";
import { Button } from "../../components/Button/Button";
import { useNavigate } from "react-router-dom";
import { APP_VERSION } from "../../constants/app";

export const SettingsPage = () => {
    const [notificationsEnabled, setNotificationsEnabled] = useState(
        localStorage.getItem('notificationsEnabled') === 'true'
    );
    const [showModalChangeEmail, setShowModalChangeEmail] = useState(false);
    const [showModalDeleteAccount, setShowModalDeleteAccount] = useState(false);
    const [email, setEmail] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        localStorage.setItem('notificationsEnabled', String(notificationsEnabled));
    }, [notificationsEnabled]);

    const handleChangeEmail = () => {
        console.log(email);
        setShowModalChangeEmail(false);
    }

    const handleDeleteAccount = () => {
        console.log('delete account');
        setShowModalDeleteAccount(true);
    }

    return (
        <>
            <header className={s.header} onClick={() => navigate('/profile')}>
                <ArrowLeft className={s.headerIcon} />
                <span className={s.headerTitle}>Настройки</span>
            </header>

            <main className={s.main}>
                <section className={s.settingsSection}>
                    <h2 className={s.settingsSectionTitle}>Звук</h2>
                    <div className={s.settingsSectionContent}>
                        <div className={s.settingsSectionItem}>
                            <Bell />
                            <span className={s.settingsSectionItemTitle}>Звук приглашений</span>
                            <Switch checked={notificationsEnabled} onChange={setNotificationsEnabled} />
                        </div>
                    </div>
                </section>

                <section className={s.settingsSection}>
                    <h2 className={s.settingsSectionTitle}>Аккаунт</h2>
                    <div className={s.settingsSectionContent}>
                        <div className={s.settingsSectionItem} onClick={() => setShowModalChangeEmail(true)}>
                            <Mail />
                            <span className={s.settingsSectionItemTitle}>Сменить почту</span>
                        </div>
                        <div className={s.settingsSectionItem} onClick={handleDeleteAccount}>
                            <Trash />
                            <span className={`${s.settingsSectionItemTitle} ${s.settingsSectionItemTitleDelete}`}>Удалить аккаунт</span>
                        </div>
                    </div>
                </section>

                <section className={s.settingsSection}>
                    <h2 className={s.settingsSectionTitle}>О приложении</h2>
                    <div className={s.settingsSectionContent}>
                        <div className={s.settingsSectionItem}>
                            <Info />
                            <span className={s.settingsSectionItemTitle}>Версия</span>
                            <span className={s.settingsSectionItemValue}>{APP_VERSION}</span>
                        </div>
                    </div>
                </section>
            </main>

            {showModalChangeEmail && (
                <Modal title="Сменить почту" onClose={() => setShowModalChangeEmail(false)}>
                    <div className={s.modalContent}>
                        <div className={s.modalItem}>
                            <label className={s.modalItemLabel}>e-mail</label>
                            <input type="email" placeholder="Новая почта" className={s.modalInput} value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <Button type="primary" onClick={handleChangeEmail}>Сменить почту</Button>
                    </div>
                </Modal>
            )}

            {showModalDeleteAccount && (
                <Modal title="Удалить аккаунт" onClose={() => setShowModalDeleteAccount(false)}>
                    <div className={s.modalContent}>
                        <span className={s.modalInfo}>Вы уверены, что хотите удалить аккаунт?</span>
                        <Button type="primary" onClick={handleDeleteAccount}>Удалить аккаунт</Button>
                    </div>
                </Modal>
            )}
        </>
    );
};
