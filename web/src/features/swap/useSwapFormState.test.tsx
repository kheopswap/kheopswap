import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getChains, isChainAssetHub } from "../../registry/chains/chains";
import type { RelayId } from "../../registry/chains/types";
import type { SwapFormInputs } from "./schema";
import { useSwapFormState } from "./useSwapFormState";

const fixture = vi.hoisted(() => ({ chainsRelayId: "polkadot" as string }));

const relayChains = (relayId: string) => {
	const allChains = getChains().filter((chain) => chain.relay === relayId);
	return { relayId, allChains, assetHub: allChains.find(isChainAssetHub) };
};

vi.mock("../../state/relay", () => ({
	useRelayChains: () => relayChains(fixture.chainsRelayId),
}));
vi.mock("../../common/settings", () => ({ setSetting: vi.fn() }));
vi.mock("../../hooks/useSetting", () => ({ useSetting: () => ["", vi.fn()] }));
vi.mock("../../hooks/useWalletAccount", () => ({
	useWalletAccount: () => undefined,
}));
vi.mock("../../hooks/useResolvedSubstrateAddress", () => ({
	useResolvedSubstrateAddress: () => ({ resolvedAddress: undefined }),
}));
vi.mock("./routes/xcmRouteMirrors", () => ({
	useXcmRouteMirrors: () => ({
		mirrors: new Map(),
		hydrationFeeAssetIds: new Set(),
	}),
}));

const paseoDraft: SwapFormInputs = {
	from: "",
	to: "",
	tokenIdIn: "native::pasah",
	tokenIdOut: "asset::pasah::1337",
	amountIn: "100",
};

const renderForm = (routeRelayId: RelayId) => {
	const wrapper = ({ children }: PropsWithChildren) => (
		<MemoryRouter initialEntries={[`/${routeRelayId}/swap`]}>
			<Routes>
				<Route path="/:relayId/swap" element={children} />
			</Routes>
		</MemoryRouter>
	);
	return renderHook(() => useSwapFormState(), { wrapper });
};

const setRelay = (relayId: string) => {
	window.location.hash = `#/${relayId}/swap`;
	fixture.chainsRelayId = relayId;
};

describe("useSwapFormState on a network change", () => {
	beforeEach(() => {
		setRelay("paseo");
		window.history.replaceState({ formDraft: paseoDraft }, "");
	});

	it("keeps a draft of the current network while the chains still lag behind the location", () => {
		fixture.chainsRelayId = "polkadot";
		const { result, rerender } = renderForm("paseo");
		expect(result.current.formData).toEqual(paseoDraft);

		fixture.chainsRelayId = "paseo";
		rerender();
		expect(result.current.formData).toEqual(paseoDraft);
	});

	it("clears the amount with the tokens once the chains follow the new location", () => {
		const { result, rerender } = renderForm("paseo");

		window.location.hash = "#/polkadot/swap";
		rerender();
		expect(result.current.formData).toEqual(paseoDraft);

		fixture.chainsRelayId = "polkadot";
		rerender();
		expect(result.current.formData).toMatchObject({
			tokenIdIn: "native::pah",
			tokenIdOut: "",
			amountIn: "",
		});
	});

	it("follows the relay the app resolves from a non-canonical location", () => {
		window.location.hash = "#paseo/swap";
		window.history.replaceState({ formDraft: paseoDraft }, "");
		fixture.chainsRelayId = "polkadot";
		const { result } = renderForm("paseo");
		expect(result.current.formData).toMatchObject({
			tokenIdIn: "native::pah",
			tokenIdOut: "",
			amountIn: "",
		});
	});

	it("keeps the amount through a same-network token change", () => {
		const { result } = renderForm("paseo");
		act(() => result.current.onTokenOutChange("asset::pasah::1984"));
		expect(result.current.formData).toMatchObject({
			tokenIdOut: "asset::pasah::1984",
			amountIn: "100",
		});
	});
});
