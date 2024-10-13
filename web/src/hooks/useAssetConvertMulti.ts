import { useMemo } from "react";

import { useBalances } from "./useBalances";
import { useNativeToken } from "./useNativeToken";
import { usePoolsByChainId } from "./usePoolsByChainId";
import { useRelayChains } from "./useRelayChains";
import { useTokens } from "./useTokens";

import type { TokenId } from "@kheopswap/registry";
import { getPoolReserves } from "src/helpers/getPoolReserves";
import { getAssetConvertPlancks } from "src/util";

export type AssetConvertInput = {
	tokenIdIn: TokenId;
	plancksIn: bigint;
	tokenIdOut: TokenId;
};

export type UseAssetConvertMultiProps = {
	inputs: AssetConvertInput[];
};

type AssetConvertResult = AssetConvertInput & {
	plancksOut: bigint | null;
	isLoading: boolean;
};

type AssetConvertMultiResult = {
	data: AssetConvertResult[];
	isLoading: boolean;
};

export const useAssetConvertMulti = ({
	inputs,
}: UseAssetConvertMultiProps): AssetConvertMultiResult => {
	const { assetHub } = useRelayChains();
	const nativeToken = useNativeToken({ chain: assetHub });

	const tokenIds = useMemo(
		() => [
			...new Set(
				inputs
					.map(({ tokenIdIn }) => tokenIdIn)
					.concat(inputs.map(({ tokenIdOut }) => tokenIdOut)),
			),
		],
		[inputs],
	);

	const { data: tokens, isLoading: isLoadingTokens } = useTokens({ tokenIds });

	const { data: pools, isLoading: isLoadingPools } = usePoolsByChainId({
		chainId: assetHub.id,
	});

	const poolsBalanceDefs = useMemo(() => {
		// TODO filter out useless pools
		return (
			pools?.flatMap((pool) =>
				pool.tokenIds.map((tokenId) => ({
					address: pool.owner,
					tokenId,
				})),
			) ?? []
		);
	}, [pools]);

	const { data: reserves, isLoading: isLoadingReserves } = useBalances({
		balanceDefs: poolsBalanceDefs,
	});

	return useMemo(() => {
		const data = inputs.map<AssetConvertResult>((input) => {
			const { tokenIdIn, plancksIn, tokenIdOut } = input;
			const tokenIn = tokens[tokenIdIn]?.token;
			const tokenOut = tokens[tokenIdOut]?.token;

			if (!tokenIn || !tokenOut || !nativeToken)
				return { ...input, plancksOut: null, isLoading: isLoadingTokens };

			const reserveNativeToTokenIn = getPoolReserves(
				pools,
				reserves,
				nativeToken,
				tokenIn,
			);
			const reserveNativeToTokenOut = getPoolReserves(
				pools,
				reserves,
				nativeToken,
				tokenOut,
			);

			if (!reserveNativeToTokenIn || !reserveNativeToTokenOut)
				return {
					...input,
					plancksOut: null,
					isLoading: isLoadingPools || isLoadingReserves,
				};

			const plancksOut =
				getAssetConvertPlancks(
					plancksIn,
					tokenIn,
					nativeToken,
					tokenOut,
					reserveNativeToTokenIn,
					reserveNativeToTokenOut,
				) ?? null;

			return {
				...input,
				plancksOut,
				isLoading: isLoadingPools || isLoadingReserves,
			};
		});

		return { data, isLoading: data.some(({ isLoading }) => isLoading) };
	}, [
		inputs,
		isLoadingPools,
		isLoadingReserves,
		isLoadingTokens,
		nativeToken,
		pools,
		reserves,
		tokens,
	]);
};
