"use client";

import { motion, useReducedMotion } from "framer-motion";

export function AuthVisual() {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl"
        animate={reduce ? undefined : { x: [0, 45, 0], y: [0, -25, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-20 bottom-16 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl"
        animate={reduce ? undefined : { x: [0, -35, 0], y: [0, 30, 0], scale: [1, 0.92, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[18%] top-[24%] h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_24px_8px_rgba(103,232,249,0.35)]"
        animate={reduce ? undefined : { opacity: [0.25, 1, 0.25], scale: [0.8, 1.35, 0.8] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
