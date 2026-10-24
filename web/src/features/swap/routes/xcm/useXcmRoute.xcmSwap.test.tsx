import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WalletAccount } from "../../../../common/kheopskit";
import { KNOWN_TOKENS_MAP } from "../../../../registry/tokens/tokens";
import type { Token } from "../../../../registry/tokens/types";
import { getAmmPath } from "../ammPath";
import type { XcmSwapRoute } from "../swapRoute";
import { dotToUsdt } from "../xcmSwap/xcmSwap.fixtures";
import { useXcmRoute } from "./useXcmRoute";

const DOT = "native::pah";
const USDT = "asset::pah::1984";
const HYDRATION_USDT = "hydration-asset::hydration::10";
const HYDRATION_DOT = "hydration-asset::hydration::5";
const DELIVERY_FEE = 305_450_000n;

const chain = vi.hoisted(() => ({
	dryRunCall: undefined as unknown as ReturnType<typeof vi.fn>,
	balance: 0n,
}));

vi.mock("../../../../papi/getApi", async () => {
	const { dotToUsdt } = await import("../xcmSwap/xcmSwap.fixtures");
	return {
		getApi: async (chainId: string) => ({
			chainId,
			tx: {
				PolkadotXcm: {
					execute: (args: unknown) => ({ decodedCall: { execute: args } }),
				},
			},
			apis: {
				DryRunApi: {
					dry_run_call: chain.dryRunCall,
					dry_run_xcm: async () => dotToUsdt.destination,
				},
				XcmPaymentApi: {
					query_delivery_fees: async () => dotToUsdt.deliveryFee,
					query_xcm_weight: async () => ({
						success: true,
						value: { ref_time: 1n, proof_size: 1n },
					}),
				},
			},
		}),
	};
});

vi.mock("../../withAppCommission", () => ({
	withAppCommission: async (
		_chainId: string,
		call: { decodedCall: unknown },
		_tokenIdIn: string,
		appCommission: bigint | null | undefined,
	) =>
		appCommission
			? { decodedCall: { batch: [call.decodedCall], appCommission } }
			: call,
}));

vi.mock("../../../../hooks/useBalances", () => ({
	useBalances: ({
		balanceDefs = [],
	}: {
		balanceDefs?: { address: string; tokenId: string }[];
	}) => ({
		isLoading: false,
		data: balanceDefs.map((def) => ({
			...def,
			balance: chain.balance,
			frozen: 0n,
			isLoading: false,
		})),
	}),
}));

vi.mock("../../../../state/relay", () => ({
	useRelayChains: () => ({ assetHub: { id: "pah" } }),
}));

vi.mock("../../../../hooks/usePoolReservesByTokenIds", async () => {
	const { dotToUsdt } = await import("../xcmSwap/xcmSwap.fixtures");
	return {
		usePoolReservesByTokenIds: ({
			tokenId1,
			tokenId2,
		}: {
			tokenId1: string | undefined;
			tokenId2: string | undefined;
		}) => ({
			data:
				tokenId1 === "native::pah" && tokenId2 === "asset::pah::1984"
					? dotToUsdt.reserves[0]
					: undefined,
			isLoading: false,
		}),
	};
});

vi.mock("../../useAssetConvertionLPFee", () => ({
	useAssetConvertionLPFee: () => ({ data: 3, isLoading: false }),
}));

vi.mock("../../../../hooks/useToken", async () => {
	const { KNOWN_TOKENS_MAP } = await import(
		"../../../../registry/tokens/tokens"
	);
	return {
		useToken: ({ tokenId }: { tokenId: string | null | undefined }) => ({
			data: tokenId ? KNOWN_TOKENS_MAP[tokenId] : null,
			isLoading: false,
		}),
	};
});

vi.mock("../../../../hooks/useExistentialDeposit", () => ({
	useExistentialDeposit: () => ({ data: undefined, isLoading: false }),
}));

const getToken = (tokenId: string): Token => {
	const token = KNOWN_TOKENS_MAP[tokenId];
	if (!token) throw new Error(`unknown token ${tokenId}`);
	return token;
};

const ROUTE: XcmSwapRoute = {
	kind: "xcm-swap",
	origin: "pah",
	destination: "hydration",
	tokenIdIn: DOT,
	tokenIdOut: HYDRATION_USDT,
	path: getAmmPath(DOT, USDT, DOT),
};

const ACCOUNT = {
	platform: "polkadot",
	address: dotToUsdt.sender,
} as WalletAccount;

const FAILED_TO_WITHDRAW = {
	success: true,
	value: {
		execution_result: {
			success: false,
			value: {
				post_info: { actual_weight: undefined, pays_fee: { type: "Yes" } },
				error: {
					type: "Module",
					value: {
						type: "PolkadotXcm",
						value: {
							type: "LocalExecutionIncompleteWithError",
							value: { index: 0, error: { type: "FailedToTransactAsset" } },
						},
					},
				},
			},
		},
		emitted_events: [],
		local_xcm: undefined,
		forwarded_xcms: [],
	},
};

type Props = {
	tokenOut?: Token;
	appCommission?: bigint;
	hasInsufficientBalance?: boolean;
};

const renderXcmSwap = ({
	tokenOut = getToken(HYDRATION_USDT),
	appCommission = dotToUsdt.appFee,
	hasInsufficientBalance = false,
}: Props = {}) => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0 } },
	});
	const wrapper: FC<PropsWithChildren> = ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(
		() =>
			useXcmRoute({
				route: ROUTE,
				account: ACCOUNT,
				tokenIn: getToken(DOT),
				tokenOut,
				totalIn: dotToUsdt.swapAmount + appCommission,
				swapPlancksIn: dotToUsdt.swapAmount,
				appCommission,
				slippage: 0.005,
				edTokenIn: 10_000_000_000n,
				hasInsufficientBalance,
				balanceOut: 0n,
			}),
		{ wrapper },
	);
};

beforeEach(() => {
	chain.balance = 1_000_000_000_000n;
	chain.dryRunCall = vi.fn(async () => dotToUsdt.origin);
});

describe("useXcmRoute on a swap on Asset Hub sent to Hydration", () => {
	it("quotes what Hydration deposits for the account, with the minimum net of its fee", async () => {
		const { result } = renderXcmSwap();

		await waitFor(() =>
			expect(result.current.plan.submitGate).toEqual({ status: "open" }),
		);
		expect(result.current.swapPlancksOut).toBe(11_816_798n);
		expect(result.current.details).toMatchObject({
			kind: "xcm-swap",
			received: { plancks: 11_816_798n, isEstimate: false },
		});
		const details = result.current.details;
		if (details?.kind !== "xcm-swap" || !details.pathQuote)
			throw new Error("expected a quoted swap");
		const destinationFee = details.pathQuote.amountOut - 11_816_798n;
		expect(details.minReceived).toBe(details.pathQuote.minOut - destinationFee);
	});

	it("adds the delivery fee to what the input token spends, keeping the account alive", async () => {
		const { result } = renderXcmSwap();

		await waitFor(() =>
			expect(result.current.plan.submitGate).toEqual({ status: "open" }),
		);
		expect(result.current.plan.callSpendings).toEqual({
			[DOT]: {
				plancks: dotToUsdt.swapAmount + dotToUsdt.appFee + DELIVERY_FEE,
				allowDeath: false,
			},
		});
	});

	it("sends the swap alone when there is no service fee", async () => {
		const { result } = renderXcmSwap({ appCommission: 0n });

		await waitFor(() =>
			expect(result.current.plan.submitGate).toEqual({ status: "open" }),
		);
		expect(result.current.plan.call?.decodedCall).toMatchObject({
			execute: expect.anything(),
		});
	});

	it("gives no minimum when the Asset Hub token and the Hydration token count decimals differently", async () => {
		const { result } = renderXcmSwap({
			tokenOut: { ...getToken(HYDRATION_USDT), decimals: 12 },
		});

		await waitFor(() =>
			expect(result.current.plan.submitGate).toEqual({ status: "open" }),
		);
		expect(result.current.details).toMatchObject({ minReceived: undefined });
	});

	it("builds nothing while the output token still belongs to the previous pair", async () => {
		const { result } = renderXcmSwap({ tokenOut: getToken(HYDRATION_DOT) });

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(result.current.plan.call).toBeFalsy();
		expect(chain.dryRunCall).not.toHaveBeenCalled();
	});

	it("estimates the output from the pools when the amount exceeds the balance", async () => {
		chain.dryRunCall.mockResolvedValue(FAILED_TO_WITHDRAW);
		const { result } = renderXcmSwap({ hasInsufficientBalance: true });

		await waitFor(() =>
			expect(result.current.plan.submitGate.status).toBe("closed"),
		);
		const details = result.current.details;
		if (details?.kind !== "xcm-swap") throw new Error("expected a swap");
		expect(details.received).toEqual({
			plancks: details.pathQuote?.amountOut,
			isEstimate: true,
		});
		expect(result.current.swapPlancksOut).toBe(details.pathQuote?.amountOut);
		expect(result.current.outputErrorMessage).toBeNull();
	});
});
