import { describe, expect, it } from "vitest";
import en from "./en.json";
import ru from "./ru.json";
import vi from "./vi.json";

type TranslationNode = Record<string, unknown>;

function collectStrings(
  node: unknown,
  prefix = "",
  result = new Map<string, string>(),
): Map<string, string> {
  if (!node || typeof node !== "object" || Array.isArray(node)) return result;

  for (const [key, value] of Object.entries(node as TranslationNode)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      result.set(path, value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      collectStrings(value, path, result);
    }
  }

  return result;
}

function placeholders(value: string): string[] {
  return (value.match(/\{\{[^{}]+\}\}/g) ?? []).sort();
}

const source = collectStrings(en);
const bundles = [
  ["ru", collectStrings(ru)],
  ["vi", collectStrings(vi)],
] as const;

/** These shared labels are intentionally consumed by components but are not in en.json. */
const intentionalLocaleOnlyKeys = new Set(["common.search", "common.settings"]);

describe("localized translation bundles", () => {
  it.each(bundles)(
    "%s preserves interpolation placeholders from English",
    (locale, translations) => {
      const mismatches: string[] = [];

      for (const [key, translatedValue] of translations) {
        const sourceValue = source.get(key);
        if (!sourceValue) continue;

        const expected = placeholders(sourceValue);
        const actual = placeholders(translatedValue);
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          mismatches.push(
            `${locale}:${key} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
          );
        }
      }

      expect(mismatches).toEqual([]);
    },
  );

  it.each(bundles)("%s contains no unknown locale-only keys", (locale, translations) => {
    const unexpected = [...translations.keys()].filter(
      (key) => !source.has(key) && !intentionalLocaleOnlyKeys.has(key),
    );
    expect(unexpected, `${locale} contains unknown keys`).toEqual([]);
  });

  it.each(bundles)("%s contains the core Svetlana interface labels", (locale, translations) => {
    for (const key of [
      "app.pageTitle",
      "svetlana.name",
      "nav.chat",
      "nav.voice",
      "voice.description",
      "language.title",
    ]) {
      expect(translations.has(key), `${locale} is missing ${key}`).toBe(true);
    }
  });
});
