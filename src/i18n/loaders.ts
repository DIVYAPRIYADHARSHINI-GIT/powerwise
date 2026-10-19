// One code-split chunk per language: only the chosen language is downloaded.
import type { Messages } from "./messages/en";

export const MESSAGE_LOADERS: Record<string, () => Promise<{ default: Messages }>> = {
  ta: () => import("./messages/ta"),
  hi: () => import("./messages/hi"),
  te: () => import("./messages/te"),
  kn: () => import("./messages/kn"),
  ml: () => import("./messages/ml"),
  mr: () => import("./messages/mr"),
  bn: () => import("./messages/bn"),
  gu: () => import("./messages/gu"),
  pa: () => import("./messages/pa"),
  or: () => import("./messages/or"),
  ur: () => import("./messages/ur"),
  es: () => import("./messages/es"),
  fr: () => import("./messages/fr"),
  ar: () => import("./messages/ar"),
  zh: () => import("./messages/zh"),
  ja: () => import("./messages/ja"),
};
