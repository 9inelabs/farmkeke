"use client";

import { m, transition } from "@/lib/motion";

/**
 * On/off switch (W-48 notifications, W-88 cookies). Always paired with a
 * visible label; `label` is also used as the accessible name.
 * The knob slides with a transform (150ms). The tap area is 48px tall.
 */
export function Switch({
  checked,
  onChange,
  label,
  locked = false,
  showStateText = true,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  label: string;
  /** Always on and cannot be changed (e.g. necessary cookies) */
  locked?: boolean;
  /** Shows "On"/"Off" next to the switch so state is not colour-only */
  showStateText?: boolean;
}) {
  const on = locked || checked;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      aria-disabled={locked || undefined}
      onClick={() => !locked && onChange?.(!checked)}
      className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-1 aria-disabled:cursor-not-allowed"
    >
      <span
        className="relative block h-7 w-[46px] flex-none rounded-full p-[3px] transition-colors duration-150"
        style={{ background: locked ? "#9FB394" : on ? "#1E3B16" : "#C9CEC2" }}
      >
        <m.span
          className="block size-[22px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
          initial={false}
          animate={{ x: on ? 18 : 0 }}
          transition={transition.fast}
        />
      </span>
      {showStateText ? (
        <span className="w-7 text-left text-[13px] font-semibold text-ink-3">{on ? "On" : "Off"}</span>
      ) : null}
    </button>
  );
}
