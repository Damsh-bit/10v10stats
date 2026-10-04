'use client';

import React from 'react';
import { motion } from 'motion/react';

export const DashedSpiral = () => (
  <motion.div
    className="w-10 h-10 border-[3px] border-zinc-800 dark:border-zinc-700 rounded-full border-dashed"
    animate={{ rotate: 360, scale: [1, 1.1, 1] }}
    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
  />
);
