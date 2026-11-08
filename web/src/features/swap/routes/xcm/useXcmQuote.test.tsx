import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { isEqual } from "lodash-es";
import type { FC, PropsWithChildren } from "react";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";
import { useDryRun } from "../../../../hooks/useDryRun";
import type { TokenAmount } from "../../../../registry/tokens/types";
import type { AnyTransaction } from "../../../../types/transactions";
import { getAmmPath } from "../ammPath";
import type { XcmDestinationSwapRoute, XcmRoute } from "../swapRoute";
import { usdtToPink } from "../xcmDestinationSwap/xcmDestinationSwap.fixtures";
import { usdcToUsdt } from "../xcmSwap/xcmSwap.fixtures";
import type { XcmDryRunBalances } from "./useXcmDryRunBalances";
import { useXcmQuote, type XcmQuoteState } from "./useXcmQuote";
import { dotToAssetHub } from "./xcmFromHydration.fixtures";
import {
	dotPeopleToHydration,
	dotPeopleToHydrationTrappedOnHub,
	type HubTransferFixture,
} from "./xcmHubTransfer.fixtures";
import type {
	DestinationDryRun,
	HubDryRun,
	OriginDryRun,
	XcmQuoteFailure,
} from "./xcmQuote";
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
	connectionDelayMs: 0,
}));

vi.mock("../../../../papi/getApi", () => ({
	getApi: async (chainId: string) => {
		if (chain.connectionDelayMs)
			await new Promise((resolve) =>
				setTimeout(resolve, chain.connectionDelayMs),
			);
		return {
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
		};
	},
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

const fundedOrigin: XcmDryRunBalances = {
	isLoading: false,
	origin: { "native::pah": { balance: 20_000_000_000n, frozen: 0n } },
};

const renderQuote = ({
	route = transferRoute,
	destinationFee,
	beneficiary = dotSuccess.beneficiary,
	balances = fundedOrigin,
	extra,
}: {
	route?: XcmRoute;
	destinationFee?: TokenAmount;
	beneficiary?: string;
	balances?: XcmDryRunBalances;
	extra?: () => unknown;
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
	chain.connectionDelayMs = 0;
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

type RequestOptions = { at: string; signal: AbortSignal };

const stallUntilAborted = (...args: unknown[]) => {
	const { signal } = args.at(-1) as RequestOptions;
	return new Promise<never>((_, reject) =>
		signal.addEventListener("abort", () =>
			reject(new DOMException("Abort Error", "AbortError")),
		),
	);
};

const runOnFakeTimers = () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});
	afterEach(() => {
		vi.useRealTimers();
	});
};

const expectToGiveUpAfter30Seconds = async (
	result: { current: XcmQuoteState },
	failure: XcmQuoteFailure,
) => {
	await vi.advanceTimersByTimeAsync(29_000);
	expect(result.current).toMatchObject({ isLoading: true, data: undefined });

	await vi.advanceTimersByTimeAsync(1_000);
	await waitFor(() =>
		expect(result.current.data).toEqual({ success: false, failure }),
	);
	expect(result.current.isLoading).toBe(false);
};

const HYDRATION_LOCATION = {
	type: "V5",
	value: {
		parents: 1,
		interior: { type: "X1", value: { type: "Parachain", value: 2034 } },
	},
};

describe("useXcmQuote", () => {
	it("simulates the origin again when a balance it spends changes, and loads meanwhile", async () => {
		givenDryRuns({
			origin: dotSuccess.origin,
			destination: dotSuccess.destination,
		});
		const { result, rerender } = renderQuote({
			balances: { isLoading: true, origin: undefined },
		});
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(result.current.isLoading).toBe(true);
		expect(chain.dryRunCall).not.toHaveBeenCalled();

		rerender({ balances: fundedOrigin });
		await waitFor(() => expect(result.current.data).toBeDefined());
		const originRuns = chain.dryRunCall.mock.calls.length;
		expect(originRuns).toBeGreaterThan(0);

		rerender({ balances: fundedOrigin });
		expect(chain.dryRunCall).toHaveBeenCalledTimes(originRuns);

		rerender({
			balances: {
				isLoading: false,
				origin: { "native::pah": { balance: 5n, frozen: 0n } },
			},
		});
		await waitFor(() =>
			expect(chain.dryRunCall.mock.calls.length).toBeGreaterThan(originRuns),
		);
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
			{ at: "best", signal: expect.any(AbortSignal) },
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
			{ at: "best", signal: expect.any(AbortSignal) },
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
			failure: {
				kind: "origin-failed",
				reason: "Insufficient balance to cover the transfer and its fees",
			},
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

	it("shares the Asset Hub dry run with the transaction layer", async () => {
		givenDryRuns({
			origin: dotSuccess.origin,
			destination: dotSuccess.destination,
		});
		const { result } = renderQuote({
			extra: () =>
				useDryRun({
					chainId: "pah",
					from: dotSuccess.beneficiary,
					call,
					balances: fundedOrigin.origin,
				}),
		});

		await waitFor(() => expect(result.current.data?.success).toBe(true));
		const realCallDryRuns = chain.dryRunCall.mock.calls.filter(
			([, decodedCall]) => decodedCall === call.decodedCall,
		);
		expect(realCallDryRuns).toHaveLength(1);
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
			{ at: "best", signal: expect.any(AbortSignal) },
		);
		expect(chain.dryRunXcm).toHaveBeenCalledWith(HYDRATION_LOCATION, message, {
			at: "best",
			signal: expect.any(AbortSignal),
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
	it("stays loading while it revalidates a cached quote", async () => {
		givenDryRuns({
			origin: dotSuccess.origin,
			destination: dotSuccess.destination,
		});
		const queryClient = new QueryClient();
		const wrapper: FC<PropsWithChildren> = ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
		const quote = () =>
			useXcmQuote({
				route: transferRoute,
				beneficiary: dotSuccess.beneficiary,
				call,
				fakeCall,
				balances: fundedOrigin,
			});
		const first = renderHook(quote, { wrapper });
		await waitFor(() => expect(first.result.current.data?.success).toBe(true));
		first.unmount();

		let resolveDestination: (value: unknown) => void = () => {};
		chain.dryRunXcm.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveDestination = resolve;
				}),
		);
		const second = renderHook(quote, { wrapper });
		await waitFor(() => expect(chain.dryRunXcm).toHaveBeenCalledTimes(2));
		expect(second.result.current.isLoading).toBe(true);

		resolveDestination(dotTrapped.destination);
		await waitFor(() => expect(second.result.current.isLoading).toBe(false));
		expect(second.result.current.data?.success).toBe(false);
	});
});

describe("useXcmQuote on a stalled chain", () => {
	runOnFakeTimers();

	beforeEach(() => {
		givenDryRuns({
			origin: dotSuccess.origin,
			destination: dotSuccess.destination,
		});
	});

	it.each([
		[
			"Asset Hub dry run",
			() => chain.dryRunCall.mockImplementation(stallUntilAborted),
			{ kind: "origin-unavailable" },
		],
		[
			"delivery fee",
			() => chain.queryDeliveryFees.mockImplementation(stallUntilAborted),
			{ kind: "delivery-fee-unavailable" },
		],
		[
			"Hydration dry run",
			() => chain.dryRunXcm.mockImplementation(stallUntilAborted),
			{ kind: "destination-unavailable" },
		],
	] as const)(
		"gives up on the %s after 30 seconds",
		async (_, stall, failure) => {
			stall();
			const { result } = renderQuote();

			await expectToGiveUpAfter30Seconds(result, failure);
		},
	);

	it("leaves the time spent connecting out of the 30 seconds", async () => {
		chain.connectionDelayMs = 31_000;
		const { result } = renderQuote();

		await vi.advanceTimersByTimeAsync(3 * 31_000);
		await waitFor(() => expect(result.current.data?.success).toBe(true));
		const signalsSent = [
			chain.dryRunCall,
			chain.queryDeliveryFees,
			chain.dryRunXcm,
		].flatMap((query) =>
			query.mock.calls.map((call) => (call.at(-1) as RequestOptions).signal),
		);
		expect(signalsSent.map((signal) => signal.aborted)).not.toContain(true);
	});

	it("skips the chain query when the quote is dropped while connecting", async () => {
		chain.connectionDelayMs = 10_000;
		const { unmount } = renderQuote();

		await vi.advanceTimersByTimeAsync(5_000);
		unmount();
		await vi.advanceTimersByTimeAsync(10_000);

		expect(chain.dryRunCall).not.toHaveBeenCalled();
	});
});

describe("useXcmQuote through Asset Hub", () => {
	const peopleToHydration: XcmRoute = {
		kind: "xcm-transfer",
		origin: "ppeople",
		destination: "hydration",
		tokenIdIn: "native::ppeople",
		tokenIdOut: "hydration-asset::hydration::5",
		viaHub: {
			toHub: { origin: "ppeople", destination: "pah" },
			fromHub: { origin: "pah", destination: "hydration" },
		},
	};
	const siblingLocation = (paraId: number) => ({
		type: "V5",
		value: {
			parents: 1,
			interior: { type: "X1", value: { type: "Parachain", value: paraId } },
		},
	});
	const firstMessage = (dryRun: OriginDryRun | HubDryRun) =>
		dryRun.success ? dryRun.value.forwarded_xcms[0]?.[1][0] : undefined;

	const givenHubTransfer = (fixture: HubTransferFixture) => {
		givenDryRuns({
			origin: fixture.originDryRun,
			estimate: fixture.originDryRun,
			deliveryFees: fixture.deliveryFees,
		});
		chain.dryRunXcm.mockImplementation(async (sender) =>
			isEqual(sender, siblingLocation(1004))
				? fixture.hubDryRun
				: fixture.destinationDryRun,
		);
	};

	it("quotes People DOT received on Hydration from the dry runs of all three chains", async () => {
		givenHubTransfer(dotPeopleToHydration);
		const { result } = renderQuote({
			route: peopleToHydration,
			beneficiary: dotPeopleToHydration.beneficiary,
		});

		await waitFor(() => expect(result.current.data).toBeDefined());
		expect(result.current).toEqual({
			isLoading: false,
			deliveryFee: { tokenId: "native::ppeople", plancks: 305900000n },
			data: {
				success: true,
				quote: {
					received: 9678556145n,
					destinationFee: {
						tokenId: "hydration-asset::hydration::5",
						plancks: 321443855n,
					},
				},
			},
		});
		const toHub = firstMessage(dotPeopleToHydration.originDryRun);
		expect(chain.queryDeliveryFees).toHaveBeenCalledWith(
			siblingLocation(1000),
			toHub,
			{ type: "V5", value: { parents: 1, interior: { type: "Here" } } },
			{ at: "best", signal: expect.any(AbortSignal) },
		);
		expect(chain.dryRunXcm).toHaveBeenCalledWith(siblingLocation(1004), toHub, {
			at: "best",
			signal: expect.any(AbortSignal),
		});
		expect(chain.dryRunXcm).toHaveBeenCalledWith(
			siblingLocation(1000),
			firstMessage(dotPeopleToHydration.hubDryRun),
			{ at: "best", signal: expect.any(AbortSignal) },
		);
		expect(chain.calledChains).toEqual(
			expect.arrayContaining([
				["query_delivery_fees", "ppeople"],
				["dry_run_xcm", "pah"],
				["dry_run_xcm", "hydration"],
			]),
		);
	});

	it("refuses an amount Asset Hub would trap, without dry running Hydration", async () => {
		givenHubTransfer(dotPeopleToHydrationTrappedOnHub);
		const { result } = renderQuote({
			route: peopleToHydration,
			beneficiary: dotPeopleToHydrationTrappedOnHub.beneficiary,
		});

		await waitFor(() => expect(result.current.data).toBeDefined());
		expect(result.current.data).toEqual({
			success: false,
			failure: {
				kind: "hub-rejected",
				hub: "pah",
				reason: "TooExpensive",
				assetsTrapped: true,
			},
		});
		expect(chain.calledChains).not.toContainEqual(["dry_run_xcm", "hydration"]);
	});

	describe("when Asset Hub stalls", () => {
		runOnFakeTimers();

		it("gives up on its dry run after 30 seconds", async () => {
			givenHubTransfer(dotPeopleToHydration);
			chain.dryRunXcm.mockImplementation(stallUntilAborted);
			const { result } = renderQuote({
				route: peopleToHydration,
				beneficiary: dotPeopleToHydration.beneficiary,
			});

			await expectToGiveUpAfter30Seconds(result, {
				kind: "hub-unavailable",
				hub: "pah",
			});
		});
	});

	it("reports Asset Hub as unavailable when its dry run errors", async () => {
		givenHubTransfer(dotPeopleToHydration);
		chain.dryRunXcm.mockRejectedValue(new Error("rpc down"));
		const { result } = renderQuote({
			route: peopleToHydration,
			beneficiary: dotPeopleToHydration.beneficiary,
		});

		await waitFor(() => expect(result.current.data).toBeDefined());
		expect(result.current.data).toEqual({
			success: false,
			failure: { kind: "hub-unavailable", hub: "pah" },
		});
		expect(chain.calledChains).not.toContainEqual(["dry_run_xcm", "hydration"]);
	});
});
