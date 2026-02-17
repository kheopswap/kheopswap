import { getApi } from "@kheopswap/papi";
import type { TokenId } from "@kheopswap/registry";
import { type ChainId, getChainById } from "@kheopswap/registry";
import type { BalanceDef } from "@kheopswap/services/balances";
import {
	formatTxError,
	logger,
	notifyError,
	provideContext,
} from "@kheopswap/utils";
import { isNumber, uniq } from "lodash-es";
import type { TxEvent } from "polkadot-api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { catchError, type Observable, of, shareReplay } from "rxjs";
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
	useResolvedSubstrateAddress,
	useWalletAccount,
} from "src/hooks";
import {
	addTransaction,
	appendTxEvent,
	openTransactionModal,
	type TransactionType,
	updateTransactionStatus,
} from "src/state/transactions";
import type { AnyTransaction } from "src/types";
import { getFeeAssetLocation, getTxOptions } from "src/util";
import { toHex } from "viem";
import {
	createEthereumTxObservable,
	type EthereumWalletClient,
} from "./createEthereumTxObservable";

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
	transactionTitle?: string;
	onReset: () => void;
};

const DEFAULT_CALL_SPENDINGS: CallSpendings = {};
const DEFAULT_FOLLOW_UP_DATA = {};

/**
 * Subscribes to a transaction Observable and feeds events to the transaction store.
 * Used by both Polkadot and Ethereum transaction flows.
 */
const subscribeTxEvents = (
	txId: string,
	txEvents$: Observable<TxEvent>,
): void => {
	let isSubmitted = false;

	const obs$ = txEvents$.pipe(
		catchError((error) => of({ type: "error" as const, error })),
		shareReplay(1),
	);

	const sub = obs$.subscribe((x) => {
		logger.log("Transaction status update", x);

		if (x.type === "broadcasted") isSubmitted = true;

		if (x.type !== "error") {
			appendTxEvent(txId, x);
		}

		if (x.type === "finalized") sub.unsubscribe();

		if (x.type === "error") {
			logger.error("Transaction error", x.error);
			const err = x.error;
			const hasNestedError =
				typeof err === "object" && err !== null && "error" in err;
			const errorMessage = hasNestedError
				? formatTxError((err as { error: unknown }).error)
				: "";
			const errorType = err instanceof Error ? err.name : "Error";
			const errorText = errorMessage ? `${errorType}: ${errorMessage}` : null;

			if (errorMessage === "Unknown: CannotLookup")
				console.warn(
					"It could be that the chain doesn't support CheckMetadataHash",
				);

			if (!isSubmitted) {
				if (errorText) toast(errorText, { type: "error" });
				else notifyError(x.error);
				updateTransactionStatus(txId, "failed");
			} else {
				appendTxEvent(txId, x);
			}

			sub.unsubscribe();
		}
	});
};

const useTransactionProvider = ({
	call,
	fakeCall,
	signer,
	chainId,
	callSpendings = DEFAULT_CALL_SPENDINGS,
	onReset,
	followUpData = DEFAULT_FOLLOW_UP_DATA,
	transactionType = "unknown",
	transactionTitle = "Transaction",
}: UseTransactionProviderProps) => {
	const account = useWalletAccount({ id: signer });
	const [isSwitchingEthereumNetwork, setIsSwitchingEthereumNetwork] =
		useState(false);
	const [connectedEvmChainId, setConnectedEvmChainId] = useState<
		number | undefined
	>(undefined);

	const chain = useMemo(
		() => (chainId ? getChainById(chainId) : null),
		[chainId],
	);

	const isEthereumAccount = account?.platform === "ethereum";
	const {
		resolvedAddress: signerSubstrateAddress,
		isLoading: isResolvingSigner,
	} = useResolvedSubstrateAddress({
		address: account?.address,
		chainId,
	});

	const targetEvmChainId = chain?.evmChainId;

	const refreshConnectedEvmChainId = useCallback(async () => {
		if (account?.platform !== "ethereum") {
			setConnectedEvmChainId(undefined);
			return;
		}

		try {
			const chainId = await account.client.getChainId();
			setConnectedEvmChainId(chainId);
		} catch {
			setConnectedEvmChainId(undefined);
		}
	}, [account]);

	useEffect(() => {
		if (account?.platform !== "ethereum") {
			setConnectedEvmChainId(undefined);
			return;
		}

		void refreshConnectedEvmChainId();
	}, [account, refreshConnectedEvmChainId]);

	const isEthereumNetworkMismatch = useMemo(() => {
		if (!isEthereumAccount) return false;
		if (!targetEvmChainId || !connectedEvmChainId) return false;
		return targetEvmChainId !== connectedEvmChainId;
	}, [connectedEvmChainId, isEthereumAccount, targetEvmChainId]);
	const nativeToken = useNativeToken({ chain });

	const onSwitchEthereumNetwork = useCallback(async () => {
		if (!isEthereumAccount || !targetEvmChainId) return;

		try {
			setIsSwitchingEthereumNetwork(true);
			await account.client.switchChain({ id: targetEvmChainId });
			await refreshConnectedEvmChainId();
		} catch {
			try {
				await (
					account.client as unknown as {
						request: (...args: unknown[]) => Promise<unknown>;
					}
				).request({
					method: "wallet_addEthereumChain",
					params: [
						{
							chainId: `0x${targetEvmChainId.toString(16)}`,
							chainName: chain?.name ?? `Chain ${targetEvmChainId}`,
							rpcUrls: chain?.evmRpcUrl ?? [],
							blockExplorerUrls: chain?.evmBlockExplorers ?? [],
							nativeCurrency: {
								name: nativeToken?.symbol ?? "Native Token",
								symbol: nativeToken?.symbol ?? "UNIT",
								decimals: Number(nativeToken?.decimals ?? 12),
							},
						},
					],
				});

				await account.client.switchChain({ id: targetEvmChainId });
				await refreshConnectedEvmChainId();
			} catch (error) {
				notifyError(error);
			}
		} finally {
			setIsSwitchingEthereumNetwork(false);
		}
	}, [
		account,
		chain?.evmBlockExplorers,
		chain?.evmRpcUrl,
		chain?.name,
		isEthereumAccount,
		nativeToken?.decimals,
		nativeToken?.symbol,
		refreshConnectedEvmChainId,
		targetEvmChainId,
	]);

	const { data: nonce } = useNonce({
		account: signerSubstrateAddress,
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
		from: signerSubstrateAddress,
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

	const onSubmit = useCallback(async () => {
		try {
			logger.log("submit", { call });

			if (!call || !account) return;

			const txFeeToken = feeToken ?? nativeToken;
			if (!txFeeToken) return;

			const txId = crypto.randomUUID();

			addTransaction({
				id: txId,
				createdAt: Date.now(),
				status: "pending",
				txEvents: [{ type: "pending" }],
				account,
				feeEstimate: feeEstimate ?? 0n,
				feeToken: txFeeToken,
				type: transactionType,
				title: transactionTitle,
				followUpData: followUpData as Record<string, unknown>,
			});

			openTransactionModal(txId);

			let txEvents$: Observable<TxEvent>;

			if (account.platform === "ethereum") {
				if (isEthereumNetworkMismatch) {
					updateTransactionStatus(txId, "failed");
					notifyError(
						`Wrong network selected. Expected chain ID ${targetEvmChainId}.`,
					);
					return;
				}

				const encodedCallData = await call.getEncodedData();
				const callData = toHex(encodedCallData.asBytes());

				txEvents$ = createEthereumTxObservable({
					walletClient: account.client as unknown as EthereumWalletClient,
					from: account.address,
					callData,
					chainId: chainId as ChainId,
					getClient: async () => (await getApi(chainId as ChainId)).client,
				});
			} else {
				if (!feeEstimate || !options) return;
				txEvents$ = call.signSubmitAndWatch(account.polkadotSigner, options);
			}

			subscribeTxEvents(txId, txEvents$);
		} catch (err) {
			notifyError(err);
		}
	}, [
		account,
		call,
		chainId,
		feeEstimate,
		feeToken,
		followUpData,
		isEthereumNetworkMismatch,
		nativeToken,
		options,
		targetEvmChainId,
		transactionType,
		transactionTitle,
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
		from: signerSubstrateAddress,
		call,
	});

	const isLoading = useMemo(() => {
		return (
			isResolvingSigner ||
			isLoadingBalances ||
			isLoadingExistentialDeposits ||
			isLoadingFeeEstimate ||
			isLoadingFeeTokenBalance ||
			isLoadingDryRun
		);
	}, [
		isResolvingSigner,
		isLoadingBalances,
		isLoadingExistentialDeposits,
		isLoadingFeeEstimate,
		isLoadingFeeTokenBalance,
		isLoadingDryRun,
	]);

	const canSubmit = useMemo(() => {
		if (account?.platform === "ethereum") {
			return (
				!!call &&
				!!account &&
				!isEthereumNetworkMismatch &&
				!isSwitchingEthereumNetwork &&
				!Object.keys(insufficientBalances).length
			);
		}

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
		isEthereumNetworkMismatch,
		isSwitchingEthereumNetwork,
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
		isEthereumNetworkMismatch,
		targetEvmChainId,
		connectedEvmChainId,
		onSwitchEthereumNetwork,
		isSwitchingEthereumNetwork,

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
