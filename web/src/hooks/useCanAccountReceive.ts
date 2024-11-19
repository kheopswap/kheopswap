import type { SS58String } from "polkadot-api";
import { useMemo } from "react";

import { useExistentialDeposit } from "./useExistentialDeposit";

import { type TokenId, getChainIdFromTokenId } from "@kheopswap/registry";
import { keyBy, values } from "lodash";
import { getNativeToken } from "src/util";
import { useBalances } from "./useBalances";
import { useTokensByChainId } from "./useTokensByChainId";

type UseCanAccountReceiveProps = {
	address: SS58String | null | undefined;
	tokenId: TokenId | null | undefined;
	plancks: bigint | null | undefined;
};

type UseCanAccountReceiveResult = {
	isLoading?: boolean;
	data: { canReceive: boolean; reason?: string } | undefined;
};

export const useCanAccountReceive = ({
	address,
	tokenId,
	plancks,
}: UseCanAccountReceiveProps): UseCanAccountReceiveResult => {
	const [chainId, nativeToken] = useMemo(() => {
		const chainId = tokenId ? getChainIdFromTokenId(tokenId) : null;
		return chainId ? [chainId, getNativeToken(chainId)] : [null, null];
	}, [tokenId]);

	const { data: existentialDeposit, isLoading: isLoadingED } =
		useExistentialDeposit({
			tokenId,
		});

	const { data: allTokens, isLoading: isLoadingToken } = useTokensByChainId({
		chainId,
	});

	const [sufficientTokens, balanceDefs] = useMemo(() => {
		const sufficientTokens = values(allTokens).filter((t) => t.isSufficient);
		return [
			sufficientTokens,
			address
				? sufficientTokens
						.map((t) => ({ address, tokenId: t.id }))
						.concat(tokenId ? [{ address, tokenId }] : [])
						.concat(nativeToken ? [{ address, tokenId: nativeToken.id }] : [])
				: [],
		];
	}, [allTokens, address, tokenId, nativeToken]);

	const { data: balances, isLoading: isLoadingBalances } = useBalances({
		balanceDefs,
	});

	const isLoading = useMemo(
		() => isLoadingED || isLoadingBalances || isLoadingToken,
		[isLoadingED, isLoadingBalances, isLoadingToken],
	);

	const data = useMemo(() => {
		if (!plancks || !tokenId || !address || !nativeToken)
			return { canReceive: false };
		if (typeof existentialDeposit !== "bigint") return { canReceive: false };

		const balanceMap = keyBy(balances, "tokenId");
		const token = allTokens[tokenId];
		if (!token) return { canReceive: false };

		// if the token being sent is sufficient, all good
		if (token.isSufficient && plancks >= existentialDeposit)
			return { canReceive: true };

		// check if the target has at least one sufficient asset
		const isSufficientAccount =
			!!balanceMap[nativeToken.id]?.balance ||
			sufficientTokens.some((t) => !!balanceMap[t.id]?.balance);
		if (!isSufficientAccount)
			return {
				canReceive: false,
				reason: token.isSufficient
					? "Cannot send insufficient amount"
					: "Account has no sufficient assets",
			};

		if ((balanceMap[tokenId]?.balance ?? 0n) + plancks >= existentialDeposit)
			return { canReceive: true };

		return { canReceive: false, reason: "Cannot send insufficient amount" };
	}, [
		existentialDeposit,
		plancks,
		balances,
		allTokens,
		tokenId,
		nativeToken,
		address,
		sufficientTokens,
	]);

	return {
		data,
		isLoading,
	};
};
