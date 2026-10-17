// Empty states: one picture (icon tile), one sentence, one button
// (shared states rule from the build plan). Used by W-20b, W-44b, W-47b, W-04b.
import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card flex flex-col items-center gap-4 px-6 py-14 text-center ${className ?? ""}`}>
      <span className="tile size-16 rounded-[20px]" aria-hidden>
        {icon}
      </span>
      <div className="max-w-[420px]">
        <h2 className="h2">{title}</h2>
        {body ? <p className="p mt-2">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}
