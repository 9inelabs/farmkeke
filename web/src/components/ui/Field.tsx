"use client";

import { forwardRef, useId, useState, type ComponentProps, type ReactNode } from "react";

type FieldShell = {
  label: ReactNode;
  /** Shown after the label in muted text, e.g. "(optional)" */
  labelNote?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
};

function Shell({
  id,
  label,
  labelNote,
  hint,
  error,
  className,
  children,
}: FieldShell & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="lbl">
        {label}
        {labelNote ? <span className="font-medium text-subtle"> {labelNote}</span> : null}
      </label>
      {children}
      {error ? (
        <span id={`${id}-error`} className="field-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, hint?: ReactNode, error?: ReactNode) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export const TextField = forwardRef<HTMLInputElement, FieldShell & Omit<ComponentProps<"input">, "className">>(
  function TextField({ label, labelNote, hint, error, className, id: idProp, ...input }, ref) {
    const auto = useId();
    const id = idProp ?? auto;
    return (
      <Shell id={id} label={label} labelNote={labelNote} hint={hint} error={error} className={className}>
        <input
          ref={ref}
          id={id}
          className="fin"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          {...input}
        />
      </Shell>
    );
  },
);

/** Password with a text "Show"/"Hide" toggle (never an icon alone). */
export const PasswordField = forwardRef<
  HTMLInputElement,
  FieldShell & Omit<ComponentProps<"input">, "className" | "type">
>(function PasswordField({ label, labelNote, hint, error, className, id: idProp, ...input }, ref) {
  const auto = useId();
  const id = idProp ?? auto;
  const [show, setShow] = useState(false);
  return (
    <Shell id={id} label={label} labelNote={labelNote} hint={hint} error={error} className={className}>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={show ? "text" : "password"}
          className="fin"
          style={{ paddingRight: 76 }}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          {...input}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute top-1/2 right-2 min-h-11 -translate-y-1/2 cursor-pointer rounded-lg px-3 text-sm font-semibold text-forest hover:bg-soft"
          aria-controls={id}
          aria-pressed={show}
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </Shell>
  );
});

/** Nigerian phone number with the fixed +234 prefix box from the designs. */
export const PhoneField = forwardRef<HTMLInputElement, FieldShell & Omit<ComponentProps<"input">, "className" | "type">>(
  function PhoneField({ label, labelNote, hint, error, className, id: idProp, ...input }, ref) {
    const auto = useId();
    const id = idProp ?? auto;
    return (
      <Shell id={id} label={label} labelNote={labelNote} hint={hint} error={error} className={className}>
        <div className="flex gap-2">
          <span className="fin flex w-[92px] flex-none items-center justify-center bg-soft font-semibold" aria-hidden>
            +234
          </span>
          <input
            ref={ref}
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            className="fin"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(id, hint, error)}
            {...input}
          />
        </div>
      </Shell>
    );
  },
);

export const TextArea = forwardRef<HTMLTextAreaElement, FieldShell & Omit<ComponentProps<"textarea">, "className">>(
  function TextArea({ label, labelNote, hint, error, className, id: idProp, ...input }, ref) {
    const auto = useId();
    const id = idProp ?? auto;
    return (
      <Shell id={id} label={label} labelNote={labelNote} hint={hint} error={error} className={className}>
        <textarea
          ref={ref}
          id={id}
          className="fin"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          {...input}
        />
      </Shell>
    );
  },
);

export const SelectField = forwardRef<HTMLSelectElement, FieldShell & Omit<ComponentProps<"select">, "className">>(
  function SelectField({ label, labelNote, hint, error, className, id: idProp, children, ...input }, ref) {
    const auto = useId();
    const id = idProp ?? auto;
    return (
      <Shell id={id} label={label} labelNote={labelNote} hint={hint} error={error} className={className}>
        <select
          ref={ref}
          id={id}
          className="fin cursor-pointer"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          {...input}
        >
          {children}
        </select>
      </Shell>
    );
  },
);
