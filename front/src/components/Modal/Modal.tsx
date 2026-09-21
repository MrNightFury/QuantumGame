import s from "./Modal.module.css";

export const Modal = ({
    children,
    title,
    onClose,
    fitContent = false,
    wide = false,
}: {
    children: React.ReactNode;
    title: string;
    onClose: () => void;
    fitContent?: boolean;
    wide?: boolean;
}) => {
    return (
        <div className={s.modalWrapper} onClick={onClose}>
            <div
                className={`${s.modal} ${fitContent ? s.modalFit : ''} ${wide ? s.modalWide : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`${s.modalContent} ${fitContent ? s.modalContentFit : ''}`}>
                    {!fitContent && title ? <h2 className={s.modalTitle}>{title}</h2> : null}
                    {children}
                </div>
            </div>
        </div>
    );
};