import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KNOWN_TOKENS_MAP } from "../../registry/tokens/tokens";
import { SwapRiskWarning } from "./SwapRiskWarning";
import type { SwapRisk } from "./swapRisk";

type Amount = { tokenId: string; plancks: bigint };

const swap = vi.hoisted(() => ({
	risk: { level: "none" } as SwapRisk,
	kind: "xcm-transfer",
	destination: "hydration",
	deliveryFee: undefined as Amount | undefined,
	destinationFee: undefined as Amount | undefined,
	totalIn: undefined as bigint | undefined,
	received: undefined as bigint | undefined,
}));

vi.mock("./SwapProvider", () => ({
	useSwap: () => ({
		risk: swap.risk,
		isRiskAcknowledged: false,
		onRiskAcknowledgeChange: () => {},
		tokenIn: KNOWN_TOKENS_MAP["native::pah"],
		tokenOut: KNOWN_TOKENS_MAP["native::pah"],
		totalIn: swap.totalIn,
		swapPlancksOut: swap.received,
		deliveryFee: swap.deliveryFee,
		details: {
			kind: swap.kind,
			route: { destination: swap.destination },
			quote: { deliveryFee: swap.deliveryFee },
			destinationFee: swap.destinationFee,
		},
	}),
}));

vi.mock("../transaction/TransactionProvider", () => ({
	useTransaction: () => ({
		feeToken: KNOWN_TOKENS_MAP["native::pah"],
		feeEstimate: 11_000_000n,
	}),
}));

vi.mock("../../hooks/useStablePlancksMulti", () => ({
	useStablePlancksMulti: () => ({ isLoading: true, data: [] }),
}));

vi.mock("../../hooks/useToken", () => ({
	useToken: ({ tokenId }: { tokenId: string }) => ({
		data: KNOWN_TOKENS_MAP[tokenId],
		isLoading: false,
	}),
}));

afterEach(cleanup);

describe("SwapRiskWarning", () => {
	it("states the share of what a transfer sends that its fees take, below the confirmation threshold too", () => {
		swap.deliveryFee = { tokenId: "native::pah", plancks: 30_000_000n };
		swap.totalIn = 1_000_000_000n;
		swap.received = 995_000_000n;
		swap.risk = {
			level: "warn",
			losses: [{ kind: "fees", ratio: 0.034 }],
			headline: { kind: "fees", ratio: 0.034 },
			cause: "delivery-fee",
		};
		render(<SwapRiskWarning />);

		expect(screen.getByRole("alert").textContent).toContain(
			"You pay 0.0046 DOT in fees (4.6% of what you send) to deliver 0.0995 DOT.",
		);
	});

	it("says what a transfer pays in fees, transaction fee included, and what it delivers", () => {
		swap.deliveryFee = { tokenId: "native::pah", plancks: 305_000_000n };
		swap.totalIn = 1_000_000_000n;
		swap.received = 995_000_000n;
		swap.risk = {
			level: "confirm",
			losses: [{ kind: "fees", ratio: 0.2375 }],
			headline: { kind: "fees", ratio: 0.2375 },
			cause: "delivery-fee",
		};
		render(<SwapRiskWarning />);

		expect(screen.getByRole("alert").textContent).toContain(
			"You pay 0.0321 DOT in fees (32.1% of what you send) to deliver 0.0995 DOT.",
		);
		expect(
			screen.getByLabelText("I accept these fees and want to transfer anyway"),
		).toBeTruthy();
	});

	it("names the destination chain fee when it makes most of a swap's loss", () => {
		swap.kind = "xcm-destination-swap";
		swap.destination = "pah";
		swap.deliveryFee = { tokenId: "native::pah", plancks: 0n };
		swap.destinationFee = { tokenId: "native::pah", plancks: 17_000_000n };
		swap.risk = {
			level: "confirm",
			losses: [{ kind: "value-loss", ratio: 0.1739 }],
			headline: { kind: "value-loss", ratio: 0.1739 },
			cause: "destination-fee",
		};
		render(<SwapRiskWarning />);

		expect(screen.getByRole("alert").textContent).toContain(
			"You receive 17.39% less value than you send, mostly the 0.0017 DOT Polkadot Asset Hub fee.",
		);
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

	it("prints the price impact with two decimals, as the summary row does", () => {
		swap.risk = {
			level: "confirm",
			losses: [{ kind: "price-impact", ratio: 0.53 }],
			headline: { kind: "price-impact", ratio: 0.53 },
			cause: null,
		};
		render(<SwapRiskWarning />);

		expect(screen.getByRole("alert").textContent).toContain(
			"Price impact is 53.00%",
		);
	});
});
