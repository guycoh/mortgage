"use client";

import { motion } from "motion/react";
import { person } from "../data";
import { rise, settle } from "../motion";

/**
 * The foil plate. Everything here is layered rather than flat: base foil,
 * engine-turned guilloché, a concentric rosette radiating from behind the
 * portrait, a brushed light band, a top highlight and a bottom shade — then
 * grain over the whole thing.
 */
export function Masthead() {
  return (
    <motion.section
      variants={rise}
      className="glc-grain relative isolate flex max-h-[44svh] shrink-0 grow flex-col justify-center overflow-hidden rounded-b-[30px] px-[var(--glc-gutter)] pt-[clamp(12px,2.2svh,22px)] pb-[clamp(48px,7svh,58px)] text-center"
    >
      <div aria-hidden className="glc-foil absolute inset-0" />
      <div aria-hidden className="glc-engrave absolute inset-0 opacity-70" />
      <div aria-hidden className="glc-rosette absolute inset-0" />
      <div aria-hidden className="glc-sheen absolute inset-0" />
      <div aria-hidden className="glc-masthead-glow absolute inset-0" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-[rgba(217,202,134,0.35)]" />
      {/* pool of light directly behind the portrait */}
      <div
        aria-hidden
        className="glc-portrait-pool absolute left-1/2 top-2 h-44 w-44 -translate-x-1/2 rounded-full blur-md"
      />

      <div className="relative">
        <motion.div
          variants={settle}
          className="relative mx-auto h-[clamp(78px,11.5svh,94px)] w-[clamp(78px,11.5svh,94px)]"
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
          className="glc-display glc-press mt-[clamp(10px,1.7svh,14px)] text-[clamp(30px,8.8vw,37px)] font-bold leading-none tracking-[0.005em] text-[#fffaea]"
        >
          {person.full}
        </motion.h1>

        <motion.div
          variants={rise}
          className="mt-[clamp(7px,1.2svh,10px)] flex items-center justify-center gap-3"
        >
          <span
            aria-hidden
            className="h-px w-8 bg-gradient-to-l from-transparent to-[rgba(217,202,134,0.7)]"
          />
          <p className="text-[11.5px] font-semibold tracking-[0.26em] text-[#f7edc6]">
            {person.role}
          </p>
          <span
            aria-hidden
            className="h-px w-8 bg-gradient-to-r from-transparent to-[rgba(217,202,134,0.7)]"
          />
        </motion.div>
      </div>
    </motion.section>
  );
}
