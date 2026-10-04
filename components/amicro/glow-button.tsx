'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

type GlowButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  glowColor?: string;
};

export function GlowButton({
  children,
  className = '',
  glowColor = 'rgba(59, 130, 246, 0.15)', // Light blue default
  onMouseMove,
  onMouseEnter,
  onMouseLeave,
  ...props
}: GlowButtonProps) {
  const containerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseMove?.(e);
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <button
      ref={containerRef}
      type="button"
      {...props}
      onMouseMove={handleMouseMove}
      onMouseEnter={(e) => {
        onMouseEnter?.(e);
        setOpacity(1);
      }}
      onMouseLeave={(e) => {
        onMouseLeave?.(e);
        setOpacity(0);
      }}
      className={cn(
        'relative overflow-hidden inline-flex items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-white font-medium text-sm h-11 px-6 shadow-md transition-colors hover:border-neutral-700 cursor-pointer',
        className,
      )}
    >
      {/* Dynamic Cursor Glow Layer */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(120px circle at ${coords.x}px ${coords.y}px, ${glowColor}, transparent 80%)`,
        }}
      />

      {/* Content wrapper */}
      <span className="relative z-10 inline-flex items-center gap-[inherit]">{children}</span>
    </button>
  );
}
