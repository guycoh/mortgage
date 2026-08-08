"use client";

import { MotionConfig } from "motion/react";
import Navbar from "./components/Nav";
import "./theme.css";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    /* .hm scopes the brand tokens — see theme.css. Nothing outside
       /hachamm can be reached by those rules.
       reducedMotion="user" makes every Motion animation in the subtree
       honour the OS setting without each component checking. */
    <MotionConfig reducedMotion="user">
      <div className="hm">
        <Navbar />
        {children}
      </div>
    </MotionConfig>
  );
}
