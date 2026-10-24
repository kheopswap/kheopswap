import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { TokenAmount } from "../../../../registry/tokens/types";
import type { AnyTransaction } from "../../../../types/transactions";
import { getAmmPath } from "../ammPath";
import type { XcmDestinationSwapRoute, XcmRoute } from "../swapRoute";
import { usdtToPink } from "../xcmDestinationSwap/xcmDestinationSwap.fixtures";
import { usdcToUsdt } from "../xcmSwap/xcmSwap.fixtures";
import type { XcmDryRunBalances } from "./useXcmDryRunBalances";
import { useXcmQuote } from "./useXcmQuote";
import { dotToAssetHub } from "./xcmFromHydration.fixtures";
import type { DestinationDryRun, OriginDryRun } from "./xcmQuote";
import {
	dotOriginFailed,
	dotSuccess,
	dotTrapped,
} from "./xcmTransfer.fixtures";

const chain = vi.hoisted(() => ({
	originDryRuns: new Map<unknown, unknown>(),
	destinationDryRun: undefined as unknown,
	deliveryFees: undefined as unknown,
	dryRunCall: undefined as unknown as ReturnType<typeof vi.fn>,
	dryRunXcm: undefined as unknown as Mock<(...args: unknown[]) => unknown>,
	queryDeliveryFees: undefined as unknown as Mock<
		(...args: unknown[]) => unknown
	>,
	destinationWeight: undefined as unknown,
	destinationFee: undefined as unknown,
	queryWeightToAssetFee: undefined as unknown as Mock<
		(...args: unknown[]) => unknown
	>,
	calledChains: [] as [string, string][],
}));

vi.mock("../../../../papi/getApi", () => ({
	getApi: async (chainId: string) => ({
		chainId,
		apis: {
			DryRunApi: {
				dry_run_call: chain.dryRunCall,
				dry_run_xcm: (...args: unknown[]) => {
					chain.calledChains.push(["dry_run_xcm", chainId]);
					return chain.dryRunXcm(...args);
				},
			},
			XcmPaymentApi: {
				query_delivery_fees: (...args: unknown[]) => {
					chain.calledChains.push(["query_delivery_fees", chainId]);
					return chain.queryDeliveryFees(...args);
				},
				query_xcm_weight: async () => {
					chain.calledChains.push(["query_xcm_weight", chainId]);
					return chain.destinationWeight;
				},
				query_weight_to_asset_fee: (...args: unknown[]) => {
					chain.calledChains.push(["query_weight_to_asset_fee", chainId]);
					return chain.queryWeightToAssetFee(...args);
				},
			},
		},
	}),
}));

const transferRoute: XcmRoute = {
	kind: "xcm-transfer",
	origin: "pah",
	destination: "hydration",
	tokenIdIn: "native::pah",
	tokenIdOut: "hydration-asset::hydration::5",
};

const swapRoute: XcmRoute = {
	kind: "xcm-swap",
	origin: "pah",
	destination: "hydration",
	tokenIdIn: "asset::pah::1337",
	tokenIdOut: "hydration-asset::hydration::10",
	path: getAmmPath("asset::pah::1337", "asset::pah::1984", "native::pah"),
};

const dotDeliveryFee = (plancks: bigint) => ({
	success: true,
	value: {
		type: "V5",
		value: [
			{
				id: { parents: 1, interior: { type: "Here", value: undefined } },
				fun: { type: "Fungible", value: plancks },
			},
		],
	},
});

const call = { decodedCall: { name: "transfer" } } as unknown as AnyTransaction;
const fakeCall = {
	decodedCall: { name: "fake transfer" },
} as unknown as AnyTransaction;

const givenDryRuns = ({
	origin,
	estimate = dotSuccess.origin,
	destination,
	deliveryFees = dotDeliveryFee(304850000n),
}: {
	origin: OriginDryRun;
	estimate?: OriginDryRun;
	destination?: DestinationDryRun | Error;
	deliveryFees?: unknown;
}) => {
	chain.originDryRuns = new Map<unknown, unknown>([
		[call.decodedCall, origin],
		[fakeCall.decodedCall, estimate],
	]);
	chain.destinationDryRun = destination;
	chain.deliveryFees = deliveryFees;
};

const LOADED_BALANCES: XcmDryRunBalances = {
	isLoading: false,
	origin: { "native::pah": { balance: 10_000_000_000n, frozen: 0n } },
	destination: { "hydration-asset::hydration::5": { balance: 0n, frozen: 0n } },
};

const renderQuote = ({
	route = transferRoute,
	destinationFee,
	beneficiary = dotSuccess.beneficiary,
	extra,
	balances = LOADED_BALANCES,
}: {
	route?: XcmRoute;
	destinationFee?: TokenAmount;
	beneficiary?: string;
	extra?: () => unknown;
	balances?: XcmDryRunBalances;
} = {}) => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0 } },
	});
	const wrapper: FC<PropsWithChildren> = ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(
		(props: { balances: XcmDryRunBalances }) => {
			extra?.();
			return useXcmQuote({
				route,
				destinationFee,
				beneficiary,
				call,
				fakeCall,
				balances: props.balances,
			});
		},
		{ wrapper, initialProps: { balances } },
	);
};

beforeEach(() => {
	chain.calledChains = [];
	chain.dryRunCall = vi.fn(async (_origin, decodedCall) =>
		chain.originDryRuns.get(decodedCall),
	);
	chain.dryRunXcm = vi.fn(async () => {
		if (chain.destinationDryRun instanceof Error) throw chain.destinationDryRun;
		return chain.destinationDryRun;
	});
	chain.queryWeightToAssetFee = vi.fn(async () => chain.destinationFee);
	chain.queryDeliveryFees = vi.fn(async () => {
		if (chain.deliveryFees instanceof Error) throw chain.deliveryFees;
		return chain.deliveryFees;
	});
});

const HYDRATION_LOCATION = {
	type: "V5",
	value: {
		parents: 1,
		interior: { type: "X1", value: { type: "Parachain", value: 2034 } },
	},
};

describe("useXcmQuote", () => {
	describe("when a balance changes after a successful quote", () => {
		const quoteThenChange = async (balances: XcmDryRunBalances) => {
			givenDryRuns({
				origin: dotSuccess.origin,
				destination: dotSuccess.destination,
			});
			const rendered = renderQuote();
			await waitFor(() =>
				expect(rendered.result.current.data).toMatchObject({ success: true }),
			);
			const originRuns = chain.dryRunCall.mock.calls.length;
			const destinationRuns = chain.dryRunXcm.mock.calls.length;
			rendered.rerender({ balances });
			return { ...rendered, originRuns, destinationRuns };
		};

		it("simulates the origin again, staying loading until it answers", async () => {
			const { result, originRuns } = await quoteThenChange({
				...LOADED_BALANCES,
				origin: { "native::pah": { balance: 1_000_000n, frozen: 0n } },
			});

			expect(result.current.isLoading).toBe(true);
			await waitFor(() => expect(result.current.isLoading).toBe(false));
			expect(chain.dryRunCall.mock.calls.length).toBe(originRuns + 2);
		});

		it("simulates the destination again, staying loading until it answers", async () => {
			const { result, originRuns, destinationRuns } = await quoteThenChange({
				...LOADED_BALANCES,
				destination: {
					"hydration-asset::hydration::5": {
						balance: 5_000_000_000n,
						frozen: 0n,
					},
				},
			});

			expect(result.current.isLoading).toBe(true);
			await waitFor(() => expect(result.current.isLoading).toBe(false));
			expect(chain.dryRunXcm.mock.calls.length).toBe(destinationRuns + 1);
			expect(chain.dryRunCall.mock.calls.length).toBe(originRuns);
		});

		it.each([
			{
				side: "origin",
				changed: {
					...LOADED_BALANCES,
					origin: { "native::pah": { balance: 1_000_000n, frozen: 0n } },
				},
			},
			{
				side: "destination",
				changed: {
					...LOADED_BALANCES,
					destination: {
						"hydration-asset::hydration::5": {
							balance: 5_000_000_000n,
							frozen: 0n,
						},
					},
				},
			},
		])(
			"stays loading when the $side balance returns to a value simulated before",
			async ({ changed }) => {
				const { result, rerender } = await quoteThenChange(changed);
				await waitFor(() => expect(result.current.isLoading).toBe(false));
				const runs =
					chain.dryRunCall.mock.calls.length +
					chain.dryRunXcm.mock.calls.length;

				rerender({ balances: LOADED_BALANCES });

				expect(result.current.isLoading).toBe(true);
				await waitFor(() => expect(result.current.isLoading).toBe(false));
				expect(
					chain.dryRunCall.mock.calls.length +
						chain.dryRunXcm.mock.calls.length,
				).toBeGreaterThan(runs);
			},
		);
	});

	it("waits for the balances before simulating", async () => {
		givenDryRuns({
			origin: dotSuccess.origin,
			destination: dotSuccess.destination,
		});
		const { result, rerender } = renderQuote({
			balances: { isLoading: true, origin: undefined, destination: undefined },
		});

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(result.current.isLoading).toBe(true);
		expect(chain.dryRunCall).not.toHaveBeenCalled();

		rerender({ balances: LOADED_BALANCES });
		await waitFor(() =>
			expect(result.current.data).toMatchObject({ success: true }),
		);
		expect(chain.dryRunCall).toHaveBeenCalledTimes(2);
	});

	it("quotes the amount received on Hydration from both dry runs", async () => {
		givenDryRuns({
			origin: dotSuccess.origin,
			destination: dotSuccess.destination,
		});
		const { result } = renderQuote();

		await waitFor(() => expect(result.current.data).toBeDefined());
		expect(result.current).toEqual({
			isLoading: false,
			deliveryFee: { tokenId: "native::pah", plancks: 304850000n },
			sent: expect.any(BigInt),
			data: {
				success: true,
				quote: {
					received: 9995190152n,
					destinationFee: {
						tokenId: "hydration-asset::hydration::5",
						plancks: 4809848n,
					},
				},
			},
		});
		expect(chain.queryDeliveryFees).toHaveBeenCalledWith(
			HYDRATION_LOCATION,
			dotSuccess.origin.success &&
				dotSuccess.origin.value.forwarded_xcms[0]?.[1][0],
			{ type: "V5", value: { parents: 1, interior: { type: "Here" } } },
			{ at: "best" },
		);
		expect(chain.dryRunXcm).toHaveBeenCalledWith(
			{
				type: "V5",
				value: {
					parents: 1,
					interior: { type: "X1", value: { type: "Parachain", value: 1000 } },
				},
			},
			dotSuccess.origin.success &&
				dotSuccess.origin.value.forwarded_xcms[0]?.[1][0],
			{ at: "best" },
		);
	});

	it("charges Hydration what the swap sent minus what it received", async () => {
		givenDryRuns({
			origin: usdcToUsdt.origin,
			destination: usdcToUsdt.destination,
			deliveryFees: usdcToUsdt.deliveryFee,
		});
		const { result } = renderQuote({
			route: swapRoute,
			beneficiary: usdcToUsdt.sender,
		});

		await waitFor(() => expect(result.current.data).toBeDefined());
		expect(result.current).toEqual({
			isLoading: false,
			deliveryFee: { tokenId: "native::pah", plancks: 305450000n },
			sent: expect.any(BigInt),
			data: {
				success: true,
				quote: {
					received: 98764625n,
					destinationFee: {
						tokenId: "hydration-asset::hydration::10",
						plancks: 574n,
					},
				},
			},
		});
	});

	it("fails when the delivery fee cannot be read, even if Hydration accepts the message", async () => {
		givenDryRuns({
			origin: dotSuccess.origin,
			destination: dotSuccess.destination,
			deliveryFees: new Error("rpc down"),
		});
		const { result } = renderQuote();

		await waitFor(() => expect(result.current.data).toBeDefined());
		expect(result.current.data).toEqual({
			success: false,
			failure: { kind: "delivery-fee-unavailable" },
		});
	});

	it("does not dry run Hydration when Asset Hub rejects the call, and still estimates the delivery fee", async () => {
		givenDryRuns({ origin: dotOriginFailed.origin });
		const { result } = renderQuote();

		await waitFor(() => expect(result.current.data).toBeDefined());
		await waitFor(() =>
			expect(result.current.deliveryFee?.plancks).toBe(304850000n),
		);
		expect(result.current.data).toEqual({
			success: false,
			failure: { kind: "origin-withdraw-failed" },
		});
		expect(chain.dryRunXcm).not.toHaveBeenCalled();
	});

	it("refuses a transfer whose assets Hydration would trap", async () => {
		givenDryRuns({
			origin: dotTrapped.origin,
			destination: dotTrapped.destination,
		});
		const { result } = renderQuote();

		await waitFor(() => expect(result.current.data).toBeDefined());
		expect(result.current.data).toEqual({
			success: false,
			failure: {
				kind: "destination-rejected",
				reason: "FailedToTransactAsset",
				assetsTrapped: true,
				trappedPlancks: expect.any(BigInt),
			},
		});
	});

	it("reports Hydration as unavailable when its dry run errors, keeping the origin delivery fee", async () => {
		givenDryRuns({
			origin: dotSuccess.origin,
			estimate: dotTrapped.origin,
			destination: new Error("rpc down"),
		});
		const { result } = renderQuote();

		await waitFor(() => expect(result.current.data).toBeDefined());
		expect(result.current).toMatchObject({
			isLoading: false,
			deliveryFee: { tokenId: "native::pah", plancks: 304850000n },
			data: { success: false, failure: { kind: "destination-unavailable" } },
		});
	});

	it("quotes a transfer back from Hydration, asking Hydration's delivery fee without an asset id", async () => {
		givenDryRuns({
			origin: dotToAssetHub.origin,
			estimate: dotToAssetHub.origin,
			destination: dotToAssetHub.destination,
			deliveryFees: dotToAssetHub.deliveryFees,
		});
		const { result } = renderQuote({
			route: {
				kind: "xcm-transfer",
				origin: "hydration",
				destination: "pah",
				tokenIdIn: "hydration-asset::hydration::5",
				tokenIdOut: "native::pah",
			},
			beneficiary: dotToAssetHub.beneficiary,
		});

		await waitFor(() => expect(result.current.data).toBeDefined());
		expect(result.current).toEqual({
			isLoading: false,
			deliveryFee: { tokenId: "hydration-asset::hydration::5", plancks: 0n },
			sent: expect.any(BigInt),
			data: {
				success: true,
				quote: {
					received: 9991650007n,
					destinationFee: { tokenId: "native::pah", plancks: 8349993n },
				},
			},
		});
		const message =
			dotToAssetHub.origin.success &&
			dotToAssetHub.origin.value.forwarded_xcms[0]?.[1][0];
		expect(chain.queryDeliveryFees).toHaveBeenCalledWith(
			{
				type: "V5",
				value: {
					parents: 1,
					interior: { type: "X1", value: { type: "Parachain", value: 1000 } },
				},
			},
			message,
			{ at: "best" },
		);
		expect(chain.dryRunXcm).toHaveBeenCalledWith(HYDRATION_LOCATION, message, {
			at: "best",
		});
		expect(chain.calledChains).toEqual(
			expect.arrayContaining([
				["query_delivery_fees", "hydration"],
				["dry_run_xcm", "pah"],
			]),
		);
		expect(chain.calledChains).not.toContainEqual(["dry_run_xcm", "hydration"]);
	});

	describe("on a swap on Asset Hub of what Hydration sends", () => {
		const destinationSwapRoute: XcmDestinationSwapRoute = {
			kind: "xcm-destination-swap",
			origin: "hydration",
			destination: "pah",
			tokenIdIn: usdtToPink.tokenIdIn,
			tokenIdOut: usdtToPink.tokenIdOut,
			path: getAmmPath(
				"asset::pah::1984",
				usdtToPink.tokenIdOut,
				"native::pah",
			),
		};
		const destinationFee = {
			tokenId: "asset::pah::1984",
			plancks: usdtToPink.destinationFee.plancks,
		};

		it("quotes the output deposited with the fee Asset Hub takes in the input, without weighing the message again", async () => {
			givenDryRuns({
				origin: usdtToPink.originDryRun,
				estimate: usdtToPink.originDryRun,
				destination: usdtToPink.destinationDryRun,
				deliveryFees: usdtToPink.deliveryFees,
			});
			const { result } = renderQuote({
				route: destinationSwapRoute,
				destinationFee,
				beneficiary: usdtToPink.beneficiary,
			});

			await waitFor(() => expect(result.current.data).toBeDefined());
			expect(result.current).toEqual({
				isLoading: false,
				deliveryFee: { tokenId: "hydration-asset::hydration::5", plancks: 0n },
				sent: expect.any(BigInt),
				data: {
					success: true,
					quote: {
						received: usdtToPink.hops[1]?.amountOut,
						destinationFee,
					},
				},
			});
			expect(chain.calledChains).not.toContainEqual([
				"query_xcm_weight",
				"pah",
			]);
			expect(chain.queryWeightToAssetFee).not.toHaveBeenCalled();
		});
	});
});
