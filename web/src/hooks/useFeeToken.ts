import { useCallback, useMemo } from "react";

import { useFeeTokens } from "./useFeeTokens";
import { useNativeToken } from "./useNativeToken";
import { useSetting } from "./useSetting";

import { type ChainId, getChainById } from "@kheopswap/registry";
import type { TokenId } from "@kheopswap/registry";
import { getAddressFromAccountField } from "@kheopswap/utils";

type UsePreferredFeeToken = {
	accountId: string | null | undefined;
	chainId: ChainId | null | undefined;
};

const getKey = (
	idOrAddress: string | null | undefined,
	chainId: ChainId | null | undefined,
) => {
	if (!idOrAddress || !chainId) return "";

	return `${chainId}||${getAddressFromAccountField(idOrAddress)}`;
};

export const useFeeToken = ({ accountId, chainId }: UsePreferredFeeToken) => {
	const [feeTokensSettings, setFeeTokensSettings] = useSetting("feeTokens");

	const key = useMemo(() => getKey(accountId, chainId), [accountId, chainId]);

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

	const { isLoading, data: feeTokens } = useFeeTokens({ chainId });

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
		return token?.isSufficient ? token : nativeToken;
	}, [feeTokensSettings, key, feeTokens, nativeToken, chainId]);

	return { feeToken, feeTokens, setFeeTokenId, isLoading };
};
