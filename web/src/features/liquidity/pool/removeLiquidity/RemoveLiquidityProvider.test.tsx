import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import {
	RemoveLiquidityProvider,
	useRemoveLiquidity,
} from "./RemoveLiquidityProvider";

const page = vi.hoisted(() => ({
	position: {
		shares: 1_000n,
		reserves: [4_000n, 2_000n] as [bigint, bigint],
	},
}));

const removeLiquidity = vi.hoisted(() =>
	vi.fn((args: { lp_token_burn: bigint }) => args),
);

vi.mock("../LiquidityPoolPageProvider", () => ({
	useLiquidityPoolPage: () => ({
		assetHub: { id: "pasah" },
		nativeToken: { id: "native::pasah" },
		assetToken: { id: "asset::pasah::1337" },
		position: page.position,
		lpSlippage: 0.01,
		resolvedSubstrateAddress: "5Alice",
	}),
}));

vi.mock("../../../../papi/getApi", () => ({
	getApi: async () => ({
		tx: { AssetConversion: { remove_liquidity: removeLiquidity } },
	}),
}));

const wrapper: FC<PropsWithChildren> = ({ children }) => (
	<QueryClientProvider client={new QueryClient()}>
		<RemoveLiquidityProvider>{children}</RemoveLiquidityProvider>
	</QueryClientProvider>
);

describe("RemoveLiquidityProvider", () => {
	it("prepares nothing after a partial removal is signed and the position shrinks", async () => {
		const { result, rerender } = renderHook(useRemoveLiquidity, { wrapper });

		act(() => result.current.setRatio(0.25));
		await waitFor(() =>
			expect(result.current.call).toMatchObject({ lp_token_burn: 250n }),
		);

		act(() => result.current.onReset());
		page.position = { shares: 750n, reserves: [3_000n, 1_500n] };
		removeLiquidity.mockClear();
		rerender();

		await waitFor(() => expect(result.current.call).toBeNull());
		expect(result.current.ratio).toBe(0);
		expect(result.current.nativeReceived).toBe(0n);
		expect(result.current.assetReceived).toBe(0n);
		expect(removeLiquidity).not.toHaveBeenCalled();
	});
});
