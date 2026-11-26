import { describe, expect, it } from "vitest";
import { edgeVoiceForLocale } from "./edgeVoice";

describe("edgeVoiceForLocale", () => {
  it.each([
    ["ru", "ru-RU-SvetlanaNeural"],
    ["ru-RU", "ru-RU-SvetlanaNeural"],
    ["vi", "vi-VN-HoaiMyNeural"],
    ["vi-VN", "vi-VN-HoaiMyNeural"],
    ["zh", "zh-CN-XiaoxiaoNeural"],
    ["zh-CN", "zh-CN-XiaoxiaoNeural"],
    ["en", "en-US-JennyNeural"],
    ["en-US", "en-US-JennyNeural"],
    [null, "en-US-JennyNeural"],
  ] as const)("maps %s to %s", (locale, expected) => {
    expect(edgeVoiceForLocale(locale)).toBe(expected);
  });
});
