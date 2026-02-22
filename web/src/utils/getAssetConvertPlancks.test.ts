import { describe, expect, it } from "vitest";
import type { TokenId } from "../registry/tokens/types";
import { getAssetConvertPlancks } from "./getAssetConvertPlancks";

const native = "native::pah" as TokenId;
const usdt = "asset::pah::1984" as TokenId;
const usdc = "asset::pah::1337" as TokenId;

describe("getAssetConvertPlancks", () => {
	it("returns same plancks when tokenIn equals tokenOut", () => {
		const result = getAssetConvertPlancks(
			1000n,
			usdt,
			native,
			usdt,
			[100n, 200n],
			[300n, 400n],
		);
		expect(result).toBe(1000n);
	});

	it("converts native to non-native using reserves", () => {
		// native → usdt with reserves [nativeReserve=1000, usdtReserve=2000]
		// result = plancks * usdtReserve / nativeReserve = 100 * 2000 / 1000 = 200
		const result = getAssetConvertPlancks(
			100n,
			native,
			native,
			usdt,
			[1n, 1n], // not used when tokenIn is native
			[1000n, 2000n],
		);
		expect(result).toBe(200n);
	});

	it("converts non-native to non-native via native intermediary", () => {
		// usdt → usdc: usdt→native→usdc
		// step1: nativePlancks = plancks * nativeToUsdtReserveIn / nativeToUsdtReserveOut
		//   = 100 * 500 / 1000 = 50
		// step2: outPlancks = nativePlancks * nativeToUsdcReserveOut / nativeToUsdcReserveIn
		//   = 50 * 2000 / 500 = 200
		const result = getAssetConvertPlancks(
			100n,
			usdt,
			native,
			usdc,
			[500n, 1000n], // native-to-usdt reserves
			[500n, 2000n], // native-to-usdc reserves
		);
		expect(result).toBe(200n);
	});

	it("returns undefined when reservesNativeToTokenIn includes zero", () => {
		const result = getAssetConvertPlancks(
			100n,
			usdt,
			native,
			usdc,
			[0n, 1000n],
			[500n, 2000n],
		);
		expect(result).toBeUndefined();
	});

	it("handles native-to-native (identity)", () => {
		const result = getAssetConvertPlancks(
			1234n,
			native,
			native,
			native,
			[1n, 1n],
			[1n, 1n],
		);
		expect(result).toBe(1234n);
	});

	it("handles large plancks without overflow", () => {
		const result = getAssetConvertPlancks(
			10n ** 18n,
			native,
			native,
			usdt,
			[1n, 1n],
			[10n ** 15n, 10n ** 15n],
		);
		expect(result).toBe(10n ** 18n);
	});
});
