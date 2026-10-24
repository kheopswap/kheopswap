import { describe, expect, it } from "vitest";
import {
	getRiskSubmitGate,
	getSwapRisk,
	getValueLoss,
	isRiskAcknowledged,
} from "./swapRisk";

describe("getValueLoss", () => {
	it("is the share of the sent value that does not come back", () => {
		expect(getValueLoss(1_000_000n, 784_000n)).toBe(0.216);
	});

	it.each([
		["nothing is sent", 0n, 10n],
		["the received value is unknown", 10n, undefined],
		["the sent value is unknown", null, 10n],
	])("is unknown when %s", (_, sent, received) => {
		expect(getValueLoss(sent, received)).toBeUndefined();
	});
});

describe("getSwapRisk", () => {
	it.each([
		[-0.05, undefined],
		[undefined, 0.03],
		[-0.01, 0.01],
	])(
		"lets a swap through untouched at impact %s and value loss %s",
		(priceImpact, valueLoss) => {
			expect(getSwapRisk({ priceImpact, valueLoss })).toEqual({
				level: "none",
			});
		},
	);

	it("warns above 5% price impact", () => {
		expect(getSwapRisk({ priceImpact: -0.06, valueLoss: undefined })).toEqual({
			level: "warn",
			losses: [{ kind: "price-impact", ratio: 0.06 }],
			worstRatio: 0.06,
		});
	});

	it("warns above 3% value loss even when the price impact is small", () => {
		expect(getSwapRisk({ priceImpact: -0.009, valueLoss: 0.04 })).toMatchObject(
			{
				level: "warn",
				losses: [{ kind: "value-loss" }],
			},
		);
	});

	it.each([
		["price impact", -0.5362, 0.01],
		["value loss", -0.01, 0.2],
	])("asks for confirmation above 15% %s", (_, priceImpact, valueLoss) => {
		expect(getSwapRisk({ priceImpact, valueLoss }).level).toBe("confirm");
	});

	it("reports both losses and the worst of them", () => {
		expect(getSwapRisk({ priceImpact: -0.2, valueLoss: 0.25 })).toEqual({
			level: "confirm",
			losses: [
				{ kind: "price-impact", ratio: 0.2 },
				{ kind: "value-loss", ratio: 0.25 },
			],
			worstRatio: 0.25,
		});
	});
});

describe("isRiskAcknowledged", () => {
	const confirm = (worstRatio: number) =>
		getSwapRisk({ priceImpact: -worstRatio, valueLoss: undefined });
	const KEY = "usdc>pink:1000000";

	it("needs no acknowledgement below the confirmation tier", () => {
		expect(isRiskAcknowledged(confirm(0.06), null, KEY)).toBe(true);
	});

	it("needs one above it", () => {
		expect(isRiskAcknowledged(confirm(0.5), null, KEY)).toBe(false);
	});

	it("holds for the same pair and amount while the loss does not grow", () => {
		const acknowledgement = { key: KEY, ratio: 0.5 };
		expect(isRiskAcknowledged(confirm(0.5), acknowledgement, KEY)).toBe(true);
		expect(isRiskAcknowledged(confirm(0.45), acknowledgement, KEY)).toBe(true);
	});

	it("lapses when the quote gets worse", () => {
		expect(
			isRiskAcknowledged(confirm(0.51), { key: KEY, ratio: 0.5 }, KEY),
		).toBe(false);
	});

	it("lapses when the pair or the amount changes", () => {
		expect(
			isRiskAcknowledged(
				confirm(0.5),
				{ key: KEY, ratio: 0.5 },
				"usdc>pink:2000000",
			),
		).toBe(false);
	});
});

describe("getRiskSubmitGate", () => {
	it("closes an open gate until the loss is acknowledged", () => {
		expect(getRiskSubmitGate({ status: "open" }, false)).toEqual({
			status: "closed",
			reason: "Confirm the loss to swap anyway",
		});
		expect(getRiskSubmitGate({ status: "open" }, true)).toEqual({
			status: "open",
		});
	});

	it.each([
		{ status: "pending" } as const,
		{ status: "closed", reason: "Insufficient liquidity" } as const,
	])("keeps the route's own %o gate", (gate) => {
		expect(getRiskSubmitGate(gate, false)).toBe(gate);
	});
});
