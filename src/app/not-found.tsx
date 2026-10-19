"use client";
import { useI18n } from "@/i18n";
import { EmptyState, LinkButton } from "@/components/ui";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <EmptyState image="/images/not-found.svg" title={t("notFound.title")} text={t("notFound.text")}>
      <LinkButton href="/">{t("common.goHome")}</LinkButton>
    </EmptyState>
  );
}
