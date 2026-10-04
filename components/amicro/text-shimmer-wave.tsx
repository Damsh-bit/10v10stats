'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export const TextShimmerWave = ({ text = 'Thinking', className = '' }: { text?: string; className?: string }) => {
  return (
    <div role="status" aria-label={text} className={cn('flex font-medium text-lg text-zinc-900 dark:text-white', className)}>
      {Array.from(text).map((char, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
        >
          {char === ' ' ? ' ' : char}
        </motion.span>
      ))}
    </div>
  );
};
