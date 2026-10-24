import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KNOWN_TOKENS_MAP } from "../../registry/tokens/tokens";
import { SwapRiskWarning } from "./SwapRiskWarning";
import type { SwapRisk } from "./swapRisk";

const swap = vi.hoisted(() => ({
	risk: { level: "none" } as SwapRisk,
	deliveryFee: undefined as { tokenId: string; plancks: bigint } | undefined,
}));

vi.mock("./SwapProvider", () => ({
	useSwap: () => ({
		risk: swap.risk,
		isRiskAcknowledged: false,
		onRiskAcknowledgeChange: () => {},
		details: { kind: "xcm-transfer", quote: { deliveryFee: swap.deliveryFee } },
	}),
}));

vi.mock("../../hooks/useToken", () => ({
	useToken: ({ tokenId }: { tokenId: string }) => ({
		data: KNOWN_TOKENS_MAP[tokenId],
		isLoading: false,
	}),
}));

afterEach(cleanup);

describe("SwapRiskWarning", () => {
	it("says how much of a transfer the fees take, naming the delivery fee that makes most of it", () => {
		swap.deliveryFee = { tokenId: "native::pah", plancks: 305_000_000n };
		swap.risk = {
			level: "confirm",
			losses: [{ kind: "fees", ratio: 0.2375 }],
			headline: { kind: "fees", ratio: 0.2375 },
			cause: "delivery-fee",
		};
		render(<SwapRiskWarning />);

		expect(screen.getByRole("alert").textContent).toContain(
			"Fees take 23.75% of what you send, mostly the 0.0305 DOT delivery fee.",
		);
		expect(
			screen.getByLabelText("I accept these fees and want to transfer anyway"),
		).toBeTruthy();
	});

	it("shows a single line for a swap that loses value through price impact", () => {
		swap.risk = {
			level: "confirm",
			losses: [
				{ kind: "price-impact", ratio: 0.5325 },
				{ kind: "value-loss", ratio: 0.5367 },
			],
			headline: { kind: "value-loss", ratio: 0.5367 },
			cause: "price-impact",
		};
		render(<SwapRiskWarning />);

		expect(screen.getByRole("alert").querySelectorAll("p")).toHaveLength(1);
		expect(screen.getByRole("alert").textContent).toContain(
			"You receive 53.67% less value than you send, mostly from price impact.",
		);
	});
});
