"use client";
// Shows the celebration once when planned savings first reach the goal.
// The "reached" flag is derived from props; the dialog only opens on the
// false -> true transition (tracked in state, no effects -> no loops).
import { useState } from "react";
import { useI18n } from "@/i18n";
import { Celebration } from "./Celebration";
import { Button, Dialog } from "./ui";

export function useGoalCelebration(reached: boolean, amount: number) {
  const { t, money } = useI18n();
  const [prev, setPrev] = useState(reached);
  const [open, setOpen] = useState(false);
  if (prev !== reached) {
    setPrev(reached);
    if (reached) setOpen(true);
  }
  const dialog = (
    <Dialog open={open} onClose={() => setOpen(false)} title={t("goal.reached")} testId="goal-dialog">
      <div className="py-2 text-center">
        <Celebration />
        <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{t("goal.reachedText", { amount: money(amount) })}</p>
        <Button className="mt-5" variant="green" onClick={() => setOpen(false)} data-testid="goal-close">
          {t("common.close")}
        </Button>
      </div>
    </Dialog>
  );
  return dialog;
}
