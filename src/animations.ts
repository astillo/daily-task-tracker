import { Variants } from "framer-motion";

// Fade in animation variants
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.4 }
  }
};

// Slide up and fade in variants
export const slideUpFadeIn: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

// Staggered children animation
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

// Scale and fade in
export const scaleFadeIn: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.9 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

// Slide from left
export const slideInFromLeft: Variants = {
  hidden: { 
    x: -50, 
    opacity: 0 
  },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

// Slide from right
export const slideInFromRight: Variants = {
  hidden: { 
    x: 50, 
    opacity: 0 
  },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

// Button hover animation
export const buttonHover = {
  scale: 1.03,
  transition: {
    duration: 0.2
  }
};

// Task completion animation
export const taskCompletionAnimation: Variants = {
  initial: { 
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderColor: "rgba(229, 231, 235, 1)" 
  },
  complete: { 
    backgroundColor: "rgba(240, 253, 244, 1)",
    borderColor: "rgba(34, 197, 94, 0.3)",
    borderLeftWidth: "4px",
    borderLeftColor: "rgba(34, 197, 94, 1)",
    transition: { 
      duration: 0.4,
      ease: "easeOut" 
    }
  }
};

// Micro-animations
export const microAnimations = {
  tap: { scale: 0.97 },
  hover: { 
    y: -2,
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)"
  }
};

// Page transition
export const pageTransition: Variants = {
  initial: { 
    opacity: 0
  },
  enter: { 
    opacity: 1,
    transition: {
      duration: 0.3,
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
}; 