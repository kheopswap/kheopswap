import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getChainById } from "../registry/chains/chains";
import { getTokenId } from "../registry/tokens/helpers";
import { useTokenChain } from "./useTokenChain";

vi.mock("../state/relay", () => ({
	useRelayChains: () => ({
		allChains: [getChainById("pah"), getChainById("hydration")],
		bridgedAssetHub: getChainById("kah"),
	}),
}));

const getTokenChainId = (chainId: "pah" | "hydration" | "kah" | "wah") =>
	renderHook(() =>
		useTokenChain({ tokenId: getTokenId({ type: "native", chainId }) }),
	).result.current?.id;

describe("useTokenChain", () => {
	it("finds a chain of the relay", () => {
		expect(getTokenChainId("hydration")).toBe("hydration");
	});

	it("finds the bridged Asset Hub", () => {
		expect(getTokenChainId("kah")).toBe("kah");
	});

	it("finds no chain outside the view", () => {
		expect(getTokenChainId("wah")).toBeUndefined();
	});
});
