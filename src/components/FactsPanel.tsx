"use client";

import { useEffect, useRef, useState } from "react";
import { METRO_FACTS } from "@/data/metro-facts";

const ROTATE_MS = 3400;

interface FactsPanelProps {
  visible: boolean;
  inset?: string;
  top?: string;
}

/** Always-on home companion — hides only when a station is selected. */
export default function FactsPanel({
  visible,
  inset = "clamp(1.5rem, 4vw, 3rem)",
  top = "clamp(2rem, 5vh, 3.5rem)",
}: FactsPanelProps) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const indexRef = useRef(0);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    let outTimer = 0;
    let swapTimer = 0;

    const scheduleNext = () => {
      outTimer = window.setTimeout(() => {
        if (cancelled) return;
        setPhase("out");
        swapTimer = window.setTimeout(() => {
          if (cancelled) return;
          indexRef.current = (indexRef.current + 1) % METRO_FACTS.length;
          setIndex(indexRef.current);
          setPhase("in");
          scheduleNext();
        }, 220);
      }, ROTATE_MS);
    };

    scheduleNext();

    return () => {
      cancelled = true;
      window.clearTimeout(outTimer);
      window.clearTimeout(swapTimer);
    };
  }, [visible]);

  const fact = METRO_FACTS[index];

  return (
    <aside
      className={`pointer-events-none absolute top-0 right-0 z-10 flex justify-end transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-2 opacity-0"
      }`}
      style={{ paddingRight: inset, paddingTop: top }}
      aria-hidden={!visible}
    >
      <div className="comic-panel w-[min(100%,18.5rem)] overflow-hidden bg-[#FFD54F]">
        <div className="px-4 pt-3.5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/50">
            Line fact
          </p>
        </div>

        <div className="relative min-h-[7rem] overflow-hidden px-4 pb-4 pt-2">
          <div
            className={`transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              phase === "in"
                ? "translate-y-0 opacity-100"
                : "translate-y-2 opacity-0"
            }`}
          >
            <p
              className="text-[1.35rem] leading-[0.95] tracking-[-0.04em] text-black"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              {fact.label}
            </p>
            <p className="mt-2.5 text-[13px] leading-relaxed text-black/75">
              {fact.body}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
