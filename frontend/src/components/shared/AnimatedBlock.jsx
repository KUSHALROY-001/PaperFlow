import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Height + fade transition that UNMOUNTS its children while closed, so
 * hidden content (e.g. a real answer) is not in the DOM at all - not
 * findable with Ctrl+F, not read by screen readers, not focusable.
 * Respects prefers-reduced-motion.
 */
export default function AnimatedBlock({ open, id, className = "", children }) {
  const reduceMotion = useReducedMotion();
  const transition = { duration: reduceMotion ? 0 : 0.2, ease: "easeOut" };

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="content"
          id={id}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={transition}
          className={`overflow-hidden ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
