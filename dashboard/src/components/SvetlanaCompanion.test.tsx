import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import SvetlanaCompanion from "./SvetlanaCompanion";

describe("SvetlanaCompanion", () => {
  it("renders safely when the optional voice provider is absent", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <SvetlanaCompanion />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("svetlana-companion")).toHaveAttribute(
      "data-speaking",
      "false",
    );
  });
});
