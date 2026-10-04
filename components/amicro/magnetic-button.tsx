'use client';

import React, { useRef } from 'react';
import { motion, useSpring, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils';

type MagneticButtonProps = HTMLMotionProps<'button'> & {
  children: React.ReactNode;
  range?: number;
  strength?: number;
};

export function MagneticButton({
  children,
  range = 45,
  strength = 0.35,
  className = '',
  disabled,
  onMouseMove,
  onMouseLeave,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const springConfig = { stiffness: 150, damping: 15, mass: 0.6 };
  const x = useSpring(0, springConfig);
  const y = useSpring(0, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseMove?.(e);
    if (!ref.current || disabled) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();

    // Center point of the button
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    // Calculate distance
    const dist = Math.hypot(clientX - centerX, clientY - centerY);

    if (dist < range) {
      // Magnetic pull
      const targetX = (clientX - centerX) * strength;
      const targetY = (clientY - centerY) * strength;
      x.set(targetX);
      y.set(targetY);
    } else {
      // Return to center
      x.set(0);
      y.set(0);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseLeave?.(e);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={disabled}
      {...props}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x, y, ...props.style }}
      className={cn(
        // `transition-[scale,...]` y no `transition-all`: el transform lo mueve el spring.
        'relative inline-flex items-center justify-center rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black font-semibold text-sm h-11 px-6 shadow hover:scale-[1.03] transition-[scale,background-color,box-shadow,opacity] cursor-pointer select-none border-0',
        className,
      )}
    >
      <span className="relative z-10 inline-flex items-center gap-[inherit] pointer-events-none">{children}</span>
    </motion.button>
  );
}
