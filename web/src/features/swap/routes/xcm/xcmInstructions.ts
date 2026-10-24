import {
	XcmV2MultiassetWildFungibility,
	XcmV3MultiassetFungibility,
	XcmV5AssetFilter,
	XcmV5Instruction,
	XcmV5Junction,
	XcmV5Junctions,
	XcmV5WildAsset,
} from "@polkadot-api/descriptors";
import { AccountId, Binary, type SS58String } from "polkadot-api";
import type { TokenId } from "../../../../registry/tokens/types";
import { getXcmV5MultilocationFromTokenId } from "../../../../registry/utils/xcmMultiLocation";
import type { AmmHop } from "../ammPath";

export type SwapHop = AmmHop & { minOut: bigint };

// query_xcm_weight traps on any Fungible(0) in the program.
export const toFungible = (plancks: bigint) =>
	XcmV3MultiassetFungibility.Fungible(plancks > 0n ? plancks : 1n);

export const allOf = (tokenId: TokenId) =>
	XcmV5AssetFilter.Wild(
		XcmV5WildAsset.AllOf({
			id: getXcmV5MultilocationFromTokenId(tokenId),
			fun: XcmV2MultiassetWildFungibility.Fungible(),
		}),
	);

export const anyOneAsset = XcmV5AssetFilter.Wild(XcmV5WildAsset.AllCounted(1));

export const depositAsset = (
	assets: XcmV5AssetFilter,
	beneficiary: SS58String,
) =>
	XcmV5Instruction.DepositAsset({
		assets,
		beneficiary: {
			parents: 0,
			interior: XcmV5Junctions.X1(
				XcmV5Junction.AccountId32({
					network: undefined,
					id: Binary.toHex(AccountId().enc(beneficiary)),
				}),
			),
		},
	});

export const exchangeAsset = ({ tokenIdIn, tokenIdOut, minOut }: SwapHop) =>
	XcmV5Instruction.ExchangeAsset({
		give: allOf(tokenIdIn),
		want: [
			{
				id: getXcmV5MultilocationFromTokenId(tokenIdOut),
				fun: toFungible(minOut),
			},
		],
		maximal: true,
	});
