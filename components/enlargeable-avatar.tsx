'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { PlayerAvatar } from './strike-ui'
import type { Player } from '@/lib/mockData'

export function EnlargeableAvatar({ player, size = 80 }: { player: Player; size?: number }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="cursor-pointer transition-transform hover:scale-105 active:scale-95 border-0 bg-transparent p-0 flex rounded-full ring-2 ring-transparent hover:ring-primary/50"
        title="Ver foto"
      >
        <PlayerAvatar player={player} size={size} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div 
            className="relative flex flex-col items-center animate-in fade-in zoom-in duration-200" 
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute -right-4 -top-4 md:-right-12 md:-top-8 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors z-10 bg-black/50 backdrop-blur-md"
            >
              <X className="h-6 w-6" />
            </button>
            
            {player.photoUrl ? (
              <img
                src={player.photoUrl}
                alt={player.name}
                className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl border border-white/10"
              />
            ) : (
              <div 
                className="flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 font-mono font-bold shadow-2xl border border-white/10"
                style={{
                  width: Math.min(window.innerWidth * 0.8, 400),
                  height: Math.min(window.innerWidth * 0.8, 400),
                  fontSize: Math.min(window.innerWidth * 0.8, 400) * 0.4
                }}
              >
                {(player.name || '??').slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
