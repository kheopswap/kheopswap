import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useConvertedFee } from "./useConvertedFee";

vi.mock("./useAssetConvertPlancks", () => ({
	useAssetConvertPlancks: ({
		plancks,
	}: {
		plancks: bigint | null | undefined;
	}) => ({
		isLoading: false,
		plancksOut: plancks ?? 0n,
	}),
}));

const renderFee = (nativeFee: bigint | null | undefined) =>
	renderHook(() =>
		useConvertedFee({
			chainId: "pasah",
			feeTokenId: "asset::pasah::1337",
			nativeFee,
		}),
	).result.current;

describe("useConvertedFee", () => {
	it("converts a known native fee on Asset Hub", () => {
		expect(renderFee(10n)).toEqual({ isLoading: false, data: 10n });
	});

	it("has no fee while the native fee is unknown on Asset Hub", () => {
		expect(renderFee(undefined).data).toBeNull();
		expect(renderFee(null).data).toBeNull();
	});
});
