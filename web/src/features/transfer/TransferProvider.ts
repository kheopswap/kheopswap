import { pickBy } from "lodash-es";
import { useCallback, useEffect, useMemo } from "react";
import { useBalance } from "../../hooks/useBalance";
import { useCanAccountReceive } from "../../hooks/useCanAccountReceive";
import { useExistentialDeposit } from "../../hooks/useExistentialDeposit";
import { useNativeToken } from "../../hooks/useNativeToken";
import { usePersistedFormDraft } from "../../hooks/usePersistedFormDraft";
import { useResolvedSubstrateAddress } from "../../hooks/useResolvedSubstrateAddress";
import { useTokenChain } from "../../hooks/useTokenChain";
import { useTokensByChainId } from "../../hooks/useTokensByChainId";
import { isChainIdAssetHub } from "../../registry/chains/chains";
import { TRANSFERABLE_TOKEN_TYPES } from "../../registry/tokens/tokens";
import type { TokenId } from "../../registry/tokens/types";
import { useRelayChains } from "../../state/relay";
import { getAddressFromAccountField } from "../../utils/getAddressFromAccountField";
import { tokensToPlancks } from "../../utils/plancks";
import { provideContext } from "../../utils/provideContext";
import type { TransferFormInputs } from "./schema";
import { useTransferExtrinsic } from "./useTransferExtrinsic";

const useTransferProvider = () => {
	const { assetHub } = useRelayChains();
	const defaultToken = useNativeToken({ chain: assetHub });

	const baseDefaults = useMemo<TransferFormInputs>(
		() => ({
			from: "",
			tokenId: (defaultToken?.id ?? "") as TokenId,
			amount: "",
			to: "",
		}),
		[defaultToken?.id],
	);

	const [formData, setFormData] =
		usePersistedFormDraft<TransferFormInputs>(baseDefaults);

	const { data: assetHubTokens, isLoading: isLoadingTokens } =
		useTokensByChainId({ chainId: assetHub.id });

	const tokens = useMemo(
		() =>
			pickBy(assetHubTokens, (token) =>
				TRANSFERABLE_TOKEN_TYPES.includes(token.type),
			),
		[assetHubTokens],
	);

	const sender = useMemo(
		() => getAddressFromAccountField(formData.from),
		[formData.from],
	);

	const recipient = useMemo(
		() => getAddressFromAccountField(formData.to),
		[formData.to],
	);

	const token = useMemo(
		() => tokens[formData.tokenId] ?? null,
		[formData.tokenId, tokens],
	);
	const tokenChain = useTokenChain({ tokenId: formData.tokenId as TokenId });

	const { resolvedAddress, isLoading: isResolvingRecipient } =
		useResolvedSubstrateAddress({
			address: recipient,
			chainId: tokenChain?.id,
		});

	useEffect(() => {
		if (tokenChain?.id !== assetHub.id && defaultToken) {
			setFormData((prev) => ({
				...prev,
				tokenId: defaultToken.id,
			}));
		}
	}, [defaultToken, assetHub.id, tokenChain?.id, setFormData]);

	const plancks = useMemo(() => {
		try {
			return formData.amount && token
				? tokensToPlancks(formData.amount, token.decimals)
				: null;
		} catch (_err) {
			return null;
		}
	}, [formData.amount, token]);

	const { data: existentialDeposit } = useExistentialDeposit({
		tokenId: token?.id,
	});

	const transferChainId = isChainIdAssetHub(tokenChain?.id)
		? tokenChain.id
		: null;

	const { data: call } = useTransferExtrinsic({
		chainId: transferChainId,
		tokenId: token?.id,
		plancks,
		recipient: resolvedAddress,
	});

	const { data: fakeCall } = useTransferExtrinsic({
		chainId: transferChainId,
		tokenId: token?.id,
		plancks: existentialDeposit ?? null,
		recipient: resolvedAddress ?? sender,
	});

	const { data: balanceSender, isLoading: isLoadingBalanceSender } = useBalance(
		{
			address: sender,
			tokenId: token?.id,
		},
	);

	const { data: balanceRecipient } = useBalance({
		address: resolvedAddress,
		tokenId: token?.id,
	});

	const { data: checkCanAccountReceive, isLoading: isCheckingRecipient } =
		useCanAccountReceive({
			address: resolvedAddress,
			tokenId: token?.id,
			plancks,
		});

	const outputErrorMessage = useMemo(
		() => checkCanAccountReceive?.reason,
		[checkCanAccountReceive?.reason],
	);

	const onTokenChange = useCallback(
		(tokenId: TokenId) => {
			setFormData((prev) => ({ ...prev, tokenId }));
		},
		[setFormData],
	);

	const onFromChange = useCallback(
		(accountId: string) => {
			setFormData((prev) => ({ ...prev, from: accountId }));
		},
		[setFormData],
	);

	const onToChange = useCallback(
		(address: string) => {
			setFormData((prev) => ({ ...prev, to: address }));
		},
		[setFormData],
	);

	const onAmountChange = useCallback(
		(amount: string) => {
			setFormData((prev) => ({ ...prev, amount }));
		},
		[setFormData],
	);

	const onReset = useCallback(() => {
		setFormData((prev) => ({ ...prev, amount: "" }));
	}, [setFormData]);

	return {
		formData,
		tokens,
		isLoadingTokens,
		sender,
		recipient,
		resolvedAddress,
		token,
		plancks,
		existentialDeposit,
		balanceRecipient,
		balanceSender,
		isLoadingBalanceSender,
		outputErrorMessage,

		onAmountChange,
		onTokenChange,
		onFromChange,
		onToChange,
		onReset,

		call:
			outputErrorMessage ||
			isResolvingRecipient ||
			(isCheckingRecipient && checkCanAccountReceive?.canReceive !== true)
				? undefined
				: call,
		fakeCall,
	};
};

export const [TransferProvider, useTransfer] =
	provideContext(useTransferProvider);
