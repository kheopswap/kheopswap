import { isNumber } from "lodash";
import type { Transaction } from "polkadot-api";
import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { type Observable, catchError, of, shareReplay } from "rxjs";

import {
	formatTxError,
	isBigInt,
	logger,
	notifyError,
	provideContext,
} from "@kheopswap/utils";
import type { FollowUpTxEvent } from "src/components";
import { type ChainId, getChainById } from "src/config/chains";
import type { Token, TokenId } from "src/config/tokens";
import {
	type InjectedAccount,
	useAssetConvertPlancks,
	useBalance,
	useBalances,
	useEstimateFee,
	useExistentialDeposits,
	useFeeToken,
	useNativeToken,
	useNonce,
	useWalletAccount,
} from "src/hooks";
import type { BalanceDef } from "src/services/balances";
import { getFeeAssetLocation, getTxOptions } from "src/util";

export type CallSpendings = Partial<
	Record<TokenId, { plancks: bigint; allowDeath: boolean }>
>;

type UseTransactionProviderProps = {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	call: Transaction<any, any, any, any> | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	fakeCall: Transaction<any, any, any, any> | null | undefined; // used as backup for calculating fees without all the inputs
	signer: string | null | undefined; // accountkey
	chainId: ChainId | null | undefined;
	callSpendings?: CallSpendings; // tokens to be spent as part of the call
	followUpData?: object;
	onReset: () => void;
};

type FollowUpInputs = {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	call: Transaction<any, any, any, any> | null | undefined;
	obsTxEvents: Observable<FollowUpTxEvent>;
	account: InjectedAccount;
	feeEstimate: bigint;
	feeToken: Token;
};

const DEFAULT_CALL_SPENDINGS: CallSpendings = {};
const DEFAULT_FOLLOW_UP_DATA = {};

const useTransactionProvider = ({
	call,
	fakeCall,
	signer,
	chainId,
	callSpendings = DEFAULT_CALL_SPENDINGS,
	onReset,
	followUpData = DEFAULT_FOLLOW_UP_DATA,
}: UseTransactionProviderProps) => {
	const account = useWalletAccount({ id: signer });

	const chain = useMemo(
		() => (chainId ? getChainById(chainId) : null),
		[chainId],
	);
	const nativeToken = useNativeToken({ chain });

	const [followUpInputs, setFollowUpInputs] = useState<FollowUpInputs>();

	const { data: nonce } = useNonce({
		account: account?.address,
		chainId,
	});

	const {
		feeToken,
		feeTokens,
		isLoading: isLoadingFeeTokens,
		setFeeTokenId,
	} = useFeeToken({ accountId: signer, chainId });

	const options = useMemo(() => {
		if (!isNumber(nonce) || !feeToken) return undefined;
		return getTxOptions({
			asset: feeToken ? getFeeAssetLocation(feeToken) : undefined,
			mortality: { mortal: true, period: 64 },
			nonce,
		});
	}, [feeToken, nonce]);

	const {
		data: feeEstimateNative,
		isLoading: isLoadingFeeEstimateNative,
		error: errorFeeEstimate,
	} = useEstimateFee({
		from: account?.address,
		call: call ?? fakeCall,
		options,
	});

	const { isLoading: isLoadingFeeEstimateConvert, plancksOut: feeEstimate } =
		useAssetConvertPlancks({
			tokenIdIn: nativeToken?.id,
			tokenIdOut: feeToken?.id,
			plancks: feeEstimateNative,
		});

	const { data: feeTokenBalance, isLoading: isLoadingFeeTokenBalance } =
		useBalance({
			address: account?.address,
			tokenId: feeToken?.id,
		});

	const onSubmit = useCallback(() => {
		try {
			logger.log("submit", { call });

			if (!call || !account || !feeEstimate || !feeToken || !options) return;

			let isSubmitted = false;

			const obsTxEvents = call
				.signSubmitAndWatch(account.polkadotSigner, options)
				.pipe(
					catchError((error) => of({ type: "error" as const, error })),
					shareReplay(1),
				);

			setFollowUpInputs({
				...(followUpData as object),
				obsTxEvents,
				account,
				feeEstimate,
				feeToken,
				call,
			});

			const sub = obsTxEvents.subscribe((x) => {
				logger.log("Transaction status update", x);

				if (x.type === "broadcasted") isSubmitted = true;

				if (x.type === "finalized") sub.unsubscribe();

				if (x.type === "error") {
					// Handles errors such as user cancelling the transaction from the wallet
					logger.error("Transaction error", x.error);
					const errorMessage = x.error.error
						? formatTxError(x.error.error)
						: "";
					const errorType = x.error instanceof Error ? x.error.name : "Error";
					const errorText = errorMessage
						? `${errorType}: ${errorMessage}`
						: null;

					if (errorMessage === "Unknown: CannotLookup")
						console.warn(
							"It could be that the chain doesn't support CheckMetadataHash",
						);

					// if submitted let follow up display it
					// if not, use standard error notification
					if (!isSubmitted) {
						if (errorText) toast(errorText, { type: "error" });
						else notifyError(x.error);
						setFollowUpInputs(undefined);
					}

					sub.unsubscribe();
				}
			});
		} catch (err) {
			notifyError(err);
		}
	}, [account, call, feeEstimate, feeToken, followUpData, options]);

	const tokenIds = useMemo(() => {
		const allTokenIds = Object.keys(callSpendings)
			.concat(feeToken?.id ?? "")
			.filter(Boolean) as TokenId[];
		return [...new Set(allTokenIds)];
	}, [callSpendings, feeToken?.id]);

	// known spent balances + fee token balance
	const balanceDefs = useMemo<BalanceDef[] | undefined>(
		() =>
			account
				? tokenIds.map<BalanceDef>((tokenId) => ({
						address: account.address,
						tokenId,
					}))
				: undefined,
		[account, tokenIds],
	);

	const { data: balances, isLoading: isLoadingBalances } = useBalances({
		balanceDefs,
	});

	const {
		data: existentialDeposits,
		isLoading: isLoadingExistentialDeposits,
		error: errorExistentialDeposits,
	} = useExistentialDeposits({ tokenIds });

	const insufficientBalances = useMemo(() => {
		const result: Record<TokenId, string> = {};

		if (call && existentialDeposits && balances && feeEstimate && feeToken) {
			const allSpendings = Object.fromEntries(
				tokenIds.map((tokenId) => {
					const callSpending = callSpendings[tokenId]?.plancks ?? 0n;
					if (tokenId === feeToken?.id && isBigInt(feeEstimate))
						return [tokenId, callSpending + feeEstimate];
					return [tokenId, callSpending];
				}),
			);

			for (const tokenId of tokenIds) {
				const balance =
					balances.find((b) => b.tokenId === tokenId)?.balance ?? 0n;
				const ed = existentialDeposits[tokenId] ?? 0n;
				const fee = tokenId === feeToken.id ? feeEstimate : 0n; // double the amount just in case
				const spendings = allSpendings[tokenId] ?? 0n;
				const allowDeath = callSpendings[tokenId]?.allowDeath ?? false;

				if (balance < spendings) result[tokenId] = "Insufficient balance";
				else if (balance < spendings + fee)
					result[tokenId] = "Insufficient balance to pay for fee";
				else if (!allowDeath && balance < spendings + fee + ed)
					result[tokenId] = "Insufficient balance to keep acount alive";
			}
		}

		return result;
	}, [
		call,
		balances,
		existentialDeposits,
		feeEstimate,
		feeToken,
		tokenIds,
		callSpendings,
	]);

	const error = useMemo(() => {
		return errorFeeEstimate ?? errorExistentialDeposits;
	}, [errorExistentialDeposits, errorFeeEstimate]);

	const isLoadingFeeEstimate = useMemo(
		() =>
			isLoadingFeeTokens ||
			isLoadingFeeEstimateNative ||
			isLoadingFeeEstimateConvert,
		[
			isLoadingFeeEstimateConvert,
			isLoadingFeeEstimateNative,
			isLoadingFeeTokens,
		],
	);

	const isLoading = useMemo(() => {
		return (
			isLoadingBalances ||
			isLoadingExistentialDeposits ||
			isLoadingFeeEstimate ||
			isLoadingFeeTokenBalance
		);
	}, [
		isLoadingBalances,
		isLoadingExistentialDeposits,
		isLoadingFeeEstimate,
		isLoadingFeeTokenBalance,
	]);

	const canSubmit = useMemo(() => {
		return (
			!!call &&
			!!account &&
			!!feeEstimate &&
			!!feeToken &&
			!!options &&
			!error &&
			!isLoading &&
			!Object.keys(insufficientBalances).length
		);
	}, [
		account,
		call,
		error,
		feeEstimate,
		feeToken,
		insufficientBalances,
		isLoading,
		options,
	]);

	const onFeeTokenChange = useCallback(
		(feeTokenId: TokenId) => {
			setFeeTokenId(feeTokenId);
		},
		[setFeeTokenId],
	);

	const onCloseFollowUp = useCallback(
		(reset: boolean) => {
			setFollowUpInputs(undefined);
			if (reset) onReset();
		},
		[onReset],
	);

	return {
		account,

		feeToken,
		feeTokens,
		isLoadingFeeTokens,
		onFeeTokenChange,

		feeEstimate,
		errorFeeEstimate,
		isLoadingFeeEstimate,

		feeTokenBalance,
		isLoadingFeeTokenBalance,

		insufficientBalances,
		followUpInputs,

		onSubmit,
		canSubmit,

		error,
		isLoading,

		onCloseFollowUp,
	};
};

export const [TransactionProvider, useTransaction] = provideContext(
	useTransactionProvider,
);
