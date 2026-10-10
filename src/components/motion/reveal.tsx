"use client";
import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

const ease = [0.2, 0.7, 0.2, 1] as const;

/** Fades and lifts content in once as it scrolls into view. Honors reduced motion via MotionConfig. */
export function Reveal({
  delay = 0,
  y = 16,
  className,
  children,
  ...rest
}: { delay?: number; y?: number } & Omit<HTMLMotionProps<"div">, "initial" | "whileInView" | "viewport" | "transition">) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.5, delay, ease }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } };

/** Reveals its StaggerItem children one after another when the group scrolls into view. */
export function Stagger({ className, children, as = "div" }: { className?: string; children: React.ReactNode; as?: "div" | "ul" }) {
  const Comp = as === "ul" ? motion.ul : motion.div;
  return (
    <Comp
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      className={className}
    >
      {children}
    </Comp>
  );
}

export function StaggerItem({ className, children, as = "div" }: { className?: string; children: React.ReactNode; as?: "div" | "li" }) {
  const Comp = as === "li" ? motion.li : motion.div;
  return (
    <Comp variants={item} className={className}>
      {children}
    </Comp>
  );
}
