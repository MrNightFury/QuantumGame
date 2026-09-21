import s from "./Button.module.css";

export const Button = ({ children, onClick, type, className }: { children: React.ReactNode, onClick: () => void, type: "primary" | "secondary", className?: string }) => {
    return (
        <button className={`${s.button} ${type === "primary" ? s.primary : s.secondary} ${className}`} onClick={onClick}>
            {children}
        </button>
    );
};