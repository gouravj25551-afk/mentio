"use client";
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Empty({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
      className={cn("relative overflow-hidden rounded-xl border border-dashed border-white/15 p-10 text-center", className)}
    >
      <div className="relative">
        {icon ? (
          <motion.div
            animate={reduce ? undefined : { y: [0, -3, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-muted-foreground"
          >
            {icon}
          </motion.div>
        ) : null}
        <h3 className="text-[14px] font-medium">{title}</h3>
        {description ? <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">{description}</p> : null}
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </motion.div>
  );
}
