// Language registry. To add a language:
//   1. copy src/i18n/messages/en.ts to src/i18n/messages/<code>.ts and translate it
//      (the `Messages` type makes TypeScript report any missing key)
//   2. add one entry below and one loader line in src/i18n/loaders.ts
//   3. if it uses a new script, add a font in src/app/layout.tsx + globals.css
//
// `num` is the Intl locale for numbers and Rs amounts. Indian languages use
// en-IN so amounts get lakh grouping (Rs 1,23,456) with familiar digits;
// `date` is used for month names.

export interface LocaleInfo {
  code: string;
  /** Name in the language itself (shown in the switcher). */
  native: string;
  /** English name (searchable in the switcher). */
  english: string;
  dir: "ltr" | "rtl";
  num: string;
  date: string;
}

export const LOCALES: LocaleInfo[] = [
  { code: "en", native: "English", english: "English", dir: "ltr", num: "en-IN", date: "en-IN" },
  { code: "ta", native: "தமிழ்", english: "Tamil", dir: "ltr", num: "en-IN", date: "ta-IN" },
  { code: "hi", native: "हिन्दी", english: "Hindi", dir: "ltr", num: "en-IN", date: "hi-IN-u-nu-latn" },
  { code: "te", native: "తెలుగు", english: "Telugu", dir: "ltr", num: "en-IN", date: "te-IN" },
  { code: "kn", native: "ಕನ್ನಡ", english: "Kannada", dir: "ltr", num: "en-IN", date: "kn-IN" },
  { code: "ml", native: "മലയാളം", english: "Malayalam", dir: "ltr", num: "en-IN", date: "ml-IN" },
  { code: "mr", native: "मराठी", english: "Marathi", dir: "ltr", num: "en-IN", date: "mr-IN-u-nu-latn" },
  { code: "bn", native: "বাংলা", english: "Bengali", dir: "ltr", num: "en-IN", date: "bn-IN-u-nu-latn" },
  { code: "gu", native: "ગુજરાતી", english: "Gujarati", dir: "ltr", num: "en-IN", date: "gu-IN" },
  { code: "pa", native: "ਪੰਜਾਬੀ", english: "Punjabi", dir: "ltr", num: "en-IN", date: "pa-IN" },
  { code: "or", native: "ଓଡ଼ିଆ", english: "Odia", dir: "ltr", num: "en-IN", date: "or-IN" },
  { code: "ur", native: "اردو", english: "Urdu", dir: "rtl", num: "en-IN", date: "ur-IN-u-nu-latn" },
  { code: "es", native: "Español", english: "Spanish", dir: "ltr", num: "es-ES", date: "es-ES" },
  { code: "fr", native: "Français", english: "French", dir: "ltr", num: "fr-FR", date: "fr-FR" },
  { code: "ar", native: "العربية", english: "Arabic", dir: "rtl", num: "ar-u-nu-latn", date: "ar-u-nu-latn" },
  { code: "zh", native: "简体中文", english: "Chinese (Simplified)", dir: "ltr", num: "zh-CN", date: "zh-CN" },
  { code: "ja", native: "日本語", english: "Japanese", dir: "ltr", num: "ja-JP", date: "ja-JP" },
];

export const DEFAULT_LOCALE = "en";
export const LOCALE_CODES = LOCALES.map((l) => l.code);
export const LANG_KEY = "powerwise.lang";
export const RTL_CODES = LOCALES.filter((l) => l.dir === "rtl").map((l) => l.code);

export function localeInfo(code: string): LocaleInfo {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}
