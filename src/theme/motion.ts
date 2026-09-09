/**
 * Standardized Motion System for Romy
 * Single source of truth for physics springs, timings, and interaction curves.
 */

export const motion = {
  springs: {
    /** Short, controlled spring for buttons (avoids excessive bounce) */
    button: {
      damping: 18,
      stiffness: 260,
      mass: 0.7,
    },
    /** Card swipe transitions, reactions, and snap-backs */
    card: {
      damping: 20,
      stiffness: 200,
      mass: 0.8,
    },
    /** Modal bottom sheets and larger sliding surfaces */
    sheet: {
      damping: 24,
      stiffness: 220,
      mass: 0.9,
    },
    /** Subtle micro-interactions, icon pulses, and badge snaps */
    micro: {
      damping: 15,
      stiffness: 300,
      mass: 0.5,
    },
  },

  timings: {
    /** Star selected keyframe sequence (~240-280ms) */
    starSelected: 260,
    /** Card exit animation duration */
    cardExit: 280,
    /** Standard subtle fade transition */
    fade: 180,
    /** Overlay transition */
    overlay: 160,
  },

  card: {
    /** Rotation limit on interaction */
    maxRotationDeg: 1.5,
    /** Pre-rendered next profile background state */
    nextProfileInitial: {
      scale: 0.985,
      translateY: 6,
    },
    /** Active foreground profile state */
    activeProfile: {
      scale: 1,
      translateY: 0,
    },
  },

  button: {
    /** Scale when actively pressed */
    pressedScale: 0.94,
    /** Pixel translation down when pressed */
    pressedTranslateY: 1,
  },
} as const;

export type MotionPresets = typeof motion;
