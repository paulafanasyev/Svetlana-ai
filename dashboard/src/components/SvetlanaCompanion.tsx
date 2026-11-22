import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useVoiceOutputContext } from "../context/VoiceOutputContext";
import { publicUrl } from "../utils/publicUrl";
import styles from "./SvetlanaCompanion.module.less";

/** Persistent brand presence; voice playback state is read from Octop's existing TTS provider. */
export default function SvetlanaCompanion() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { speakingId } = useVoiceOutputContext();

  if (location.pathname === "/login" || location.pathname === "/setup" || location.pathname === "/invite" || location.pathname === "/chat" || location.pathname.startsWith("/chat/")) return null;

  const speaking = Boolean(speakingId);
  const label = t("svetlana.openChat", "Открыть чат со Светланой");

  return (
    <button
      type="button"
      className={`${styles.companion} ${speaking ? styles.speaking : ""}`}
      onClick={() => navigate("/chat")}
      aria-label={label}
      title={label}
      data-testid="svetlana-companion"
      data-speaking={speaking ? "true" : "false"}
    >
      <span className={styles.avatarWrap}>
        <img src={publicUrl("images/avatar/svetlana-master.jpg")} alt="" />
      </span>
      <span className={styles.copy}>
        <span className={styles.name}>{t("svetlana.name", "Светлана 2.0")}</span>
        <span className={styles.status} role="status" aria-live="polite">
          {speaking ? t("svetlana.speaking", "Говорю…") : t("svetlana.ready", "Готова помочь")}
        </span>
      </span>
    </button>
  );
}
