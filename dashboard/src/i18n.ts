import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getApiUrl } from "./api/config";
import { i18nApi } from "./api/modules/i18n";
import { resolveInitialLocale, syncDocumentLang, type UiLocale } from "./utils/localePrefs";

export type { UiLocale } from "./utils/localePrefs";

async function loadLocaleBundle(locale: UiLocale) {
  switch (locale) {
    case "ru": return (await import("./locales/ru.json")).default;
    case "vi": return (await import("./locales/vi.json")).default;
    case "zh": return (await import("./locales/zh.json")).default;
    default: return (await import("./locales/en.json")).default;
  }
}

export async function ensureLocaleBundle(locale: UiLocale): Promise<void> {
  if (!i18n.hasResourceBundle(locale, "translation")) {
    const bundle = await loadLocaleBundle(locale);
    i18n.addResourceBundle(locale, "translation", bundle, true, true);
  }
}

async function isSetupRequired(): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl("/setup/status"));
    if (!res.ok) return true;
    const body = (await res.json()) as { setup_required?: boolean };
    return body.setup_required === true;
  } catch { return true; }
}

function localeFor(lng: string): UiLocale {
  return lng.startsWith("ru") ? "ru" : lng.startsWith("vi") ? "vi" : lng.startsWith("zh") ? "zh" : "en";
}

async function hydrateServerLabels(lng: string) {
  if (await isSetupRequired()) return;
  const locale = localeFor(lng);
  try {
    const [{ labels: tools }, { labels: skills }] = await Promise.all([i18nApi.getToolLabels(), i18nApi.getSkillLabels()]);
    i18n.addResourceBundle(locale, "translation", { tools, skills }, true, true);
  } catch { /* Bundled locale JSON remains the fallback. */ }
}

export function refreshServerLabels(lng?: string): Promise<void> {
  return hydrateServerLabels(lng ?? i18n.language);
}

let initPromise: Promise<void> | null = null;

export function initI18n(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const initial = resolveInitialLocale();
      const primaryBundle = await loadLocaleBundle(initial);
      await i18n.use(initReactI18next).init({
        resources: { [initial]: { translation: primaryBundle } },
        lng: initial,
        fallbackLng: "en",
        supportedLngs: ["ru", "vi", "en", "zh"],
        nonExplicitSupportedLngs: true,
        interpolation: { escapeValue: false },
      });
      syncDocumentLang(initial);
      const others: UiLocale[] = ["ru", "vi", "en", "zh"].filter((item) => item !== initial);
      const prefetch = () => { void Promise.all(others.map(ensureLocaleBundle)); };
      if (typeof requestIdleCallback !== "undefined") requestIdleCallback(prefetch);
      else setTimeout(prefetch, 2000);
      i18n.on("languageChanged", (lng) => {
        const locale = localeFor(lng);
        syncDocumentLang(locale);
        void ensureLocaleBundle(locale).then(() => hydrateServerLabels(lng));
      });
      void hydrateServerLabels(i18n.language);
    })();
  }
  return initPromise;
}

export default i18n;