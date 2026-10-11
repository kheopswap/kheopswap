import { describe, expect, it } from "vitest";
import { getAllocation, getAllocationColors } from "./getAllocation";

const holding = (token: string, stablePlancks: bigint) => ({
	token,
	stablePlancks,
});

describe("getAllocation", () => {
	it("sorts slices by value, largest first", () => {
		const { total, slices, other } = getAllocation([
			holding("DOT", 260n),
			holding("USDt", 620n),
			holding("KSM", 120n),
		]);

		expect(total).toBe(1000n);
		expect(slices).toEqual([
			{ token: "USDt", stablePlancks: 620n, share: 0.62 },
			{ token: "DOT", stablePlancks: 260n, share: 0.26 },
			{ token: "KSM", stablePlancks: 120n, share: 0.12 },
		]);
		expect(other).toBeNull();
	});

	it("folds holdings below the minimum share into other", () => {
		const { slices, other } = getAllocation([
			holding("USDt", 9_700n),
			holding("USDC", 150n),
			holding("TSN", 100n),
			holding("dotUSD", 50n),
		]);

		expect(slices.map((s) => s.token)).toEqual(["USDt"]);
		expect(other).toEqual({ stablePlancks: 300n, share: 0.03 });
	});

	it("keeps a holding exactly at the minimum share", () => {
		const { slices, other } = getAllocation(
			[holding("A", 95n), holding("B", 5n)],
			0.05,
		);
		expect(slices.map((s) => s.token)).toEqual(["A", "B"]);
		expect(other).toBeNull();
	});

	it("returns an empty allocation when nothing has value", () => {
		expect(getAllocation([holding("DOT", 0n), holding("KSM", 0n)])).toEqual({
			total: 0n,
			slices: [],
			other: null,
		});
		expect(getAllocation([])).toEqual({ total: 0n, slices: [], other: null });
	});

	it("ignores holdings without value", () => {
		const { slices } = getAllocation([holding("DOT", 10n), holding("KSM", 0n)]);
		expect(slices).toEqual([{ token: "DOT", stablePlancks: 10n, share: 1 }]);
	});
});

describe("getAllocationColors", () => {
	it("keeps logo colours and gives each monochrome token its own neutral step", () => {
		const colors = getAllocationColors([
			"rgb(60 170 160)",
			null,
			null,
			"rgb(220 40 40)",
			null,
			null,
		]);

		expect(colors[0]).toBe("rgb(60 170 160)");
		expect(colors[3]).toBe("rgb(220 40 40)");
		expect(colors[1]).toBe("var(--color-text)");
		expect(new Set([colors[1], colors[2], colors[4]]).size).toBe(3);
		expect(colors[5]).toBe(colors[4]);
	});
});
