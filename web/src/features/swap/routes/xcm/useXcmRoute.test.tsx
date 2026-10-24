import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WalletAccount } from "../../../../common/kheopskit";
import { KNOWN_TOKENS_MAP } from "../../../../registry/tokens/tokens";
import { getAmmPath } from "../ammPath";
import type { XcmDestinationSwapRoute } from "../swapRoute";
import { getDestinationSwapFee } from "../xcmDestinationSwap/destinationSwapFee";
import {
	usdtToPink,
	type XcmDestinationSwapFixture,
} from "../xcmDestinationSwap/xcmDestinationSwap.fixtures";
import { useXcmRoute } from "./useXcmRoute";

const chain = vi.hoisted(() => ({
	fixture: undefined as unknown as XcmDestinationSwapFixture,
	dryRunCall: undefined as unknown as ReturnType<typeof vi.fn>,
	queryXcmWeight: undefined as unknown as ReturnType<typeof vi.fn>,
	canPriceFee: true,
	firstPoolInflow: 0n,
	balanceIn: 1n,
	isUnfunded: false,
}));

vi.mock("../../../../papi/getApi", () => ({
	getApi: async (chainId: string) => ({
		chainId,
		tx: {
			PolkadotXcm: {
				transfer_assets_using_type_and_then: (args: unknown) => ({
					decodedCall: { args },
				}),
			},
		},
		apis: {
			DryRunApi: {
				dry_run_call: chain.dryRunCall,
				dry_run_xcm: async () => chain.fixture.destinationDryRun,
			},
			XcmPaymentApi: {
				query_delivery_fees: async () => chain.fixture.deliveryFees,
				query_xcm_weight: chain.queryXcmWeight,
				query_weight_to_asset_fee: async (
					_weight: unknown,
					assetId: { value: { parents: number } },
				) =>
					chain.canPriceFee
						? {
								success: true,
								value:
									assetId.value.parents === 1
										? chain.fixture.destinationFee.nativePlancks
										: chain.fixture.destinationFee.plancks,
							}
						: { success: false, value: { type: "AssetNotFound" } },
			},
		},
	}),
}));

vi.mock("../../../../hooks/useBalance", () => ({
	useBalance: () => ({ data: chain.balanceIn, isLoading: false }),
}));

vi.mock("../../../../state/relay", () => ({
	useRelayChains: () => ({ assetHub: { id: "pah" } }),
}));

vi.mock("../../../../hooks/usePoolReservesByTokenIds", () => ({
	usePoolReservesByTokenIds: ({
		tokenId1,
		tokenId2,
	}: {
		tokenId1: string | undefined;
		tokenId2: string | undefined;
	}) => {
		const hop = chain.fixture.hops.find(
			({ tokenIdIn, tokenIdOut }) =>
				tokenIdIn === tokenId1 && tokenIdOut === tokenId2,
		);
		return {
			data: hop
				? [
						hop.reserveIn +
							(hop === chain.fixture.hops[0] ? chain.firstPoolInflow : 0n),
						hop.reserveOut,
					]
				: undefined,
			isLoading: false,
		};
	},
}));

vi.mock("../../useAssetConvertionLPFee", () => ({
	useAssetConvertionLPFee: () => ({
		data: chain.fixture.lpFee,
		isLoading: false,
	}),
}));

vi.mock("../../../../hooks/useAssetConvertPlancks", () => ({
	useAssetConvertPlancks: () => ({ plancksOut: undefined }),
}));

vi.mock("../../../../hooks/useToken", () => ({
	useToken: () => ({ data: null, isLoading: false }),
}));

vi.mock("../xcmDestinationSwap/useCanReceiveSwapLeftovers", () => ({
	useCanReceiveSwapLeftovers: () => ({ isLoading: false, canReceive: true }),
}));

const getToken = (tokenId: string) => {
	const token = KNOWN_TOKENS_MAP[tokenId];
	if (!token) throw new Error(`unknown token ${tokenId}`);
	return token;
};

const renderDestinationSwap = (
	fixture: XcmDestinationSwapFixture,
	totalIn = fixture.amount,
) => {
	chain.fixture = fixture;
	const route: XcmDestinationSwapRoute = {
		kind: "xcm-destination-swap",
		origin: "hydration",
		destination: "pah",
		tokenIdIn: fixture.tokenIdIn,
		tokenIdOut: fixture.tokenIdOut,
		path: getAmmPath(
			fixture.hops[0]?.tokenIdIn ?? "",
			fixture.tokenIdOut,
			"native::pah",
		),
	};
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0 } },
	});
	const wrapper: FC<PropsWithChildren> = ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(
		() =>
			useXcmRoute({
				route,
				account: {
					platform: "polkadot",
					address: fixture.beneficiary,
				} as WalletAccount,
				tokenIn: getToken(fixture.tokenIdIn),
				tokenOut: getToken(fixture.tokenIdOut),
				totalIn,
				swapPlancksIn: null,
				appCommission: null,
				slippage: fixture.slippage,
				edTokenIn: 10_000n,
			}),
		{ wrapper },
	);
};

beforeEach(() => {
	chain.canPriceFee = true;
	chain.firstPoolInflow = 0n;
	chain.balanceIn = 1n;
	chain.isUnfunded = false;
	chain.dryRunCall = vi.fn(async () =>
		chain.isUnfunded
			? { success: false, value: { type: "InsufficientBalance" } }
			: chain.fixture.originDryRun,
	);
	chain.queryXcmWeight = vi.fn(async () => ({
		success: true,
		value: chain.fixture.destinationWeight,
	}));
});

describe("useXcmRoute on a swap on Asset Hub of what Hydration sends", () => {
	it("builds the call Asset Hub executed, with the minimums of its quote", async () => {
		const { result } = renderDestinationSwap(usdtToPink);

		await waitFor(() =>
			expect(result.current.plan.submitGate).toEqual({ status: "open" }),
		);
		expect(result.current.plan.call?.decodedCall).toEqual({
			args: usdtToPink.args,
		});
		expect(result.current.details).toMatchObject({
			kind: "xcm-destination-swap",
			minReceived: usdtToPink.hops[1]?.minOut,
		});
		expect(result.current.swapPlancksOut).toBe(usdtToPink.hops[1]?.amountOut);
		expect(result.current.quote.data).toEqual({
			success: true,
			quote: {
				received: usdtToPink.hops[1]?.amountOut,
				destinationFee: {
					tokenId: "asset::pah::1984",
					plancks: usdtToPink.destinationFee.plancks,
				},
			},
		});
	});

	it("dry runs only the call and its amount-free estimate, and weighs the message once", async () => {
		const { result } = renderDestinationSwap(usdtToPink);

		await waitFor(() =>
			expect(result.current.plan.submitGate).toEqual({ status: "open" }),
		);
		console.log(
			chain.dryRunCall.mock.calls.map(
				([o, c]) =>
					JSON.stringify([o, c], (_, v) =>
						typeof v === "bigint" ? v.toString() : v,
					).slice(0, 120) +
					" " +
					JSON.stringify(c.args.assets, (_, v) =>
						typeof v === "bigint" ? v.toString() : v,
					).slice(-60),
			),
		);
		expect(chain.dryRunCall).toHaveBeenCalledTimes(2);
		expect(chain.queryXcmWeight).toHaveBeenCalledTimes(1);
	});

	it("follows the arrival of every token the swap can return", async () => {
		const { result } = renderDestinationSwap(usdtToPink);

		await waitFor(() =>
			expect(result.current.plan.submitGate).toEqual({ status: "open" }),
		);
		expect(result.current.plan.followUpData).toMatchObject({
			target: {
				tokenId: usdtToPink.tokenIdOut,
				beneficiary: usdtToPink.beneficiary,
			},
			returnTokenIds: ["asset::pah::1984", "native::pah", "asset::pah::23"],
		});
	});

	it("refuses an amount the Asset Hub fee would eat", async () => {
		const { result } = renderDestinationSwap(
			usdtToPink,
			usdtToPink.destinationFee.plancks,
		);

		await waitFor(() =>
			expect(result.current.outputErrorMessage).toBe(
				"Amount too low to cover the Polkadot Asset Hub fee",
			),
		);
		expect(result.current.plan.call).toBeFalsy();
	});

	it("refuses to quote when Asset Hub cannot price its fee", async () => {
		chain.canPriceFee = false;
		const { result } = renderDestinationSwap(usdtToPink);

		await waitFor(() =>
			expect(result.current.outputErrorMessage).toBe(
				"Could not estimate the Polkadot Asset Hub fee",
			),
		);
		expect(result.current.plan.submitGate.status).toBe("closed");
	});

	it("reprices the fee in the input when the first pool moves, without asking Asset Hub again", async () => {
		const { result, rerender } = renderDestinationSwap(usdtToPink);
		await waitFor(() =>
			expect(result.current.plan.submitGate).toEqual({ status: "open" }),
		);
		const feeQueries = chain.queryXcmWeight.mock.calls.length;

		const [firstPool] = usdtToPink.hops;
		if (!firstPool) throw new Error("expected a first hop");
		chain.firstPoolInflow = firstPool.reserveIn;
		rerender();

		const movedFee = getDestinationSwapFee(
			{ ...firstPool, reserveIn: firstPool.reserveIn * 2n },
			usdtToPink.lpFee,
			usdtToPink.destinationFee.nativePlancks,
		);
		expect(movedFee?.plancks).toBeGreaterThan(
			usdtToPink.destinationFee.plancks,
		);
		await waitFor(() =>
			expect(result.current.quote.data).toMatchObject({
				success: true,
				quote: { destinationFee: { plancks: movedFee?.plancks } },
			}),
		);
		expect(chain.queryXcmWeight).toHaveBeenCalledTimes(feeQueries);
	});

	it("quotes again once an account that could not send funds its input", async () => {
		chain.isUnfunded = true;
		chain.balanceIn = 0n;
		const { result, rerender } = renderDestinationSwap(usdtToPink);
		await waitFor(() =>
			expect(result.current.outputErrorMessage).toBe("InsufficientBalance"),
		);
		const unfundedEstimates = chain.dryRunCall.mock.calls.length;
		rerender();
		expect(chain.dryRunCall).toHaveBeenCalledTimes(unfundedEstimates);

		chain.isUnfunded = false;
		chain.balanceIn = usdtToPink.amount;
		rerender();

		await waitFor(() =>
			expect(result.current.plan.submitGate).toEqual({ status: "open" }),
		);
	});
});
