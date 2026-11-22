"use client";
import { AnimatePresence, motion } from "framer-motion";

import { MentorCard, type MentorCardData } from "@/components/mentor/mentor-card";
import { ease } from "@/components/motion/primitives";

/**
 * Re-staggers whenever the result set changes (new category, search or page),
 * so switching filters animates the old cards out and the new ones in.
 */
export function MentorGrid({ mentors, resultKey }: { mentors: MentorCardData[]; resultKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.ul
        key={resultKey}
        initial="hidden"
        animate="show"
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035 } } }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {mentors.map((m) => (
          <motion.li
            key={m.id}
            layout
            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } } }}
          >
            <MentorCard mentor={m} />
          </motion.li>
        ))}
      </motion.ul>
    </AnimatePresence>
  );
}
