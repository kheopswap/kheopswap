import type { TokenId } from "@kheopswap/registry";
import { type ChainId, getChainById } from "@kheopswap/registry";
import type { BalanceDef } from "@kheopswap/services/balances";
import {
	formatTxError,
	logger,
	notifyError,
	provideContext,
} from "@kheopswap/utils";
import { isNumber, uniq } from "lodash";
import { useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { catchError, of, shareReplay } from "rxjs";
import {
	useAssetConvertPlancks,
	useBalance,
	useBalances,
	useDryRun,
	useEstimateFee,
	useExistentialDeposits,
	useFeeToken,
	useNativeToken,
	useNonce,
	useWalletAccount,
} from "src/hooks";
import {
	addTransaction,
	appendTxEvent,
	type TransactionType,
	updateTransactionStatus,
} from "src/state/transactions";
import type { AnyTransaction } from "src/types";
import { getFeeAssetLocation, getTxOptions } from "src/util";

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
	transactionType?: TransactionType;
	onReset: () => void;
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
	transactionType = "unknown",
}: UseTransactionProviderProps) => {
	const account = useWalletAccount({ id: signer });

	const chain = useMemo(
		() => (chainId ? getChainById(chainId) : null),
		[chainId],
	);
	const nativeToken = useNativeToken({ chain });

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

			const txId = crypto.randomUUID();
			let isSubmitted = false;

			const obsTxEvents = call
				.signSubmitAndWatch(account.polkadotSigner, options)
				.pipe(
					catchError((error) => of({ type: "error" as const, error })),
					shareReplay(1),
				);

			// Add transaction to global store
			addTransaction({
				id: txId,
				createdAt: Date.now(),
				status: "pending",
				txEvents: [{ type: "pending" }],
				account,
				feeEstimate,
				feeToken,
				type: transactionType,
				followUpData: followUpData as Record<string, unknown>,
				isMinimized: false,
			});

			const sub = obsTxEvents.subscribe((x) => {
				logger.log("Transaction status update", x);

				if (x.type === "broadcasted") isSubmitted = true;

				// Append event to transaction store
				if (x.type !== "error") {
					appendTxEvent(txId, x);
				}

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
					// if not, use standard error notification and dismiss transaction
					if (!isSubmitted) {
						if (errorText) toast(errorText, { type: "error" });
						else notifyError(x.error);
						// Update status to failed and dismiss (don't show modal for pre-submission errors)
						updateTransactionStatus(txId, "failed");
					} else {
						// Transaction was submitted, show error in modal
						appendTxEvent(txId, x);
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
		transactionType,
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
	} = useDryRun({
		chainId,
		from: account?.address,
		call,
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

		// TODO add a flag to allow parent form to force another isLoading state
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
		dryRun,
	]);

	const onFeeTokenChange = useCallback(
		(feeTokenId: TokenId) => {
			setFeeTokenId(feeTokenId);
		},
		[setFeeTokenId],
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

		onSubmit,
		canSubmit,

		error,
		isLoading,

		onReset,

		dryRun,
		isLoadingDryRun,
		errorDryRun,
	};
};

export const [TransactionProvider, useTransaction] = provideContext(
	useTransactionProvider,
);
