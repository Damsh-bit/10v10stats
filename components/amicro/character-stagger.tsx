'use client';

import React from 'react';
import { motion, type Variants } from 'motion/react';
import { cn } from '@/lib/utils';

interface CharacterStaggerProps {
  text: string;
  duration?: number;
  staggerDelay?: number;
  yOffset?: number;
  className?: string;
}

export function CharacterStagger({
  text,
  duration = 0.4,
  staggerDelay = 0.015,
  yOffset = 15,
  className = '',
}: CharacterStaggerProps) {
  const words = text.split(' ');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  const charVariants: Variants = {
    hidden: { opacity: 0, y: yOffset, scale: 0.8 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 18,
        mass: 0.8,
        duration,
      },
    },
  };

  return (
    <motion.span
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-10%' }}
      className={cn('inline-block', className)}
    >
      <span className="sr-only">{text}</span>
      {/* Letras agrupadas por palabra: el renglón sólo se corta entre palabras. */}
      <span aria-hidden="true">
        {words.map((word, w) => (
          <React.Fragment key={w}>
            {w > 0 && ' '}
            <span className="inline-block whitespace-nowrap">
              {Array.from(word).map((char, index) => (
                <motion.span key={index} variants={charVariants} className="inline-block">
                  {char}
                </motion.span>
              ))}
            </span>
          </React.Fragment>
        ))}
      </span>
    </motion.span>
  );
}
