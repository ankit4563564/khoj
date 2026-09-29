"use client";

import { Variants, Transition } from "framer-motion";

/**
 * KHOJ Motion System
 * Inspired by Apple interaction polish and Linear UI discipline.
 * Timings:
 * - MICRO: 100-160ms (buttons, badges, pills)
 * - NORMAL: 180-240ms (cards, toggles, dropdowns)
 * - MODAL: 220-320ms (drawers, dialogs)
 * - PAGE: 300-450ms (page transitions, large reveals)
 * - SUCCESS: 450-700ms (checkmarks, completed handovers)
 * - MATCHING: 1000-1600ms (multimodal search pulse)
 */

export const TRANSITION_MICRO: Transition = {
  duration: 0.14,
  ease: [0.16, 1, 0.3, 1],
};

export const TRANSITION_NORMAL: Transition = {
  duration: 0.22,
  ease: [0.16, 1, 0.3, 1],
};

export const TRANSITION_MODAL: Transition = {
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1],
};

export const TRANSITION_PAGE: Transition = {
  duration: 0.36,
  ease: [0.16, 1, 0.3, 1],
};

export const TRANSITION_SPRING_SUBTLE: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: TRANSITION_NORMAL,
  },
  exit: {
    opacity: 0,
    transition: TRANSITION_MICRO,
  },
};

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: TRANSITION_PAGE,
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: TRANSITION_MICRO,
  },
};

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: TRANSITION_NORMAL,
  },
};

export const cardHoverVariants: Variants = {
  rest: {
    scale: 1,
    y: 0,
    transition: TRANSITION_MICRO,
  },
  hover: {
    y: -2,
    transition: TRANSITION_MICRO,
  },
  tap: {
    scale: 0.99,
    transition: { duration: 0.08 },
  },
};

export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: TRANSITION_MODAL,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 6,
    transition: TRANSITION_MICRO,
  },
};

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

export const successCheckVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1],
      delay: 0.1,
    },
  },
};
