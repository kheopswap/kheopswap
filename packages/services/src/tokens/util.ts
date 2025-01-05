import {
	type Chain,
	type Token,
	type XcmV3Multilocation,
	getChains,
	getTokenId,
} from "@kheopswap/registry";

export const sortTokens = (t1: Token, t2: Token) => {
	if (t1.type === "native" && t2.type !== "native") return -1;
	if (t1.type !== "native" && t2.type === "native") return 1;

	if (t1.verified && !t2.verified) return -1;
	if (!t1.verified && t2.verified) return 1;

	if (t1.symbol !== t2.symbol) return t1.symbol.localeCompare(t2.symbol);
	return t1.name.localeCompare(t2.name);
};

export const getForeignAssetOrigin = (
	chain: Chain,
	location: XcmV3Multilocation,
) => {
	const { parents, interior } = location;
	if (
		parents === 1 &&
		interior.type === "X1" &&
		interior.value.type === "Parachain"
	) {
		const targetChain = getChains().find(
			(c) => c.paraId === interior.value.value,
		);
		if (targetChain && targetChain.relay === chain.relay) {
			return getTokenId({ type: "native", chainId: targetChain.id });
		}
	}

	if (
		parents === 2 &&
		interior.type === "X1" &&
		interior.value.type === "GlobalConsensus"
	)
		if (interior.value.value.type === "Kusama")
			return getTokenId({ type: "native", chainId: "kusama" });

	return null;
};
