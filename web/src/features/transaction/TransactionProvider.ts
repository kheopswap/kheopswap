import { isNumber, uniq } from "lodash";
import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { type Observable, catchError, of, shareReplay } from "rxjs";

import { type ChainId, getChainById } from "@kheopswap/registry";
import type { Token, TokenId } from "@kheopswap/registry";
import type { BalanceDef } from "@kheopswap/services/balances";
import {
	type TxEvents,
	formatTxError,
	logger,
	notifyError,
	provideContext,
} from "@kheopswap/utils";
import type { FollowUpTxEvent } from "src/components";
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
	useXcmDryRun,
} from "src/hooks";
import { useDryRunCall } from "src/state/dryRunCall";
import type { AnyTransaction } from "src/types";
import {
	getDestinationChain,
	getFeeAssetLocation,
	getTxOptions,
	getXcmMessageFromDryRun,
} from "src/util";

export type ExpectedEventResult<T = unknown> = {
	label: string;
	tokenId: TokenId;
	plancks: bigint;
	getEffectiveValue: (events: TxEvents) => T | null;
	component?: string;
};

export type CallSpendings = Partial<
	Record<TokenId, { plancks: bigint; allowDeath: boolean }>
>;

type UseTransactionProviderProps = {
	call: AnyTransaction | null | undefined;
	fakeCall: AnyTransaction | null | undefined; // used as backup for calculating fees without all the inputs
	signer: string | null | undefined; // accountkey
	chainId: ChainId | null | undefined;
	callSpendings?: CallSpendings; // tokens to be spent as part of the call
	followUpData?: object;
	expectedEventResults?: ExpectedEventResult[];
	onReset: () => void;
};

type FollowUpInputs = {
	call: AnyTransaction | null | undefined;
	obsTxEvents: Observable<FollowUpTxEvent>;
	account: InjectedAccount;
	feeEstimate: bigint;
	feeToken: Token;
	expectedEventResults: ExpectedEventResult[];
};

const DEFAULT_CALL_SPENDINGS: CallSpendings = {};
const DEFAULT_FOLLOW_UP_DATA = {};
const DEFAULT_EXPECTED_EVENT_RESULTS: ExpectedEventResult[] = [];

const useTransactionProvider = ({
	call,
	fakeCall,
	signer,
	chainId,
	callSpendings = DEFAULT_CALL_SPENDINGS,
	onReset,
	followUpData = DEFAULT_FOLLOW_UP_DATA,
	expectedEventResults = DEFAULT_EXPECTED_EVENT_RESULTS,
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
				expectedEventResults,
			});

			const sub = obsTxEvents.subscribe((x) => {
				logger.log("[tx event]", x);

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
	}, [
		account,
		call,
		feeEstimate,
		feeToken,
		followUpData,
		options,
		expectedEventResults,
	]);

	const tokenIds = useMemo(() => {
		const allTokenIds = Object.keys(callSpendings)
			.concat(feeToken?.id ?? "")
			.filter(Boolean) as TokenId[];
		return uniq(allTokenIds);
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
					return [tokenId, callSpending];
				}),
			);

			for (const tokenId of tokenIds) {
				const balance =
					balances.find((b) => b.tokenId === tokenId)?.balance ?? 0n;
				const ed = existentialDeposits[tokenId] ?? 0n;
				const fee = tokenId === feeToken.id ? feeEstimate : 0n;
				const spendings = allSpendings[tokenId] ?? 0n;
				const allowDeath = callSpendings[tokenId]?.allowDeath ?? false;

				if (balance < spendings) result[tokenId] = "Insufficient balance";
				else if (balance < spendings + fee)
					result[tokenId] = "Insufficient balance to pay for fee";
				else if (!allowDeath && balance < spendings + fee + ed)
					result[tokenId] = "Insufficient balance to keep account alive";
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

	const {
		data: dryRun,
		isLoading: isLoadingDryRun,
		error: errorDryRun,
	} = useDryRunCall(chainId, account?.address, call?.decodedCall);

	const [destChainId, xcm] = useMemo(() => {
		if (!dryRun || !chainId) return [null, null];
		const xcm = getXcmMessageFromDryRun(dryRun);
		if (!xcm) return [null, null];
		const destinationChain = getDestinationChain(chainId, xcm.destination);
		if (!destinationChain) return [null, null];

		return [destinationChain.id, xcm];
	}, [dryRun, chainId]);

	const {
		data: xcmDryRun,
		isLoading: isLoadingXcmDryRun,
		error: errorXcmDryRun,
	} = useXcmDryRun({
		chainId: destChainId,
		originChainId: chainId,
		xcm,
	});

	const isLoading = useMemo(() => {
		return (
			isLoadingBalances ||
			isLoadingExistentialDeposits ||
			isLoadingFeeEstimate ||
			isLoadingFeeTokenBalance ||
			isLoadingDryRun
		);
	}, [
		isLoadingBalances,
		isLoadingExistentialDeposits,
		isLoadingFeeEstimate,
		isLoadingFeeTokenBalance,
		isLoadingDryRun,
	]);

	const canSubmit = useMemo(() => {
		// if available and there is no specific fee asset, dryRun is the truth
		if (!options?.asset && dryRun?.success)
			return dryRun.value.execution_result.success;

		const ok =
			!!call &&
			!!account &&
			!!feeEstimate &&
			!!feeToken &&
			!!options &&
			!error &&
			!isLoading &&
			!Object.keys(insufficientBalances).length;

		return ok;
	}, [
		account,
		call,
		error,
		feeEstimate,
		feeToken,
		insufficientBalances,
		isLoading,
		options,
		dryRun,
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
		chainId,
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

		dryRun,
		isLoadingDryRun,
		errorDryRun,

		xcmDryRun,
		isLoadingXcmDryRun,
		errorXcmDryRun,

		call,
	};
};

export const [TransactionProvider, useTransaction] = provideContext(
	useTransactionProvider,
);
