"use client";
// Page guard: skeleton before hydration / while loading, illustrated empty
// state when no household has been set up yet, retry on errors.
import { useI18n } from "@/i18n";
import type { AppState } from "@/lib/store";
import { Button, EmptyState, LinkButton, PageSkeleton } from "./ui";

export function NeedHome({ s, children }: { s: AppState | null; children: React.ReactNode }) {
  const { t, ready } = useI18n();
  if (!s || !ready) return <PageSkeleton />;
  if (!s.household)
    return (
      <EmptyState image="/images/empty-home.svg" title={t("empty.noHomeTitle")} text={t("empty.noHomeText")}>
        <LinkButton href="/setup" data-testid="empty-setup">
          {t("empty.noHomeCta")}
        </LinkButton>
      </EmptyState>
    );
  return <>{children}</>;
}

export function Loadable<T>({ r, children }: { r: { data: T | null; loading: boolean; error: boolean; retry: () => void }; children: (d: T) => React.ReactNode }) {
  const { t } = useI18n();
  if (r.error)
    return (
      <EmptyState image="/images/empty-error.svg" title={t("common.error")} text="">
        <Button onClick={r.retry} data-testid="retry">
          {t("common.retry")}
        </Button>
      </EmptyState>
    );
  if (!r.data) return <PageSkeleton />;
  return <>{children(r.data)}</>;
}
