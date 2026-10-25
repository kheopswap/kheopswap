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
	useAllTokens: () => ({
		data: {
			"asset::pasah::50001010": { id: "asset::pasah::50001010", decimals: 6 },
		},
		isLoading: false,
	}),
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
	it("clears the initial liquidity, its amounts and its call once the creation is signed", () => {
		const { result } = renderHook(useCreatePool, {
			wrapper: ({ children }) => (
				<CreatePoolProvider tokenId="asset::pasah::50001010">
					{children}
				</CreatePoolProvider>
			),
		});

		act(() => {
			result.current.onAmountChange(0, "1");
			result.current.onAmountChange(1, "2");
		});
		expect(result.current.call).toEqual({
			liquidityToAdd: [10_000_000_000n, 2_000_000n],
		});

		act(() => result.current.onReset());

		expect(result.current.amounts).toEqual(["", ""]);
		expect(result.current.liquidityToAdd).toBeNull();
		expect(result.current.call).toBeNull();
	});
});
