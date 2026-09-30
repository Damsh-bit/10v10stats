'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { SeasonTabs } from '@/components/season/season-tabs'
import { cn } from '@/lib/utils'

export type HallCard = {
  title: string
  value: string
  subtitle: string
  color: string
  matchId?: string
  playerId?: string
  bgImage?: string
  highlight?: boolean
}

export type HallScope = {
  key: string
  label: string
  hint?: string
  cards: HallCard[]
}

export function HallOfFameView({ scopes, initialKey }: { scopes: HallScope[]; initialKey: string }) {
  const [activeKey, setActiveKey] = useState(initialKey)
  const scope = scopes.find((s) => s.key === activeKey) ?? scopes[0]

  return (
    <div className="flex flex-col gap-5">
      <SeasonTabs
        options={scopes.map((s) => ({ value: s.key, label: s.label, hint: s.hint }))}
        value={scope.key}
        onChange={setActiveKey}
        layoutId="hall-scope-tab"
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={scope.key}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {scope.cards.map((card) => (
            <motion.div
              key={card.title}
              variants={{
                hidden: { opacity: 0, y: 14, scale: 0.98 },
                show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
              }}
              whileHover={{ y: -3 }}
              className={cn(
                'relative flex flex-col gap-1 overflow-hidden rounded-xl border bg-card p-6 shadow-sm',
                card.highlight ? 'border-amber-300/40' : 'border-border',
              )}
            >
              {card.bgImage && (
                <>
                  <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url('${card.bgImage}')` }} />
                  <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
                </>
              )}
              {card.highlight && (
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-amber-300/15 via-transparent to-transparent" aria-hidden="true" />
              )}

              <div className="relative z-10 flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className={cn('text-sm font-semibold uppercase tracking-wider', card.bgImage ? 'text-white/80' : 'text-muted-foreground')}>
                    {card.title}
                  </h3>
                  {card.matchId && (
                    <Link
                      href={`/matches/${card.matchId}`}
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase transition-colors',
                        card.bgImage ? 'bg-white/20 text-white hover:bg-white/40' : 'bg-primary/15 text-brand hover:bg-primary hover:text-white',
                      )}
                      title="Ver partida del récord"
                    >
                      Ver
                    </Link>
                  )}
                </div>
                <p className={cn('font-mono text-3xl font-bold', card.color)}>{card.value}</p>
                {card.playerId ? (
                  <Link href={`/players/${card.playerId}`} className="w-fit text-sm font-medium text-foreground hover:underline">
                    {card.subtitle}
                  </Link>
                ) : (
                  <p className={cn('text-sm font-medium', card.bgImage ? 'text-white/90' : 'text-foreground')}>{card.subtitle}</p>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
