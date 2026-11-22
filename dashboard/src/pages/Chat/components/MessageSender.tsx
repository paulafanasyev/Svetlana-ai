import type { ReactNode } from "react";
import { Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import ExpertAgentAvatar from "./ExpertAgentAvatar";
import { useChatAgentProfile } from "../ChatAgentProfileContext";
import styles from "../index.module.less";
import { publicUrl } from "../../../utils/publicUrl";
import { publicUrl } from "../../../utils/publicUrl";

/** Shared message-row avatar size. */
export const MESSAGE_AVATAR_SIZE = 36;

interface MessageSenderProps {
  name: string;
  avatar: ReactNode;
}

/** Plain message-row avatar. Name is an accessible label only. */
export default function MessageSender({ name, avatar }: MessageSenderProps) {
  const label = name.trim();
  return (
    <div className={styles.msgSender} aria-label={label || undefined}>
      <span className={styles.msgAvatarPlain} aria-hidden>
        {avatar}
      </span>
    </div>
  );
}

interface ExpertMessageAvatarProps {
  name?: string | null;
  color?: string | null;
  iconName?: string | null;
  iconUrl?: string | null;
  /** Hover label; defaults to ``name``. */
  tooltip?: string | null;
  /** Open this agent in the profile drawer (member vs team host). */
  profileAgentId?: string | null;
  /** ACP runner shown at the avatar's bottom-right. */
  managedRunner?: string | null;
  shared?: boolean;
  owned?: boolean;
  ownerName?: string | null;
}

export function ExpertMessageAvatar({
  name,
  color,
  iconName,
  iconUrl,
  tooltip,
  profileAgentId,
  managedRunner,
  shared,
  owned,
  ownerName,
}: ExpertMessageAvatarProps) {
  const { t } = useTranslation();
  const profile = useChatAgentProfile();
  const label = (tooltip ?? name)?.trim() || "";
  const canOpen = Boolean(profile?.canOpen);
  const normalizedName = label.toLowerCase();
  const isSvetlana = normalizedName === "светлана" || normalizedName.startsWith("светлана ") || normalizedName === "svetlana" || normalizedName.startsWith("svetlana ");
  const avatar = isSvetlana && !iconUrl?.trim() ? (
    <span
      className={styles.expertAgentAvatar}
      style={{
        width: MESSAGE_AVATAR_SIZE,
        height: MESSAGE_AVATAR_SIZE,
        borderRadius: "50%",
        overflow: "hidden",
        display: "inline-flex",
        border: "2px solid #10b981",
        boxShadow: "0 0 0 3px rgba(16,185,129,.12)",
      }}
    >
      <img
        src={publicUrl("images/avatar/svetlana-master.jpg")}
        alt=""
        width={MESSAGE_AVATAR_SIZE}
        height={MESSAGE_AVATAR_SIZE}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </span>
  ) : (
    <ExpertAgentAvatar
      iconName={iconName}
      iconUrl={iconUrl}
      color={color}
      size={MESSAGE_AVATAR_SIZE}
      managedRunner={managedRunner}
      shared={shared}
      owned={owned}
      ownerName={ownerName}
    />
  );

  const node = canOpen ? (
    <button
      type="button"
      className={styles.msgSenderBtn}
      onClick={() => profile?.openAgentProfile(profileAgentId ?? undefined)}
      aria-label={
        label ||
        t(
          profile?.isTeam
            ? "chat.agentProfile.openTeam"
            : "chat.agentProfile.open",
        )
      }
    >
      {avatar}
    </button>
  ) : (
    <div className={styles.msgSender} aria-label={label || undefined}>
      <span className={styles.msgAvatarPlain} aria-hidden>
        {avatar}
      </span>
    </div>
  );

  if (!label) return node;
  return (
    <Tooltip title={label} mouseEnterDelay={0.35}>
      {node}
    </Tooltip>
  );
}
