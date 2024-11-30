import type { TokenId } from "@kheopswap/registry";

export const getAssetHubMirrorTokenId = (tokenId: TokenId) => {
	switch (tokenId) {
		case "native::polkadot":
			return "native::pah";
		case "native::kusama":
			return "native::kah";
		case "native::westend":
			return "native::wah";
		case "native::paseo":
			return "native::pasah";
		default:
			return tokenId;
	}
};
