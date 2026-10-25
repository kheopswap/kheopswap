import { of } from "rxjs";
import type { TokenId } from "../registry/tokens/types";
import { getAssetHubMirrorTokenId$ } from "../state/prices";
import { useRelayChains } from "../state/relay";
import { bindSerialized } from "./bindSerialized";

const useAssetHubMirrorTokenId = bindSerialized(
	(tokenId: TokenId | null) =>
		tokenId ? getAssetHubMirrorTokenId$(tokenId) : of(null),
	(tokenId) => tokenId,
);

export const useIsValuedAsStable = (tokenId: TokenId | undefined) => {
	const { stableToken } = useRelayChains();
	return useAssetHubMirrorTokenId(tokenId ?? null) === stableToken.id;
};

export const hasValueLine = (
	isValuedAsStable: boolean,
	tokenPlancks: bigint | null,
) => !isValuedAsStable && tokenPlancks !== 0n;
