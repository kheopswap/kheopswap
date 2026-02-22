import type { TokenId } from "../registry/tokens/types";

/**
 * Previously mapped relay chain native tokens to their asset hub equivalents.
 * Now that we only support asset hubs, this is an identity function.
 * Kept for backwards compatibility but can be removed in the future.
 */
export const getAssetHubMirrorTokenId = (tokenId: TokenId) => tokenId;
