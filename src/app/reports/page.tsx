"use client";
// Reports: monthly PDF (English, built by /api/report/pdf) and history CSV.
import { useState } from "react";
import { useI18n } from "@/i18n";
import { downloadFrom, payload } from "@/lib/client";
import { useAppState } from "@/lib/store";
import { NeedHome } from "@/components/Guard";
import { IconDownload, IconFile } from "@/components/Icons";
import { Button, Card, Note, PageHeader, SampleBadge, Spinner, toast } from "@/components/ui";

export default function ReportsPage() {
  const s = useAppState();
  const { t } = useI18n();
  const [busy, setBusy] = useState<"pdf" | "csv" | null>(null);
  const run = async (kind: "pdf" | "csv") => {
    if (!s?.household || busy) return;
    setBusy(kind);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      if (kind === "pdf") await downloadFrom("/api/report/pdf", payload(s, { goal: s.settings.goal }), `powerwise-report-${stamp}.pdf`);
      else await downloadFrom("/api/report/csv", payload(s), `powerwise-bill-history-${stamp}.csv`);
      toast(t("reports.done"));
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setBusy(null);
    }
  };
  return (
    <NeedHome s={s}>
      <PageHeader title={t("reports.title")} subtitle={t("reports.subtitle")} badge={<SampleBadge kind="both" />} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col" data-testid="report-pdf">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
              <IconFile size={24} />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">{t("reports.pdf")}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("reports.pdfText")}</p>
            </div>
          </div>
          <Button className="mt-5 self-start" onClick={() => run("pdf")} disabled={!!busy} data-testid="download-pdf">
            {busy === "pdf" ? <Spinner /> : <IconDownload size={16} />} {busy === "pdf" ? t("reports.making") : t("reports.downloadPdf")}
          </Button>
        </Card>
        <Card className="flex flex-col" data-testid="report-csv">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
              <IconFile size={24} />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">{t("reports.csv")}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("reports.csvText")}</p>
            </div>
          </div>
          {s && s.bills.length === 0 && <Note className="mt-3">{t("reports.noBills")}</Note>}
          <Button variant="green" className="mt-5 self-start" onClick={() => run("csv")} disabled={!!busy} data-testid="download-csv">
            {busy === "csv" ? <Spinner /> : <IconDownload size={16} />} {busy === "csv" ? t("reports.making") : t("reports.downloadCsv")}
          </Button>
        </Card>
      </div>
    </NeedHome>
  );
}
