import { useCallback, useMemo } from "react";

import { useFeeTokens } from "./useFeeTokens";
import { useNativeToken } from "./useNativeToken";
import { useSetting } from "./useSetting";

import { type ChainId, getChainById } from "@kheopswap/registry";
import type { TokenId } from "@kheopswap/registry";
import { getAddressFromAccountField, logger } from "@kheopswap/utils";

type UsePreferredFeeToken = {
	accountId: string | null | undefined;
	chainId: ChainId | null | undefined;
};

const getKey = (
	address: string | null,
	chainId: ChainId | null | undefined,
) => {
	if (!address || !chainId) return "";

	return `${chainId}||${address}`;
};

export const useFeeToken = ({ accountId, chainId }: UsePreferredFeeToken) => {
	const stop = logger.cumulativeTimer("useFeeToken");

	const [feeTokensSettings, setFeeTokensSettings] = useSetting("feeTokens");

	const address = useMemo(
		() => (accountId ? getAddressFromAccountField(accountId) : null),
		[accountId],
	);

	const key = useMemo(() => getKey(address, chainId), [address, chainId]);

	const setFeeTokenId = useCallback(
		(feeTokenId: TokenId) => {
			if (!key) return;
			setFeeTokensSettings((prev) => {
				const next = { ...prev };
				next[key] = feeTokenId;
				return next;
			});
		},
		[key, setFeeTokensSettings],
	);

	const { isLoading, data: feeTokens } = useFeeTokens({ chainId, address });

	const chain = useMemo(
		() => (chainId ? getChainById(chainId) : null),
		[chainId],
	);

	const nativeToken = useNativeToken({ chain });

	const feeToken = useMemo(() => {
		const feeTokenId = feeTokensSettings[key];
		const token = feeTokens?.find(
			(token) => token.id === feeTokenId && token.chainId === chainId,
		);
		return token ?? feeTokens?.[0] ?? nativeToken;
	}, [feeTokensSettings, key, feeTokens, nativeToken, chainId]);

	stop();

	return { feeToken, feeTokens, setFeeTokenId, isLoading };
};
