"use client";

import { motion } from "motion/react";
import { person } from "../data";
import { rise, settle } from "../motion";

/**
 * The pigment plate: drifting colour, a studio bloom behind the portrait,
 * a whisper of print weave, and grain over all of it. Every layer lives
 * inside one masked wrapper, so the gold dissolves into the paper on all
 * four sides rather than ending on an edge.
 */
export function Masthead() {
  return (
    <motion.section
      variants={rise}
      className="relative isolate flex max-h-[44svh] shrink-0 grow flex-col justify-center px-[var(--glc-gutter)] pt-[clamp(10px,2svh,20px)] pb-[clamp(44px,6.2svh,54px)] text-center"
    >
      <div aria-hidden className="glc-fade-x absolute inset-0">
        <div className="glc-fade-y glc-grain absolute inset-0">
          <div className="glc-plate absolute inset-0" />
          <div className="glc-engrave absolute inset-0 opacity-35" />
          <div className="glc-bloom absolute inset-0" />
        </div>
      </div>

      <div className="relative">
        <motion.div
          variants={settle}
          className="relative mx-auto h-[clamp(84px,12.2svh,102px)] w-[clamp(84px,12.2svh,102px)]"
        >
          {/* jeweller's ring: conic foil, then a paper gap, then the portrait */}
          <span aria-hidden className="glc-ring absolute -inset-[7px] rounded-full" />
          <span aria-hidden className="absolute -inset-[3px] rounded-full bg-[#fffdf6]" />
          {/* already served at the right size — no optimizer in the path */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={person.avatar}
            alt={person.full}
            width={384}
            height={384}
            fetchPriority="high"
            draggable={false}
            className="absolute inset-0 h-full w-full select-none rounded-full object-cover shadow-[0_12px_26px_-12px_rgba(28,22,3,0.9)]"
          />
        </motion.div>

        <motion.h1
          variants={rise}
          className="glc-display glc-press mt-[clamp(11px,1.8svh,15px)] text-[clamp(35px,10vw,44px)] font-semibold leading-none tracking-[-0.015em] text-[#fffaea]"
        >
          {person.full}
        </motion.h1>

        <motion.div
          variants={rise}
          className="mt-[clamp(7px,1.2svh,10px)] flex items-center justify-center gap-3"
        >
          <span
            aria-hidden
            className="h-px w-9 bg-gradient-to-l from-transparent to-[rgba(217,202,134,0.7)]"
          />
          <p className="text-[13px] font-semibold tracking-[0.22em] text-[#f8efcd]">
            {person.role}
          </p>
          <span
            aria-hidden
            className="h-px w-9 bg-gradient-to-r from-transparent to-[rgba(217,202,134,0.7)]"
          />
        </motion.div>
      </div>
    </motion.section>
  );
}
