"use client";
import * as React from "react";
import { AnimatePresence, animate, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

import { cn } from "@/lib/utils";

export const ease = [0.2, 0.7, 0.2, 1] as const;

/** A card whose border glow follows the pointer. `color` tints the light (any CSS color). */
export function SpotlightCard({
  className,
  color,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { color?: string }) {
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
  };
  return (
    <div
      onPointerMove={onMove}
      className={cn("spotlight", className)}
      style={color ? ({ "--spot": color } as React.CSSProperties) : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Tilts gently toward the pointer in 3D. Flat for reduced motion and touch. */
export function TiltCard({ className, children, max = 8 }: { className?: string; children: React.ReactNode; max?: number }) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 200, damping: 20 });
  return (
    <motion.div
      className={cn("[transform-style:preserve-3d]", className)}
      style={reduce ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Reveals text word by word with a soft blur. Screen readers get the plain sentence. */
export function WordReveal({ text, className, delay = 0, as: Tag = "span" }: { text: string; className?: string; delay?: number; as?: "span" | "h1" | "h2" | "p" }) {
  const words = text.split(" ");
  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          aria-hidden
          className="inline-block whitespace-pre"
          initial={{ opacity: 0, y: "0.4em", filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, delay: delay + i * 0.06, ease }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </Tag>
  );
}

/** Counts up to `value` once it scrolls into view. */
export function CountUp({ value, decimals = 0, suffix = "", className }: { value: number; decimals?: number; suffix?: string; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const [shown, setShown] = React.useState(reduce ? value : 0);
  React.useEffect(() => {
    if (!inView || reduce) {
      if (reduce) setShown(value);
      return;
    }
    const controls = animate(0, value, { duration: 1.4, ease, onUpdate: setShown });
    return () => controls.stop();
  }, [inView, value, reduce]);
  return (
    <span ref={ref} className={className}>
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Cycles through words with a vertical slide. */
export function RotatingWords({ words, className, interval = 2200 }: { words: string[]; className?: string; interval?: number }) {
  const reduce = useReducedMotion();
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    if (reduce || words.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [reduce, words.length, interval]);
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");
  return (
    <span className={cn("relative inline-block overflow-hidden text-left align-bottom", className)}>
      {/* The longest word reserves the width so the line never jumps. */}
      <span className="invisible">{longest}</span>
      <span className="sr-only">{words[i]}</span>
      <AnimatePresence initial={false}>
        <motion.span
          key={words[i]}
          aria-hidden
          className="absolute inset-x-0 top-0 whitespace-nowrap"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
