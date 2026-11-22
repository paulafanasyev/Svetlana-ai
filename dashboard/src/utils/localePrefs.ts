export type UiLocale = "ru" | "vi" | "en" | "zh";

export const UI_LOCALE_STORAGE_KEY = "svetlana:ui-locale";

export function detectBrowserLocale(): UiLocale {
  if (typeof navigator === "undefined") return "ru";
  const candidates = navigator.languages?.length > 0 ? navigator.languages : [navigator.language];
  for (const raw of candidates) {
    const lang = raw?.toLowerCase() ?? "";
    if (lang.startsWith("ru")) return "ru";
    if (lang.startsWith("vi")) return "vi";
    if (lang.startsWith("zh")) return "zh";
    if (lang.startsWith("en")) return "en";
  }
  return "ru";
}

export function normalizeUiLocale(raw: string | null | undefined): UiLocale {
  const value = raw?.toLowerCase() ?? "";
  if (value.startsWith("ru")) return "ru";
  if (value.startsWith("vi")) return "vi";
  if (value.startsWith("zh")) return "zh";
  return "en";
}

export function readStoredUiLocale(): UiLocale | null {
  try {
    const raw = localStorage.getItem(UI_LOCALE_STORAGE_KEY);
    if (raw === "ru" || raw === "vi" || raw === "en" || raw === "zh") return raw;
  } catch { /* localStorage unavailable */ }
  return null;
}

export function storeUiLocale(locale: UiLocale): void {
  try { localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale); } catch { /* storage unavailable */ }
}

export function resolveInitialLocale(): UiLocale {
  return readStoredUiLocale() ?? detectBrowserLocale();
}

export function syncDocumentLang(locale: UiLocale): void {
  if (typeof document !== "undefined") document.documentElement.lang = locale === "zh" ? "zh-CN" : locale;
}

export function speechLocaleFromUi(locale: string | null | undefined): string {
  const value = normalizeUiLocale(locale);
  return value === "zh" ? "zh-CN" : value === "ru" ? "ru-RU" : value === "vi" ? "vi-VN" : "en-US";
}