// Layout for the application steps F-03 to F-08.
import type { ReactNode } from "react";
import { StepScreen } from "@/components/ui";
import { STEPS } from "./constants";

type Props = {
  step: number; // 1–6
  intro?: string;
  loading?: boolean;
  banner?: string | null;
  /** Shown when staff asked for changes to this step (F-09b). */
  adminNote?: string | null;
  children: ReactNode;
  footer: ReactNode;
};

export function ApplyStep({ step, intro, loading, banner, adminNote, children, footer }: Props) {
  return (
    <StepScreen
      headerTitle="Sell on Farmkeke"
      title={STEPS[step - 1].title}
      step={step}
      totalSteps={STEPS.length}
      intro={intro}
      loading={loading}
      banner={banner}
      staffNote={adminNote}
      footer={footer}
    >
      {children}
    </StepScreen>
  );
}
