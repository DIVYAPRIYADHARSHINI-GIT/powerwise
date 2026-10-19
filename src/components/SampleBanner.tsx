"use client";
// Shown while the sample household is loaded: clear "sample data" label + Start fresh.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";
import { startFresh, useAppState } from "@/lib/store";
import { Button, ConfirmDialog } from "./ui";
import { IconInfo } from "./Icons";

export function SampleBanner() {
  const s = useAppState();
  const { t } = useI18n();
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  if (!s || s.mode !== "sample") return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10" data-testid="sample-banner">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 text-sm text-amber-900 sm:px-4 dark:text-amber-200">
        <IconInfo size={16} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="me-1 rounded-md bg-amber-200/70 px-1.5 py-0.5 text-xs font-semibold dark:bg-amber-400/20">{t("common.sampleData")}</span>
          {t("banner.sample")}
        </span>
        <Button size="sm" variant="secondary" onClick={() => setAsk(true)} data-testid="start-fresh">
          {t("banner.startFresh")}
        </Button>
      </div>
      <ConfirmDialog
        open={ask}
        title={t("banner.freshTitle")}
        text={t("banner.freshText")}
        confirmLabel={t("banner.startFresh")}
        cancelLabel={t("common.cancel")}
        onCancel={() => setAsk(false)}
        onConfirm={() => {
          setAsk(false);
          startFresh();
          router.push("/setup");
        }}
      />
    </div>
  );
}
