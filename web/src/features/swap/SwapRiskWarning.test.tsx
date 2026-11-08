import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KNOWN_TOKENS_MAP } from "../../registry/tokens/tokens";
import { SwapRiskWarning } from "./SwapRiskWarning";
import type { SwapRisk } from "./swapRisk";

type Amount = { tokenId: string; plancks: bigint };

const swap = vi.hoisted(() => ({
	risk: { level: "none" } as SwapRisk,
	route: { kind: "xcm-transfer", origin: "pah", destination: "hydration" } as {
		kind: string;
		origin: string;
		destination: string;
		viaHub?: { toHub: { destination: string } };
	},
	deliveryFee: undefined as Amount | undefined,
	destinationFee: undefined as Amount | undefined,
	received: undefined as bigint | undefined,
	transferFees: undefined as
		| { fees: Amount[]; share: number; isPartial: boolean }
		| undefined,
}));

vi.mock("./SwapRiskProvider", () => ({
	useSwapRiskContext: () => ({
		risk: swap.risk,
		isAcknowledged: false,
		onAcknowledgeChange: () => {},
		transferFees: swap.transferFees,
	}),
}));

vi.mock("./SwapProvider", () => ({
	useSwap: () => ({
		tokenOut: KNOWN_TOKENS_MAP["native::pah"],
		swapPlancksOut: swap.received,
		details: {
			kind: swap.route.kind,
			route: swap.route,
			quote: {
				isLoading: false,
				deliveryFee: swap.deliveryFee,
				data: swap.destinationFee && {
					success: true,
					quote: { received: 0n, destinationFee: swap.destinationFee },
				},
			},
		},
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
	it("states the share of what a transfer sends that its fees take, below the confirmation threshold too", () => {
		swap.received = 995_000_000n;
		swap.transferFees = {
			fees: [{ tokenId: "native::pah", plancks: 35_000_000n }],
			share: 0.035,
			isPartial: false,
		};
		swap.risk = {
			level: "warn",
			losses: [{ kind: "fees", ratio: 0.035 }],
			headline: { kind: "fees", ratio: 0.035 },
			cause: "delivery-fee",
		};
		render(<SwapRiskWarning />);

		expect(screen.getByRole("alert").textContent).toContain(
			"You pay 0.0035 DOT in fees (3.5% of what you send) to deliver 0.0995 DOT.",
		);
		expect(screen.queryByRole("checkbox")).toBeNull();
	});

	it("says what a transfer pays in fees and what it delivers, and asks to accept them", () => {
		swap.deliveryFee = { tokenId: "native::pah", plancks: 305_000_000n };
		swap.transferFees = {
			fees: [
				{ tokenId: "native::pah", plancks: 310_000_000n },
				{ tokenId: "native::hydration", plancks: 1_000_000_000_000n },
			],
			share: 0.31,
			isPartial: false,
		};
		swap.risk = {
			level: "confirm",
			losses: [{ kind: "fees", ratio: 0.31 }],
			headline: { kind: "fees", ratio: 0.31 },
			cause: "delivery-fee",
		};
		render(<SwapRiskWarning />);

		expect(screen.getByRole("alert").textContent).toContain(
			"You pay 0.031 DOT + 1 HDX in fees (31% of what you send) to deliver 0.0995 DOT.",
		);
		expect(
			screen.getByLabelText("I accept these fees and want to transfer anyway"),
		).toBeTruthy();
	});

	it("gives a lower bound when a fee cannot be valued", () => {
		swap.transferFees = {
			fees: [
				{ tokenId: "native::pah", plancks: 500_000_000n },
				{ tokenId: "native::hydration", plancks: 1_000_000_000_000n },
			],
			share: 0.5,
			isPartial: true,
		};
		swap.risk = {
			level: "confirm",
			losses: [{ kind: "fees", ratio: 0.5 }],
			headline: { kind: "fees", ratio: 0.5 },
			cause: null,
		};
		render(<SwapRiskWarning />);

		expect(screen.getByRole("alert").textContent).toContain(
			"in fees (at least 50% of what you send)",
		);
	});

	it("names the destination chain fee when it makes most of a swap's loss", () => {
		swap.route = {
			kind: "xcm-destination-swap",
			origin: "hydration",
			destination: "pah",
		};
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
			"You receive 17.39% less value than you send, mostly the 0.0017 DOT fee on Polkadot Asset Hub.",
		);
		expect(
			screen.getByLabelText("I accept this loss and want to swap anyway"),
		).toBeTruthy();
	});

	it("names both the hub and the destination when a transfer through a hub loses most to their fee", () => {
		swap.route = {
			kind: "xcm-transfer",
			origin: "ppeople",
			destination: "hydration",
			viaHub: { toHub: { destination: "pah" } },
		};
		swap.transferFees = undefined;
		swap.destinationFee = { tokenId: "native::pah", plancks: 17_000_000n };
		swap.risk = {
			level: "confirm",
			losses: [{ kind: "fees", ratio: 0.1739 }],
			headline: { kind: "fees", ratio: 0.1739 },
			cause: "destination-fee",
		};
		render(<SwapRiskWarning />);

		expect(screen.getByRole("alert").textContent).toContain(
			"Fees take 17.39% of what you send, mostly the 0.0017 DOT fee on Polkadot Asset Hub and Hydration.",
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

	it("prints the price impact as the summary row does", () => {
		swap.risk = {
			level: "warn",
			losses: [{ kind: "price-impact", ratio: 0.0612 }],
			headline: { kind: "price-impact", ratio: 0.0612 },
			cause: null,
		};
		render(<SwapRiskWarning />);

		expect(screen.getByRole("alert").textContent).toContain(
			"Price impact is 6.12%",
		);
	});

	it("renders nothing for a swap without risk", () => {
		swap.risk = { level: "none" };
		render(<SwapRiskWarning />);

		expect(screen.queryByRole("alert")).toBeNull();
	});
});
