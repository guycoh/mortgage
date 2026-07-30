"use client";

// Every pressable thing on this page, so that "press" means one thing.
//
// The press is a spring rather than a CSS :active scale, and the difference is
// the release: a transition eases back to rest, a spring carries a little past
// it and settles. That overshoot is the entire reason a physical button feels
// physical, and it is the one property CSS cannot give you.
//
// The split with CSS is deliberate — hover (background, border, shadow, the 1px
// lift) stays in theme.css, press lives here. They never touch the same
// property: CSS animates `translate`, Motion animates `transform: scale`. If
// both wrote `transform` the button would stick down mid-press.

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { snap } from "../lib/transitions";

type Props = Omit<HTMLMotionProps<"button">, "ref"> & {
  /** Skip the press spring — for a control that only reads as a label. */
  inert?: boolean;
};

const Btn = forwardRef<HTMLButtonElement, Props>(function Btn(
  { inert, disabled, ...rest },
  ref
) {
  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={disabled}
      whileTap={inert || disabled ? undefined : { scale: 0.97 }}
      transition={snap}
      {...rest}
    />
  );
});

export default Btn;
