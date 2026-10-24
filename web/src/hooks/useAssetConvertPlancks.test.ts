import { firstValueFrom, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { getAssetConvertPlancks$ } from "./useAssetConvertPlancks";

vi.mock("../services/tokens/service", () => ({
	getTokenById$: (id: string) =>
		of({ token: { id, decimals: 10 }, status: "loaded" }),
}));

vi.mock("../state/convert", () => ({
	getAssetConvert$: ({ plancksIn }: { plancksIn: bigint }) =>
		of({ plancksOut: plancksIn * 2n, isLoading: false }),
}));

const NATIVE = "native::pah";
const USDC = "asset::pah::1337";

describe("getAssetConvertPlancks$", () => {
	it("converts a known amount", async () => {
		const { plancksOut } = await firstValueFrom(
			getAssetConvertPlancks$(NATIVE, USDC, 100n),
		);
		expect(plancksOut).toBe(200n);
	});

	it("converts zero to zero", async () => {
		const { plancksOut } = await firstValueFrom(
			getAssetConvertPlancks$(NATIVE, USDC, 0n),
		);
		expect(plancksOut).toBe(0n);
	});

	it("answers null, never zero, when the amount is unknown", async () => {
		const { plancksOut, isLoading } = await firstValueFrom(
			getAssetConvertPlancks$(NATIVE, USDC, null),
		);
		expect(plancksOut).toBeNull();
		expect(isLoading).toBe(false);
	});

	it("answers null when a token is missing", async () => {
		const { plancksOut } = await firstValueFrom(
			getAssetConvertPlancks$(NATIVE, null, 100n),
		);
		expect(plancksOut).toBeNull();
	});
});
