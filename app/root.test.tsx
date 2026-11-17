import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";

import { ErrorBoundary } from "./root";

function renderRouteThatThrows(error: unknown) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => null,
      ErrorBoundary,
      loader: () => {
        throw error;
      },
    },
  ]);
  render(<Stub />);
}

describe("root error state", () => {
  it("tells the visitor in Spanish when a page does not exist", async () => {
    renderRouteThatThrows(new Response(null, { status: 404 }));

    expect(
      await screen.findByRole("heading", {
        name: "No encontramos esta página",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Volver a los Manuales" }),
    ).toHaveAttribute("href", "/");
  });

  it("tells the visitor in Spanish when anything else fails", async () => {
    renderRouteThatThrows(new Error("boom"));

    expect(
      await screen.findByRole("heading", { name: "Algo salió mal" }),
    ).toBeInTheDocument();
  });
});
