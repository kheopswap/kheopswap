import { keyBy, values } from "lodash-es";
import type { SS58String } from "polkadot-api";
import { useMemo } from "react";
import { getChainIdFromTokenId } from "../registry/tokens/helpers";
import type { Token, TokenId } from "../registry/tokens/types";
import { getNativeToken } from "../utils/getNativeToken";
import { plancksToTokens } from "../utils/plancks";
import { useBalances } from "./useBalances";
import { useExistentialDeposit } from "./useExistentialDeposit";
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

const SIGNIFICANT_DIGITS = 4n;

const roundUpToSignificantDigits = (plancks: bigint): bigint => {
	const droppedDigits = BigInt(plancks.toString().length) - SIGNIFICANT_DIGITS;
	if (droppedDigits <= 0n) return plancks;
	const unit = 10n ** droppedDigits;
	return ((plancks + unit - 1n) / unit) * unit;
};

export const getRecipientMinimumMessage = (
	missingPlancks: bigint,
	{ symbol, decimals }: Pick<Token, "symbol" | "decimals">,
) =>
	`The recipient needs at least ${plancksToTokens(
		roundUpToSignificantDigits(missingPlancks),
		decimals,
	)} ${symbol}`;

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

		if (token.isSufficient && plancks >= existentialDeposit)
			return { canReceive: true };

		const isSufficientAccount =
			!!balanceMap[nativeToken.id]?.balance ||
			sufficientTokens.some((t) => !!balanceMap[t.id]?.balance);
		if (!token.isSufficient && !isSufficientAccount)
			return { canReceive: false, reason: "Account has no sufficient assets" };

		const held = balanceMap[tokenId]?.balance ?? 0n;
		if (held + plancks >= existentialDeposit) return { canReceive: true };

		return {
			canReceive: false,
			reason: getRecipientMinimumMessage(existentialDeposit - held, token),
		};
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
