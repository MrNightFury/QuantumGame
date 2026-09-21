import { useEffect, useRef, useState } from 'react'
import { RULES_DOC_URL, RULES_DOC_WIDTH, RULES_FRAME_HEIGHT } from './gameHelpers'
import s from './GamePage.module.css'

export function RulesFrame() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const update = () => {
      const width = wrapRef.current?.clientWidth ?? RULES_DOC_WIDTH
      setScale(Math.min(1, width / RULES_DOC_WIDTH))
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <div
      ref={wrapRef}
      className={s.rulesFrameWrap}
      style={{ height: RULES_FRAME_HEIGHT * scale }}
    >
      <iframe
        className={s.rulesFrame}
        src={`${RULES_DOC_URL}?embedded=true`}
        title="Правила игры"
        style={{
          width: RULES_DOC_WIDTH,
          height: RULES_FRAME_HEIGHT / scale,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  )
}
