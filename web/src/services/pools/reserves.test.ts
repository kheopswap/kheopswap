import { firstValueFrom, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import type { LoadingStatus } from "../common";
import { getPoolReserves$ } from "./reserves";
import type { Pool } from "./types";

const POOL_OWNER = "5PoolOwnerAddress";
const NATIVE = "native::pah";
const ASSET = "asset::pah::1337";
const ASSET_LOADING = "asset::pah::1338";
const ASSET_UNKNOWN = "asset::pah::9999";

const POOLS: Pool[] = [
	{
		type: "asset-convertion",
		chainId: "pah",
		poolAssetId: 0,
		tokenIds: [NATIVE, ASSET],
		owner: POOL_OWNER,
	},
	{
		type: "asset-convertion",
		chainId: "pah",
		poolAssetId: 1,
		tokenIds: [NATIVE, ASSET_LOADING],
		owner: POOL_OWNER,
	},
];

vi.mock("./service", () => ({
	getPoolsByChain$: () => of({ pools: POOLS, status: "loaded" as const }),
}));

vi.mock("../balances/service", () => ({
	getBalance$: ({ tokenId }: { tokenId: string }) => {
		const fixtures: Record<
			string,
			{ balance: bigint | undefined; status: LoadingStatus }
		> = {
			[NATIVE]: { balance: 1_000n, status: "loaded" },
			[ASSET]: { balance: 2_000n, status: "loaded" },
			[ASSET_LOADING]: { balance: undefined, status: "loading" },
		};
		return of(fixtures[tokenId] ?? { balance: undefined, status: "loaded" });
	},
}));

describe("getPoolReserves$", () => {
	it("orders reserves native-first for a native->asset swap", async () => {
		const { reserves, isLoading } = await firstValueFrom(
			getPoolReserves$(NATIVE, ASSET),
		);
		expect(reserves).toEqual([1_000n, 2_000n]);
		expect(isLoading).toBe(false);
	});

	it("reverses reserves for an asset->native swap", async () => {
		const { reserves } = await firstValueFrom(getPoolReserves$(ASSET, NATIVE));
		expect(reserves).toEqual([2_000n, 1_000n]);
	});

	it("returns null reserves when no pool matches the pair", async () => {
		const { reserves, isLoading } = await firstValueFrom(
			getPoolReserves$(NATIVE, ASSET_UNKNOWN),
		);
		expect(reserves).toBeNull();
		expect(isLoading).toBe(false);
	});

	it("returns null reserves for tokens on different chains", async () => {
		const { reserves, isLoading } = await firstValueFrom(
			getPoolReserves$("native::pah", "native::kah"),
		);
		expect(reserves).toBeNull();
		expect(isLoading).toBe(false);
	});

	it("returns null reserves when token ids are missing", async () => {
		const { reserves, isLoading } = await firstValueFrom(
			getPoolReserves$(null, ASSET),
		);
		expect(reserves).toBeNull();
		expect(isLoading).toBe(false);
	});

	it("propagates the loading state of the reserve balances", async () => {
		const { reserves, isLoading } = await firstValueFrom(
			getPoolReserves$(NATIVE, ASSET_LOADING),
		);
		expect(reserves).toBeNull();
		expect(isLoading).toBe(true);
	});
});
