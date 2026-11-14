import {
	XcmV5Junction,
	XcmV5Junctions,
	XcmV5NetworkId,
} from "@polkadot-api/descriptors";
import { describe, expect, it } from "vitest";
import type { ChainIdAssetHub } from "../registry/chains/types";
import { getTokenId } from "../registry/tokens/helpers";
import { KNOWN_TOKENS_MAP } from "../registry/tokens/tokens";
import type { TokenId } from "../registry/tokens/types";
import { getTokenDescription } from "./getTokenDescription";

const getForeignTokenId = (
	chainId: ChainIdAssetHub,
	network: XcmV5NetworkId,
): TokenId =>
	getTokenId({
		type: "foreign-asset",
		chainId,
		location: {
			parents: 2,
			interior: XcmV5Junctions.X1(XcmV5Junction.GlobalConsensus(network)),
		},
	});

describe("getTokenDescription", () => {
	it.each([
		["native::pah", "Polkadot Asset Hub"],
		["native::kah", "Kusama Asset Hub"],
		[
			getForeignTokenId("pah", XcmV5NetworkId.Kusama()),
			"Bridged to Polkadot Asset Hub",
		],
		[
			getForeignTokenId("kah", XcmV5NetworkId.Polkadot()),
			"Bridged to Kusama Asset Hub",
		],
		[
			getForeignTokenId("pah", XcmV5NetworkId.Ethereum({ chain_id: 1n })),
			"Foreign - Ethereum",
		],
	])("describes %s as %s", (tokenId, description) => {
		const token = KNOWN_TOKENS_MAP[tokenId];
		expect(token).toBeDefined();
		expect(token && getTokenDescription(token)).toBe(description);
	});
});
