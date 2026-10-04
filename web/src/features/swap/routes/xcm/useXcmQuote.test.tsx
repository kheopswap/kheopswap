import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDryRun } from "../../../../hooks/useDryRun";
import type { AnyTransaction } from "../../../../types/transactions";
import type { XcmRoute } from "../swapRoute";
import { getAmmPath } from "../xcmSwap/ammPath";
import { usdcToUsdt } from "../xcmSwap/xcmSwap.fixtures";
import { useXcmQuote } from "./useXcmQuote";
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
	dryRunXcm: undefined as unknown as ReturnType<typeof vi.fn>,
	queryDeliveryFees: undefined as unknown as ReturnType<typeof vi.fn>,
}));

vi.mock("../../../../papi/getApi", () => ({
	getApi: async (chainId: string) => ({
		chainId,
		apis: {
			DryRunApi: {
				dry_run_call: chain.dryRunCall,
				dry_run_xcm: chain.dryRunXcm,
			},
			XcmPaymentApi: { query_delivery_fees: chain.queryDeliveryFees },
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

const renderQuote = ({
	route = transferRoute,
	beneficiary = dotSuccess.beneficiary,
	extra,
}: {
	route?: XcmRoute;
	beneficiary?: string;
	extra?: () => unknown;
} = {}) => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0 } },
	});
	const wrapper: FC<PropsWithChildren> = ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(
		() => {
			extra?.();
			return useXcmQuote({ route, beneficiary, call, fakeCall });
		},
		{ wrapper },
	);
};

beforeEach(() => {
	chain.dryRunCall = vi.fn(async (_origin, decodedCall) =>
		chain.originDryRuns.get(decodedCall),
	);
	chain.dryRunXcm = vi.fn(async () => {
		if (chain.destinationDryRun instanceof Error) throw chain.destinationDryRun;
		return chain.destinationDryRun;
	});
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
				quote: { received: 9995190152n, destinationFee: 4809848n },
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
			data: {
				success: true,
				quote: { received: 98764625n, destinationFee: 574n },
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
				useDryRun({ chainId: "pah", from: dotSuccess.beneficiary, call }),
		});

		await waitFor(() => expect(result.current.data?.success).toBe(true));
		const realCallDryRuns = chain.dryRunCall.mock.calls.filter(
			([, decodedCall]) => decodedCall === call.decodedCall,
		);
		expect(realCallDryRuns).toHaveLength(1);
	});
});
