/**
 * @vitest-environment jsdom
 */
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { LetterPreview } from "@/components/letters/LetterPreview";
import enMessages from "@/messages/en.json";

const withIntl = (node: React.ReactNode) => (
  <NextIntlClientProvider locale="en" messages={enMessages}>
    {node}
  </NextIntlClientProvider>
);

// LetterPreview uses next-intl's locale-aware Link; mock it to a plain anchor so
// the client-navigation module isn't loaded in the test environment.
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: React.ReactNode;
  }) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("LetterPreview", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    act(() => {
      root = createRoot(container);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("shows the verbatim DRAFT ONLY banner, the check strip, and the letter body", () => {
    act(() => {
      root.render(
        withIntl(
          <LetterPreview
            subject="Request for lien review"
            body={"To,\nThe Branch Manager\n\nPlease review the lien."}
            level="L1"
            placeholdersMissing={[]}
            approved
            evidenceReady
            initiallyExpanded
          />,
        ),
      );
    });

    expect(container.textContent).toContain("DRAFT ONLY — REVIEW BEFORE USE");
    expect(container.textContent).toContain(
      "Check the names, dates and amounts before you send it.",
    );
    expect(container.textContent).toContain("The Branch Manager");
    expect(container.textContent).toContain("Reviewed by you");
  });

  it("approves the draft via the API and lifts the reviewed state", async () => {
    const fetchMock = vi.fn(
      async () => ({ ok: true, json: async () => ({}) }) as Response,
    );
    vi.stubGlobal("fetch", fetchMock);
    const onApproved = vi.fn();

    act(() => {
      root.render(
        withIntl(
          <LetterPreview
            caseId="case-1"
            escalationId="esc-1"
            subject="Request for lien review"
            body="Please review the lien."
            level="L1"
            placeholdersMissing={[]}
            evidenceReady
            onApproved={onApproved}
          />,
        ),
      );
    });

    const reveal = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Read the full draft"),
    ) as HTMLButtonElement;
    act(() => reveal.click());

    const button = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("I reviewed this draft"),
    ) as HTMLButtonElement;
    await act(async () => {
      button.click();
      for (let i = 0; i < 10; i += 1) await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/cases/case-1/escalations/esc-1/approve",
      expect.objectContaining({ method: "POST" }),
    );
    expect(onApproved).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Reviewed by you");
  });

  it("keeps approval blocked with friendly labels while details are missing", () => {
    act(() => {
      root.render(
        withIntl(
          <LetterPreview
            caseId="case-1"
            escalationId="esc-1"
            subject="Request for lien review"
            body="Please review the lien."
            level="L1"
            placeholdersMissing={["ACCOUNT_LAST4"]}
            evidenceReady
          />,
        ),
      );
    });

    const reveal = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Read the full draft"),
    ) as HTMLButtonElement;
    act(() => reveal.click());

    const button = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("I reviewed this draft"),
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(container.textContent).toContain("Still needed before sending");
    // Raw placeholder codes must never surface — users see a friendly label.
    expect(container.textContent).not.toContain("ACCOUNT_LAST4");
    expect(container.textContent).toContain(
      "Last 4 digits of your account number",
    );
  });

  it("shows the papers gate with no buttons until evidence is uploaded", () => {
    act(() => {
      root.render(
        withIntl(
          <LetterPreview
            caseId="case-1"
            subject="Request for lien review"
            body="Please review the lien."
            level="L1"
            placeholdersMissing={[]}
            approved
          />,
        ),
      );
    });

    expect(container.textContent).toContain("Add your papers first");
    expect(container.querySelector("button")).toBeNull();
  });

  it("summarises first and reveals the full draft only on request", () => {
    act(() => {
      root.render(
        withIntl(
          <LetterPreview
            subject="Request for written restriction details"
            body="FULL PRIVATE DRAFT BODY"
            level="L1"
            placeholdersMissing={[]}
            approved
            evidenceReady
            factSummary="total restriction · ₹1,800 · NCRP reference provided"
          />,
        ),
      );
    });

    expect(container.textContent).toContain("What this draft asks for");
    expect(container.textContent).toContain("Based on:");
    expect(container.textContent).not.toContain("FULL PRIVATE DRAFT BODY");
    const reveal = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Read the full draft"),
    ) as HTMLButtonElement;
    expect(reveal.getAttribute("aria-expanded")).toBe("false");
    act(() => reveal.click());
    expect(container.textContent).toContain("FULL PRIVATE DRAFT BODY");
    expect(reveal.getAttribute("aria-expanded")).toBe("true");
  });
});
