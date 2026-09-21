import { BackgroundBlur } from "../BackgroundBlur/BackgroundBlur";
import { BottomNav } from "../BottomNav/BottomNav";
import s from "./Layout.module.css";
import { useLocation } from "react-router-dom";

export const Layout = ({ children }: { children: React.ReactNode }) => {
    const pathname = useLocation().pathname;

    console.log(pathname);

    return (
        <>
            <BackgroundBlur />
            <div className={s.layout}>
                {children}
                {pathname !== '/game' && <BottomNav />}
            </div>
        </>
    );
};
