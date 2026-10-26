import { renderHook } from "@testing-library/react";
import { of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { hasValueLine, useIsValuedAsStable } from "./hasValueLine";

vi.mock("../state/relay", () => ({
	useRelayChains: () => ({ stableToken: { id: "native::pasah" } }),
}));

vi.mock("../state/prices", () => ({
	getAssetHubMirrorTokenId$: (tokenId: string) =>
		of(tokenId === "native::ppeople" ? "native::pasah" : tokenId),
}));

describe("useIsValuedAsStable", () => {
	it("treats a mirror of the stable token as the stable token", () => {
		const { result } = renderHook(() => useIsValuedAsStable("native::ppeople"));
		expect(result.current).toBe(true);
	});

	it("keeps any other token valued in the stable token", () => {
		const { result } = renderHook(() =>
			useIsValuedAsStable("asset::pasah::1337"),
		);
		expect(result.current).toBe(false);
	});
});

describe("hasValueLine", () => {
	it("values a non-zero amount of any token not valued as the stable one", () => {
		expect(hasValueLine(false, 5n)).toBe(true);
		expect(hasValueLine(true, 5n)).toBe(false);
	});

	it("never values a zero amount, and keeps room for an amount still loading", () => {
		expect(hasValueLine(false, 0n)).toBe(false);
		expect(hasValueLine(false, null)).toBe(true);
	});
});
