"use client";
import { useI18n } from "@/i18n";
import { Button, EmptyState, LinkButton } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState image="/images/empty-error.svg" title={t("common.error")} text="">
      <Button onClick={reset}>{t("common.retry")}</Button>
      <LinkButton href="/" variant="secondary">
        {t("common.goHome")}
      </LinkButton>
    </EmptyState>
  );
}
