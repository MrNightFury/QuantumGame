import { Button } from "../../components/Button/Button";
import s from "./Authorization.module.css";
import { Mail, Lock } from "lucide-react";

export const AuthorizationPage = () => {
    return (
        <div className={s.authorizationPage}>
            <div className={s.authorizationPageContent}>
                <h1>Суперпозиция</h1>
                <p>Войдите или создайте аккаунт</p>
            </div>
        
            <form className={s.form}>
                <div className={s.inputWrapper}>
                    <Mail className={s.icon} />
                    <input type="email" placeholder="Email" />
                </div>
                <div className={s.inputWrapper}>
                    <Lock className={s.icon} />
                    <input type="password" placeholder="Password" />
                </div>
                <Button type="primary" onClick={() => {}}>Войти</Button>
                <Button type="secondary" onClick={() => {}}>Зарегистрироваться</Button>
            </form>
        </div>
    );
};