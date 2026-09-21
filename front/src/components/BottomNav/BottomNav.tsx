import s from "./BottomNav.module.css";
import { Home, Info, User } from 'lucide-react';
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const items = [
    {
        id: 0,
        icon: <Home />,
        label: "Главная",
        path: "/",
    },
    {
        id: 1,
        icon: <Info />,
        label: "Информация",
        path: "/info",
    },
    {
        id: 2,
        icon: <User />,
        label: "Профиль",
        path: "/profile",
    },
];

export const BottomNav = () => {
    const navigate = useNavigate();
    const [activeItem, setActiveItem] = useState(0);

    const handleClick = (id: number) => {
        setActiveItem(id);
        navigate(items[id].path);
    };

    return (
        <nav className={s.bottomNav}>
            <ul className={s.bottomNavList}>
                {items.map((item) => (
                    <li key={item.id} className={`${s.bottomNavItem} ${activeItem === item.id ? s.active : ""}`} onClick={() => handleClick(item.id)}>
                        <div className={`${s.bottomNavLink} ${activeItem === item.id ? s.activeLogo : ""}`} aria-label={item.label}>
                            {item.icon}
                        </div>
                    </li>
                ))}
            </ul>
        </nav>
    );
};