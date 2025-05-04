import {
	type ChainId,
	type XcmV3Multilocation,
	getChainById,
	getChains,
} from "@kheopswap/registry";

export const getDestinationChain = (
	originChainId: ChainId,
	location: XcmV3Multilocation,
) => {
	const originChain = getChainById(originChainId);

	if (
		location.interior.type === "X1" &&
		location.interior.value.type === "Parachain"
	) {
		const paraId = location.interior.value.value;
		if (paraId) {
			const chain = getChains().find(
				(chain) => chain.relay === originChain.relay && chain.paraId === paraId,
			);
			if (chain) return chain;
		}
	}

	if (
		originChain.relay &&
		location.parents === 1 &&
		location.interior.type === "Here"
	)
		return getChainById(originChain.relay);

	throw new Error("Unexpected destination chain");
};
