import s from './Switch.module.css'

export const Switch = ({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    className={`${s.switch} ${checked ? s.checked : ''}`}
    onClick={() => onChange(!checked)}
  >
    <span className={s.thumb} />
  </button>
)
