import { useEffect, useMemo, useRef, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectCoverflow } from 'swiper/modules'
import type { Swiper as SwiperInstance } from 'swiper'
import 'swiper/css'
import 'swiper/css/effect-coverflow'

import { onServerEvent } from '../../api/serverEvents'
import { writeCard } from '../../api/game'
import { ALL_CARD_IDS } from '../../data/cards'
import { getCardImageUrl } from '../../lib/assets'
import { Button } from '../../components/Button/Button'
import { Modal } from '../../components/Modal/Modal'
import type { CardId } from '../../types/card'
import s from './InfoPage.module.css'

const CARD_COUNT = ALL_CARD_IDS.length

/** Позиция карты в колоде — для перехода слайдера по cardScanned. */
const CARD_INDEX = new Map<string, number>(
  ALL_CARD_IDS.map((cardId, index) => [cardId, index] as const),
)

function fixLoopPosition(swiper: SwiperInstance) {
  const index = swiper.activeIndex

  if (index < CARD_COUNT) {
    swiper.slideTo(index + CARD_COUNT, 0)
    return
  }

  if (index >= CARD_COUNT * 2) {
    swiper.slideTo(index - CARD_COUNT, 0)
  }
}

export const InfoPage = () => {
  const swiperRef = useRef<SwiperInstance | null>(null)
  // 'idle' — окно закрыто; 'waiting' — ждём прикладывания карты;
  // 'done' — карта записана (пришло cardWritten).
  const [writeState, setWriteState] = useState<'idle' | 'waiting' | 'done'>('idle')

  const slides = useMemo(
    () => [...ALL_CARD_IDS, ...ALL_CARD_IDS, ...ALL_CARD_IDS],
    [],
  )

  // Считывание карты контроллером → показать её в картотеке.
  // cardWritten → карта записана в реестр, закрываем ожидание.
  useEffect(() => {
    const unsubscribe = onServerEvent((event) => {
      if (event.event === 'cardWritten') {
        setWriteState('done')
        return
      }
      if (event.event !== 'cardScanned' || !event.data.registered) return
      const index = event.data.type !== undefined ? CARD_INDEX.get(event.data.type) : undefined
      if (index === undefined || swiperRef.current === null) return
      // Средняя копия слайдов — та, что открыта по умолчанию (initialSlide = CARD_COUNT).
      swiperRef.current.slideTo(index + CARD_COUNT, 400)
    })
    return unsubscribe
  }, [])

  /** Карта, выбранная на слайдере (activeIndex живёт в средней копии колоды). */
  const currentCardId = (): CardId => {
    const index = swiperRef.current?.activeIndex ?? CARD_COUNT
    return ALL_CARD_IDS[index % CARD_COUNT]
  }

  const startWrite = () => {
    writeCard(currentCardId())
    setWriteState('waiting')
  }

  const cancelWrite = () => {
    writeCard('')
    setWriteState('idle')
  }

  const finishWrite = () => {
    setWriteState('idle')
  }

  return (
    <>
      <header className={s.header}>
        <div className={s.headerInfo}>
          <h2 className={s.headerTitle}>Картотека</h2>
          <p className={s.headerText}>Коллекция квантовых карт</p>
        </div>
      </header>

      <main className={s.main}>
        <Swiper
          className={s.swiper}
          modules={[EffectCoverflow]}
          effect="coverflow"
          grabCursor
          centeredSlides
          slidesPerView="auto"
          spaceBetween={12}
          speed={400}
          initialSlide={CARD_COUNT}
          coverflowEffect={{
            rotate: 32,
            stretch: 0,
            depth: 140,
            modifier: 1.35,
            slideShadows: false,
          }}
          onSwiper={(swiper) => {
            swiperRef.current = swiper
          }}
          onSlideChangeTransitionEnd={fixLoopPosition}
        >
          {slides.map((cardId, index) => (
            <SwiperSlide key={`${cardId}-${index}`} className={s.slide}>
              <img
                className={s.cardImage}
                src={getCardImageUrl(cardId)}
                alt={cardId}
                loading="lazy"
              />
            </SwiperSlide>
          ))}
        </Swiper>

        <Button type="primary" className={s.writeButton} onClick={startWrite}>
          Записать карту
        </Button>
      </main>

      {writeState !== 'idle' && (
        <Modal
          title={writeState === 'waiting' ? 'Запись карты' : 'Карта записана'}
          onClose={writeState === 'waiting' ? cancelWrite : finishWrite}
        >
          <p className={s.writeText}>
            {writeState === 'waiting' ? 'Приложите карту' : 'Карта записана'}
          </p>
          <div className={s.writeActions}>
            {writeState === 'waiting' ? (
              <Button type="secondary" onClick={cancelWrite}>
                Отмена
              </Button>
            ) : (
              <Button type="primary" onClick={finishWrite}>
                Ок
              </Button>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
