import { getChainById, isAssetHub } from "src/config/chains";
import {
  TokenId,
  getChainIdFromTokenId,
  parseTokenId,
} from "src/config/tokens";
import { getApi } from "src/services/api";
import { getXcmV3MultilocationFromTokenId } from "src/util";

export type CreatePoolExtrinsicProps = {
  tokenIdNative: TokenId;
  tokenIdAsset: TokenId;
};

export const isValidCreatePoolExtrinsicProps = (
  props: Partial<CreatePoolExtrinsicProps>,
): props is CreatePoolExtrinsicProps => {
  return !!props && !!props.tokenIdNative && !!props.tokenIdAsset;
};

export const getCreatePoolExtrinsic = async ({
  tokenIdNative,
  tokenIdAsset,
}: CreatePoolExtrinsicProps) => {
  const chainId = getChainIdFromTokenId(tokenIdNative);
  if (!chainId) return null;

  const chain = getChainById(chainId);
  if (!chain) return null;

  const tokenIn = parseTokenId(tokenIdNative);
  if (tokenIn.chainId !== chain.id)
    throw new Error(
      `Token ${tokenIdNative} is not supported on chain ${chain.id}`,
    );

  const tokenOut = parseTokenId(tokenIdAsset);
  if (tokenOut.chainId !== chain.id)
    throw new Error(
      `Token ${tokenIdAsset} is not supported on chain ${chain.id}`,
    );

  if (!isAssetHub(chain)) throw new Error("Chain is not an asset hub");

  const asset1 = getXcmV3MultilocationFromTokenId(tokenIdNative);
  if (!asset1)
    throw new Error("Failed to convert native token to multilocation");

  const asset2 = getXcmV3MultilocationFromTokenId(tokenIdAsset);
  if (!asset2)
    throw new Error("Failed to convert asset token to multilocation");

  const api = await getApi(chain.id);

  return api.tx.AssetConversion.create_pool({
    asset1,
    asset2,
  });
};
