'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'motion/react';
import { cn } from '@/lib/utils';

interface SpotlightProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  glowSize?: number;
  /** Elemento raíz (para mantener la semántica de un `<section>`). */
  as?: 'div' | 'section' | 'article';
}

export function Spotlight({
  children,
  className = '',
  glowColor = 'rgba(255, 255, 255, 0.08)',
  glowSize = 250,
  as: Root = 'div',
}: SpotlightProps) {
  const containerRef = useRef<HTMLElement>(null);
  // Motion values en vez de estado: seguir al mouse no re-renderiza el contenido.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [opacity, setOpacity] = useState(0);
  const background = useMotionTemplate`radial-gradient(${glowSize}px circle at ${x}px ${y}px, ${glowColor}, transparent 80%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  };

  return (
    <Root
      ref={containerRef as React.RefObject<HTMLDivElement>}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={cn('relative overflow-hidden bg-neutral-950 border border-neutral-900 rounded-2xl p-6', className)}
    >
      {/* Dynamic Cursor Spotlight Layer */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-300"
        style={{ opacity, background }}
      />

      {/* Content wrapper */}
      <div className="relative z-10">{children}</div>
    </Root>
  );
}
