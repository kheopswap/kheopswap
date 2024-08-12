import { type Dictionary, fromPairs, toPairs } from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	POOL_TOKEN2_TOKEN_TYPES,
	type Token,
	type TokenId,
} from "src/config/tokens";
import {
	useAllTokens,
	useBalance,
	useExistentialDeposit,
	useFeeToken,
	useNativeToken,
	usePoolsByChainId,
	useRelayChains,
	useSetting,
	useWalletAccount,
} from "src/hooks";
import { getAddressFromAccountField, isBigInt, provideContext } from "src/util";
import type { CreatePoolFormInputs } from "./schema";
import { useCreatePoolExtrinsic } from "./useCreatePoolExtrinsic";

const useDefaultValues = (token2Id: TokenId) => {
	const [defaultAccountId] = useSetting("defaultAccountId");

	// account won't be available on first render
	const account = useWalletAccount({ id: defaultAccountId });

	// TODO token id from url for deep links

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

	// TODO merge in formdata
	const [liquidityToAdd, setLiquidityToAdd] = useState<[bigint, bigint] | null>(
		null,
	);

	useEffect(() => {
		if (formData.from) setDefaultAccountId(formData.from);
	}, [formData.from, setDefaultAccountId]);

	const { data: tokens, isLoading: isLoadingTokens } = useAllTokens({
		types: POOL_TOKEN2_TOKEN_TYPES,
	});

	const { data: pools } = usePoolsByChainId({ chainId: assetHub.id });

	const tokensWithoutPool = useMemo<Dictionary<Token>>(() => {
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

	const { data: call } = useCreatePoolExtrinsic({
		tokenId1: token1?.id,
		tokenId2: token2?.id,
		liquidityToAdd,
		mintTo: sender,
	});

	const fakeLiquidityToAdd = useMemo<[bigint, bigint] | null>(
		() =>
			isBigInt(token1ExistentialDeposit) && isBigInt(token2ExistentialDeposit)
				? [token1ExistentialDeposit, token2ExistentialDeposit]
				: null,
		[token1ExistentialDeposit, token2ExistentialDeposit],
	);

	const { data: fakeCall } = useCreatePoolExtrinsic({
		tokenId1: token1?.id,
		tokenId2: token2?.id,
		liquidityToAdd: fakeLiquidityToAdd,
		mintTo: sender,
	});

	const { feeToken } = useFeeToken({
		chainId: assetHub.id,
		accountId: sender,
	});

	const onReset = useCallback(() => {
		setFormData(defaultValues);
	}, [defaultValues]);

	const onToken2Change = useCallback((tokenId: TokenId) => {
		setFormData((prev) => ({ ...prev, token2Id: tokenId }));
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
		liquidityToAdd,
		setLiquidityToAdd,
		accountBalances,
		isLoadingAccountBalances,
		feeToken,
	};
};

export const [CreatePoolProvider, useCreatePool] = provideContext(
	useCreatePoolProvider,
);
