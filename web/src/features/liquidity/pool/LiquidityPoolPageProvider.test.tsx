import { act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	LiquidityPoolPageProvider,
	useLiquidityPoolPage,
} from "./LiquidityPoolPageProvider";

vi.mock("../../../state/relay", () => ({
	useRelayChains: () => ({ assetHub: { id: "pasah" } }),
}));
vi.mock("../../../hooks/useSetting", () => ({
	useSetting: (key: string) => [
		key === "defaultAccountId" ? "account-from-another-page" : null,
		() => {},
	],
}));
vi.mock("../../../hooks/useWalletAccount", () => ({
	useWalletAccount: ({ id }: { id: string | null }) =>
		id ? { id, address: `address-of-${id}` } : null,
}));
vi.mock("../../../hooks/useResolvedSubstrateAddress", () => ({
	useResolvedSubstrateAddress: () => ({ resolvedAddress: undefined }),
}));
vi.mock("../../../hooks/usePoolByPoolAssetId", () => ({
	usePoolByPoolAssetId: () => ({ data: undefined, isLoading: false }),
}));
vi.mock("../../../hooks/useNativeToken", () => ({
	useNativeToken: () => undefined,
}));
vi.mock("../../../hooks/useToken", () => ({
	useToken: () => ({ data: undefined, isLoading: false }),
}));
vi.mock("../../../hooks/usePoolReserves", () => ({
	usePoolReserves: () => ({ data: undefined, isLoading: false }),
}));
vi.mock("./usePoolPosition", () => ({
	usePoolPosition: () => ({ data: undefined, isLoading: false }),
}));
vi.mock("./useAccountBalancesForPool", () => ({
	useAccountBalancesForPool: () => ({ data: undefined, isLoading: false }),
}));

const renderPoolPage = () =>
	renderHook(useLiquidityPoolPage, {
		wrapper: ({ children }) => (
			<MemoryRouter>
				<LiquidityPoolPageProvider>{children}</LiquidityPoolPageProvider>
			</MemoryRouter>
		),
	});

afterEach(() => window.history.replaceState(null, ""));

describe("LiquidityPoolPageProvider", () => {
	it("keeps the account chosen on this page when navigating back to it", () => {
		const firstVisit = renderPoolPage();
		act(() => firstVisit.result.current.onFromChange("pool-account"));
		firstVisit.unmount();

		const { result } = renderPoolPage();

		expect(result.current.from).toBe("pool-account");
		expect(result.current.account?.address).toBe("address-of-pool-account");
	});
});
