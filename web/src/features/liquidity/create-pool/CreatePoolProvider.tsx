import { useCallback, useEffect, useMemo, useState } from "react";
import { POOL_TOKEN2_TOKEN_TYPES, type TokenId } from "src/config/tokens";
import {
	useAllTokens,
	useBalance,
	useExistentialDeposit,
	useFeeToken,
	useNativeToken,
	useRelayChains,
	useSetting,
	useWalletAccount,
} from "src/hooks";
import { getAddressFromAccountField, provideContext } from "src/util";
import type { CreatePoolFormInputs } from "./schema";
import { useCreatePoolExtrinsic } from "./useCreatePoolExtrinsic";

const useDefaultValues = () => {
	const [defaultAccountId] = useSetting("defaultAccountId");

	// account won't be available on first render
	const account = useWalletAccount({ id: defaultAccountId });

	// TODO token id from url for deep links

	return useMemo<CreatePoolFormInputs>(
		() => ({
			from: account?.id ?? "",
			token2Id: "",
			token1Amount: "",
			token2Amount: "",
		}),
		[account?.id],
	);
};

const useCreatePoolProvider = () => {
	const { assetHub } = useRelayChains();
	const defaultValues = useDefaultValues();
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

	const token1 = useNativeToken({ chain: assetHub });

	const token2 = useMemo(
		() => tokens[formData.token2Id] ?? null,
		[formData.token2Id, tokens],
	);

	const sender = useMemo(
		() => getAddressFromAccountField(formData.from),
		[formData.from],
	);

	const { data: call } = useCreatePoolExtrinsic({
		tokenId1: token1?.id,
		tokenId2: token2?.id,
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
		tokenId: token1?.id,
	});

	const accountBalances = useMemo(
		() => [balance1, balance2] as const,
		[balance1, balance2],
	);
	const isLoadingAccountBalances = useMemo(
		() => isLoadingBalance1 || isLoadingBalance2,
		[isLoadingBalance1, isLoadingBalance2],
	);

	const { data: token1ExistentialDeposit } = useExistentialDeposit({
		tokenId: token1?.id,
	});

	const { data: token2ExistentialDeposit } = useExistentialDeposit({
		tokenId: token2?.id,
	});

	return {
		assetHub,
		call,
		fakeCall: call,
		formData,
		token1,
		token2,
		token1ExistentialDeposit,
		token2ExistentialDeposit,
		tokens,
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
