import { useTranslation } from "react-i18next";
import { Radio, Space } from "antd";
import { message } from "@/utils/antdMessage";

import { preferencesApi } from "../../../api/modules/preferences";
import { applyUserLocale } from "../../../utils/locale";

const languages = [
  { value: "ru", label: "Русский" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
  { value: "zh", label: "简体中文" },
];

export default function LanguagePage() {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language?.startsWith("ru") ? "ru"
    : i18n.language?.startsWith("vi") ? "vi"
    : i18n.language?.startsWith("zh") ? "zh" : "en";

  const handleChange = async (lang: string) => {
    try {
      const prefs = await preferencesApi.setLocale(lang);
      await applyUserLocale(prefs.locale);
    } catch {
      message.error(t("language.saveFailed", "Не удалось сохранить язык"));
    }
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 600 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--fn-text-primary)", marginBottom: 8 }}>
        {t("language.title", "Язык интерфейса")}
      </h2>
      <p style={{ fontSize: 14, color: "var(--fn-text-tertiary)", marginBottom: 24 }}>
        {t("language.description", "Выберите язык Светланы.")}
      </p>
      <Radio.Group value={currentLocale} onChange={(e) => void handleChange(e.target.value)}>
        <Space direction="vertical" size={12}>
          {languages.map((lang) => (
            <Radio key={lang.value} value={lang.value}>{lang.label}</Radio>
          ))}
        </Space>
      </Radio.Group>
    </div>
  );
}
