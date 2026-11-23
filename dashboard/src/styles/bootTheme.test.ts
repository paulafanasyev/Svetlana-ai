import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LEGACY_PALETTE_STORAGE_KEY, THEME_STORAGE_KEY } from "./themePalettes";

const INDEX_HTML = readFileSync(resolve(__dirname, "../../index.html"), "utf8");
const THEME_CSS = readFileSync(resolve(__dirname, "theme-vars.css"), "utf8");

function bootThemeScript(): string {
  const match = INDEX_HTML.match(
    /<script id="octop-boot-theme">([\s\S]*?)<\/script>/,
  );
  if (!match) {
    throw new Error("octop-boot-theme script missing from index.html");
  }
  return match[1];
}

function stubMatchMedia(systemDark: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-color-scheme: dark") ? systemDark : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

describe("index.html boot theme", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PALETTE_STORAGE_KEY);
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-palette");
    window.history.replaceState(null, "", "/");
    stubMatchMedia(true);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PALETTE_STORAGE_KEY);
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-palette");
    window.history.replaceState(null, "", "/");
  });

  it("styles the splash from data-theme, not OS color scheme", () => {
    expect(INDEX_HTML).toContain('html[data-theme="dark"] #octop-boot');
    expect(INDEX_HTML).not.toMatch(
      /@media \(prefers-color-scheme: dark\)[\s\S]*#octop-boot/,
    );
  });

  it("paints the horizontal lockup for both themes, not the framed favicon", () => {
    expect(INDEX_HTML).toContain('src="%BASE_URL%logo_horizontal_dark.png"');
    expect(INDEX_HTML).toContain('src="%BASE_URL%logo_horizontal_white.png"');
    expect(INDEX_HTML).not.toContain('src="%BASE_URL%favico.svg"');
    expect(INDEX_HTML).not.toContain("logo_vertical_white.svg");
  });

  it("shows the shared arc beside the status line", () => {
    expect(INDEX_HTML).toContain('class="octop-boot-spinner"');
    expect(INDEX_HTML).toContain("@keyframes octop-boot-spin");
  });

  it("sets the Svetlana Indigo palette before the first render", () => {
    eval(bootThemeScript());
    expect(document.documentElement.getAttribute("data-palette")).toBe("indigo");
  });

  it("preserves a saved user palette before the first render", () => {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ preference: "dark", palette: "rose" }),
    );
    eval(bootThemeScript());
    expect(document.documentElement.getAttribute("data-palette")).toBe("rose");
  });

  it("migrates a saved legacy palette before the first render", () => {
    localStorage.setItem(LEGACY_PALETTE_STORAGE_KEY, "tech");
    eval(bootThemeScript());
    expect(document.documentElement.getAttribute("data-palette")).toBe("tech");
  });

  it("uses the Svetlana navy neutral surfaces in dark mode", () => {
    expect(THEME_CSS).toContain('--fn-bg-layout: #0a0e1a;');
    expect(THEME_CSS).toContain('--fn-bg-primary: #111827;');
    expect(THEME_CSS).toContain('--fn-bg-tertiary: #1e293b;');
    expect(THEME_CSS).toContain('--fn-text-primary: #e2e8f0;');
    expect(THEME_CSS).toContain('--fn-bg-glass: rgba(17, 24, 39, 0.8);');
  });

  it("keeps a stored light preference over OS dark", () => {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ preference: "light", palette: "rose" }),
    );
    eval(bootThemeScript());
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("honors a stored dark preference", () => {
    stubMatchMedia(false);
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ preference: "dark", palette: "rose" }),
    );
    eval(bootThemeScript());
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("follows the OS when preference is system or missing", () => {
    eval(bootThemeScript());
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    document.documentElement.removeAttribute("data-theme");
    stubMatchMedia(false);
    eval(bootThemeScript());
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("migrates a legacy plain theme string", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    eval(bootThemeScript());
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("adopts the desktop shell preference over the stored one", () => {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({
        preference: "dark",
        palette: "tech",
        customColor: "#112233",
      }),
    );
    window.history.replaceState(null, "", "/?octopTheme=light");
    eval(bootThemeScript());
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY)!)).toEqual({
      preference: "light",
      palette: "tech",
      customColor: "#112233",
    });
    expect(window.location.search).not.toContain("octopTheme");
  });

  it("resolves a desktop system preference against the OS", () => {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ preference: "light", palette: "rose" }),
    );
    window.history.replaceState(null, "", "/?octopTheme=system");
    eval(bootThemeScript());
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY)!)).toMatchObject({
      preference: "system",
      palette: "rose",
    });
  });
});
