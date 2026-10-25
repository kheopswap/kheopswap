import { fromPairs, toPairs } from "lodash-es";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAllTokens } from "../../../hooks/useAllTokens";
import { useBalance } from "../../../hooks/useBalance";
import { useExistentialDeposit } from "../../../hooks/useExistentialDeposit";
import { useNativeToken } from "../../../hooks/useNativeToken";
import { usePoolsByChainId } from "../../../hooks/usePoolsByChainId";
import { useResolvedSubstrateAddress } from "../../../hooks/useResolvedSubstrateAddress";
import { useSetting } from "../../../hooks/useSetting";
import { useWalletAccount } from "../../../hooks/useWalletAccount";
import { POOL_TOKEN2_TOKEN_TYPES } from "../../../registry/tokens/tokens";
import type { Token, TokenId } from "../../../registry/tokens/types";
import { useRelayChains } from "../../../state/relay";
import { getAddressFromAccountField } from "../../../utils/getAddressFromAccountField";
import { isBigInt } from "../../../utils/isBigInt";
import { provideContext } from "../../../utils/provideContext";
import { getLiquidityToAdd, type LiquidityAmounts } from "../liquidityAmounts";
import type { Side } from "../maxLiquidity";
import type { CreatePoolFormInputs } from "./schema";
import { useCreatePoolExtrinsic } from "./useCreatePoolExtrinsic";

const useDefaultValues = (token2Id: TokenId) => {
	const [defaultAccountId] = useSetting("defaultAccountId");

	const account = useWalletAccount({ id: defaultAccountId });

	return useMemo<CreatePoolFormInputs>(
		() => ({
			from: account?.id ?? "",
			token2Id,
			token1Amount: "",
			token2Amount: "",
		}),
		[account?.id, token2Id],
	);
};

const useCreatePoolProvider = ({ tokenId }: { tokenId: TokenId }) => {
	const { assetHub } = useRelayChains();
	const defaultValues = useDefaultValues(tokenId);
	const [formData, setFormData] = useState<CreatePoolFormInputs>(defaultValues);
	const [, setDefaultAccountId] = useSetting("defaultAccountId");

	useEffect(() => {
		if (formData.from) setDefaultAccountId(formData.from);
	}, [formData.from, setDefaultAccountId]);

	const { data: tokens, isLoading: isLoadingTokens } = useAllTokens({
		types: POOL_TOKEN2_TOKEN_TYPES,
	});

	const { data: pools } = usePoolsByChainId({ chainId: assetHub.id });

	const tokensWithoutPool = useMemo<Record<string, Token>>(() => {
		if (!pools) return {};
		return fromPairs(
			toPairs(tokens).filter(
				([id]) => !pools.some((pool) => pool.tokenIds.includes(id)),
			),
		);
	}, [pools, tokens]);

	const token1 = useNativeToken({ chain: assetHub });

	const token2 = useMemo(
		() => tokens[formData.token2Id] ?? null,
		[formData.token2Id, tokens],
	);

	const amounts = useMemo<LiquidityAmounts>(
		() => [formData.token1Amount, formData.token2Amount],
		[formData.token1Amount, formData.token2Amount],
	);

	const liquidityToAdd = useMemo(
		() =>
			token1 && token2
				? getLiquidityToAdd(amounts, [token1.decimals, token2.decimals])
				: null,
		[amounts, token1, token2],
	);

	const { data: token1ExistentialDeposit } = useExistentialDeposit({
		tokenId: token1?.id,
	});

	const { data: token2ExistentialDeposit } = useExistentialDeposit({
		tokenId: token2?.id,
	});

	const sender = useMemo(
		() => getAddressFromAccountField(formData.from),
		[formData.from],
	);

	const { resolvedAddress: resolvedSender } = useResolvedSubstrateAddress({
		address: sender,
		chainId: assetHub.id,
	});

	const { data: call } = useCreatePoolExtrinsic({
		chainId: assetHub.id,
		tokenId1: token1?.id,
		tokenId2: token2?.id,
		liquidityToAdd,
		mintTo: resolvedSender,
	});

	const fakeLiquidityToAdd = useMemo<[bigint, bigint] | null>(
		() =>
			isBigInt(token1ExistentialDeposit) && isBigInt(token2ExistentialDeposit)
				? [token1ExistentialDeposit, token2ExistentialDeposit]
				: null,
		[token1ExistentialDeposit, token2ExistentialDeposit],
	);

	const { data: fakeCall } = useCreatePoolExtrinsic({
		chainId: assetHub.id,
		tokenId1: token1?.id,
		tokenId2: token2?.id,
		liquidityToAdd: fakeLiquidityToAdd,
		mintTo: resolvedSender,
	});

	const onReset = useCallback(() => {
		setFormData(defaultValues);
	}, [defaultValues]);

	const onToken2Change = useCallback((tokenId: TokenId) => {
		setFormData((prev) => ({ ...prev, token2Id: tokenId }));
	}, []);

	const onAmountChange = useCallback((side: Side, amount: string) => {
		setFormData((prev) => ({
			...prev,
			[side === 0 ? "token1Amount" : "token2Amount"]: amount,
		}));
	}, []);

	const onFromChange = useCallback((accountId: string) => {
		setFormData((prev) => ({ ...prev, from: accountId }));
	}, []);

	const { data: balance1, isLoading: isLoadingBalance1 } = useBalance({
		address: sender,
		tokenId: token1?.id,
	});

	const { data: balance2, isLoading: isLoadingBalance2 } = useBalance({
		address: sender,
		tokenId: token2?.id,
	});

	const accountBalances = useMemo(
		() => [balance1, balance2] as const,
		[balance1, balance2],
	);
	const isLoadingAccountBalances = useMemo(
		() => isLoadingBalance1 || isLoadingBalance2,
		[isLoadingBalance1, isLoadingBalance2],
	);

	return {
		assetHub,
		call,
		fakeCall,
		formData,
		sender,
		token1,
		token2,
		token1ExistentialDeposit,
		token2ExistentialDeposit,
		tokensWithoutPool,
		isLoadingTokens,
		onReset,
		onFromChange,
		onToken2Change,
		amounts,
		onAmountChange,
		liquidityToAdd,
		accountBalances,
		isLoadingAccountBalances,
	};
};

export const [CreatePoolProvider, useCreatePool] = provideContext(
	useCreatePoolProvider,
);
