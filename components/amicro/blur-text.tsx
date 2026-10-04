'use client';

import React from 'react';
import { motion, type Variants } from 'motion/react';
import { cn } from '@/lib/utils';

interface BlurTextProps {
  text: string;
  duration?: number;
  staggerDelay?: number;
  initialBlur?: string;
  className?: string;
}

export function BlurText({
  text,
  duration = 0.5,
  staggerDelay = 0.02,
  initialBlur = '8px',
  className = '',
}: BlurTextProps) {
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
    hidden: { opacity: 0, filter: `blur(${initialBlur})` },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        duration,
        ease: 'easeOut',
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
