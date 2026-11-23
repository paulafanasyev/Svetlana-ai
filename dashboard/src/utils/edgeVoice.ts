/** Edge TTS voice selection for the four supported UI languages. */
export function edgeVoiceForLocale(locale: string | null | undefined): string {
  const normalized = locale?.toLowerCase() ?? "";
  if (normalized.startsWith("ru")) return "ru-RU-SvetlanaNeural";
  if (normalized.startsWith("vi")) return "vi-VN-HoaiMyNeural";
  if (normalized.startsWith("zh")) return "zh-CN-XiaoxiaoNeural";
  return "en-US-JennyNeural";
}
