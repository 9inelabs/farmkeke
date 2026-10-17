"use client";

// Order timeline (W-51 tracking, W-54 dispute, W-56 refund). Steps appear one
// after another (opacity + transform), the current step has a lime halo.
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Stagger, StaggerItem } from "@/lib/motion";

export type TimelineStep = {
  key: string;
  title: ReactNode;
  detail?: ReactNode;
  state: "done" | "current" | "todo";
};

export function Timeline({ steps, label = "Order progress" }: { steps: TimelineStep[]; label?: string }) {
  return (
    <Stagger role="list" aria-label={label}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <StaggerItem
            key={s.key}
            role="listitem"
            aria-current={s.state === "current" ? "step" : undefined}
            className="relative flex gap-3.5 pb-[22px] last:pb-0"
          >
            {!last ? (
              <span
                aria-hidden
                className={`absolute top-7 bottom-0 left-[13px] w-0.5 ${s.state === "done" ? "bg-forest" : "bg-line"}`}
              />
            ) : null}
            <span
              aria-hidden
              className={`relative z-[1] flex size-7 flex-none items-center justify-center rounded-full ${
                s.state === "done"
                  ? "bg-forest text-white"
                  : s.state === "current"
                    ? "bg-lime shadow-[0_0_0_5px_var(--color-lime-soft)]"
                    : "bg-white shadow-[inset_0_0_0_2px_#D6DAD0]"
              }`}
            >
              {s.state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : null}
            </span>
            <div className="min-w-0 flex-1">
              <div className={`text-[15px] font-semibold ${s.state === "todo" ? "text-subtle" : "text-ink"}`}>
                {s.title}
                <span className="sr-only">
                  {s.state === "done" ? " (done)" : s.state === "current" ? " (now)" : " (to come)"}
                </span>
              </div>
              {s.detail ? <div className="cap mt-0.5">{s.detail}</div> : null}
            </div>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
