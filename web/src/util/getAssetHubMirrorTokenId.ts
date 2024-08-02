import { TokenId } from "src/config/tokens";

export const getAssetHubMirrorTokenId = (tokenId: TokenId) => {
	switch (tokenId) {
		case "native::polkadot":
			return "native::pah";
		case "native::kusama":
			return "native::kah";
		case "native::rococo":
			return "native::rah";
		case "native::westend":
			return "native::wah";
		case "native::devrelay":
			return "native::devah";
		default:
			return tokenId;
	}
};
