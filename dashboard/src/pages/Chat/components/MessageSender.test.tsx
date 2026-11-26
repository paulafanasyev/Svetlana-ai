import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MessageSender, {
  ExpertMessageAvatar,
  shouldUseSvetlanaAvatar,
} from "./MessageSender";
import { ChatAgentProfileProvider } from "../ChatAgentProfileContext";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("MessageSender", () => {
  it("renders a plain avatar without a visible name", () => {
    render(<MessageSender name="Ada" avatar={<span>A</span>} />);
    expect(screen.queryByText("Ada")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Ada")).toBeInTheDocument();
  });

  it("shows the expert name as a tooltip target and opens the profile", () => {
    const onOpen = vi.fn();
    render(
      <ChatAgentProfileProvider canOpen onOpen={onOpen}>
        <ExpertMessageAvatar
          name="数据分析师"
          color="#6366f1"
          iconName="sparkles"
        />
      </ChatAgentProfileProvider>,
    );

    const btn = screen.getByRole("button", { name: "数据分析师" });
    fireEvent.click(btn);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(undefined);
  });

  it.each(["Светлана", "Светлана 2.0", "Svetlana", "Svetlana AI"])(
    "uses the brand avatar for %s",
    (name) => {
      expect(shouldUseSvetlanaAvatar({ name })).toBe(true);
    },
  );

  it("uses the brand avatar for the primary assistant in a single-agent chat", () => {
    expect(
      shouldUseSvetlanaAvatar({
        name: "Assistant",
        isDefaultAssistant: true,
      }),
    ).toBe(true);
  });

  it("does not replace another agent's missing avatar with Svetlana", () => {
    expect(shouldUseSvetlanaAvatar({ name: "Виталий Гурнов" })).toBe(false);
    expect(shouldUseSvetlanaAvatar({ name: "Research Agent" })).toBe(false);
  });

  it("respects an explicitly configured avatar or icon", () => {
    expect(shouldUseSvetlanaAvatar({ name: "Светлана", iconName: "user" })).toBe(
      false,
    );
    expect(
      shouldUseSvetlanaAvatar({
        name: "Светлана",
        iconUrl: "https://example.com/avatar.png",
      }),
    ).toBe(false);
  });

  it("opens the member profile id and shows a host tooltip", () => {
    const onOpen = vi.fn();
    render(
      <ChatAgentProfileProvider canOpen onOpen={onOpen} isTeam>
        <ExpertMessageAvatar
          name="临床助手"
          tooltip="[心脏团队] 主持人"
          profileAgentId="doctor"
          iconName="sparkles"
        />
      </ChatAgentProfileProvider>,
    );

    const btn = screen.getByRole("button", { name: "[心脏团队] 主持人" });
    fireEvent.click(btn);
    expect(onOpen).toHaveBeenCalledWith("doctor");
  });
});
