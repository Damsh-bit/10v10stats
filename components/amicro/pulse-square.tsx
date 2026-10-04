'use client';

import React from 'react';
import { motion } from 'motion/react';

export const PulseSquare = () => {
  return (
    <motion.div
      className="w-8 h-8 border-4 border-zinc-800 dark:border-zinc-700 rounded-md"
      animate={{ scale: [1, 1.2, 1], opacity: [1, 0.3, 1], borderRadius: ["20%", "50%", "20%"] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
};
