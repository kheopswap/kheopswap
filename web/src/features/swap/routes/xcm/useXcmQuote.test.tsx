import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDryRun } from "../../../../hooks/useDryRun";
import type { AnyTransaction } from "../../../../types/transactions";
import type { XcmTransferRoute } from "../swapRoute";
import { useXcmTransferQuote } from "./useXcmQuote";
import type { DestinationDryRun, OriginDryRun } from "./xcmQuote";
import {
	dotOriginFailed,
	dotSuccess,
	dotTrapped,
} from "./xcmTransfer.fixtures";

const chain = vi.hoisted(() => ({
	originDryRuns: new Map<unknown, unknown>(),
	destinationDryRun: undefined as unknown,
	dryRunCall: undefined as unknown as ReturnType<typeof vi.fn>,
	dryRunXcm: undefined as unknown as ReturnType<typeof vi.fn>,
}));

vi.mock("../../../../papi/getApi", () => ({
	getApi: async (chainId: string) => ({
		chainId,
		apis: {
			DryRunApi: {
				dry_run_call: chain.dryRunCall,
				dry_run_xcm: chain.dryRunXcm,
			},
		},
	}),
}));

const route: XcmTransferRoute = {
	kind: "xcm-transfer",
	origin: "pah",
	destination: "hydration",
	tokenIdIn: "native::pah",
	tokenIdOut: "hydration-asset::hydration::5",
	destinationAssetId: 5,
};

const call = { decodedCall: { name: "transfer" } } as unknown as AnyTransaction;
const fakeCall = {
	decodedCall: { name: "fake transfer" },
} as unknown as AnyTransaction;

const givenDryRuns = ({
	origin,
	estimate = dotSuccess.origin,
	destination,
}: {
	origin: OriginDryRun;
	estimate?: OriginDryRun;
	destination?: DestinationDryRun | Error;
}) => {
	chain.originDryRuns = new Map<unknown, unknown>([
		[call.decodedCall, origin],
		[fakeCall.decodedCall, estimate],
	]);
	chain.destinationDryRun = destination;
};

const renderQuote = (extra?: () => unknown) => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0 } },
	});
	const wrapper: FC<PropsWithChildren> = ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(
		() => {
			extra?.();
			return useXcmTransferQuote({
				route,
				beneficiary: dotSuccess.beneficiary,
				call,
				fakeCall,
				plancks: dotSuccess.amount,
			});
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
});

describe("useXcmTransferQuote", () => {
	it("quotes the amount received on Hydration from both dry runs", async () => {
		givenDryRuns({
			origin: dotSuccess.origin,
			destination: dotSuccess.destination,
		});
		const { result } = renderQuote();

		await waitFor(() => expect(result.current.data).toBeDefined());
		expect(result.current).toEqual({
			isLoading: false,
			deliveryFee: 304850000n,
			data: {
				success: true,
				quote: {
					received: 9995190152n,
					deliveryFee: 304850000n,
					destinationFee: 4809848n,
				},
			},
		});
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

	it("does not dry run Hydration when Asset Hub rejects the call, and still estimates the delivery fee", async () => {
		givenDryRuns({ origin: dotOriginFailed.origin });
		const { result } = renderQuote();

		await waitFor(() => expect(result.current.data).toBeDefined());
		await waitFor(() => expect(result.current.deliveryFee).toBe(304850000n));
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
			deliveryFee: 304850000n,
			data: { success: false, failure: { kind: "destination-unavailable" } },
		});
	});

	it("shares the Asset Hub dry run with the transaction layer", async () => {
		givenDryRuns({
			origin: dotSuccess.origin,
			destination: dotSuccess.destination,
		});
		const { result } = renderQuote(() =>
			useDryRun({ chainId: "pah", from: dotSuccess.beneficiary, call }),
		);

		await waitFor(() => expect(result.current.data?.success).toBe(true));
		const realCallDryRuns = chain.dryRunCall.mock.calls.filter(
			([, decodedCall]) => decodedCall === call.decodedCall,
		);
		expect(realCallDryRuns).toHaveLength(1);
	});
});
