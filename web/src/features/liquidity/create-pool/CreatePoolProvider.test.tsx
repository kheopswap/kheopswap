import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreatePoolProvider, useCreatePool } from "./CreatePoolProvider";

vi.mock("./useCreatePoolExtrinsic", () => ({
	useCreatePoolExtrinsic: ({
		liquidityToAdd,
	}: {
		liquidityToAdd: [bigint, bigint] | null;
	}) => ({ data: liquidityToAdd ? { liquidityToAdd } : null }),
}));
vi.mock("../../../state/relay", () => ({
	useRelayChains: () => ({ assetHub: { id: "pasah" } }),
}));
vi.mock("../../../hooks/useSetting", () => ({
	useSetting: () => [null, () => {}],
}));
vi.mock("../../../hooks/useWalletAccount", () => ({
	useWalletAccount: () => null,
}));
vi.mock("../../../hooks/useAllTokens", () => ({
	useAllTokens: () => ({ data: {}, isLoading: false }),
}));
vi.mock("../../../hooks/usePoolsByChainId", () => ({
	usePoolsByChainId: () => ({ data: [] }),
}));
vi.mock("../../../hooks/useNativeToken", () => ({
	useNativeToken: () => ({ id: "native::pasah", decimals: 10 }),
}));
vi.mock("../../../hooks/useExistentialDeposit", () => ({
	useExistentialDeposit: () => ({ data: 1n }),
}));
vi.mock("../../../hooks/useResolvedSubstrateAddress", () => ({
	useResolvedSubstrateAddress: () => ({ resolvedAddress: undefined }),
}));
vi.mock("../../../hooks/useBalance", () => ({
	useBalance: () => ({ data: 0n, isLoading: false }),
}));

describe("CreatePoolProvider", () => {
	it("clears the initial liquidity and its call once the creation is signed", () => {
		const { result } = renderHook(useCreatePool, {
			wrapper: ({ children }) => (
				<CreatePoolProvider tokenId="asset::pasah::50001010">
					{children}
				</CreatePoolProvider>
			),
		});

		act(() => result.current.setLiquidityToAdd([10n, 20n]));
		expect(result.current.call).toEqual({ liquidityToAdd: [10n, 20n] });

		act(() => result.current.onReset());

		expect(result.current.liquidityToAdd).toBeNull();
		expect(result.current.call).toBeNull();
	});
});
