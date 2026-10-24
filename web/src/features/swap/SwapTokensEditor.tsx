import { ArrowDownIcon } from "@heroicons/react/24/solid";
import { type FC, type FormEventHandler, useCallback, useMemo } from "react";
import { useWallets } from "../../common/kheopskit";
import { TokenAmountPicker } from "../../components/TokenAmountPicker";
import { useWalletAccount } from "../../hooks/useWalletAccount";
import { getMaxSwapAmount } from "../../utils/ammMath";
import { cn } from "../../utils/cn";
import { isBigInt } from "../../utils/isBigInt";
import { plancksToTokens } from "../../utils/plancks";
import { useTransaction } from "../transaction/TransactionProvider";
import { formatAmountOut } from "./formatAmountOut";
import { useSwap } from "./SwapProvider";

const SwapTokensButton: FC<{ onClick: () => void; className?: string }> = ({
	onClick,
	className,
}) => (
	<button
		type="button"
		onClick={onClick}
		aria-label="Swap token direction"
		className={cn(
			"absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-control border-4 border-page bg-surface-2 text-accent ring-1 ring-grid/35",
			className,
		)}
	>
		<ArrowDownIcon className="size-4" />
	</button>
);

export const SwapTokensEditor = () => {
	const {
		formData,

		totalIn,
		tokenIn,
		tokenOut,
		swapPlancksOut,
		amountOut,
		tokensIn,
		tokensOut,
		isLoadingTokens,
		outputErrorMessage,

		balanceIn,
		edTokenIn,
		deliveryFee,
		balanceOut,
		hasInsufficientBalance,
		isLoadingBalanceIn,
		isLoadingBalanceOut,
		isLoadingAmountOut,

		onAmountInChange,
		onTokenInChange,
		onTokenOutChange,
		onSwapTokens,
		canFlip,
	} = useSwap();

	const { insufficientBalances, feeToken, feeEstimate } = useTransaction();

	const handleMaxClick = useCallback(() => {
		if (
			!tokenIn ||
			!feeToken ||
			!balanceIn ||
			!isBigInt(edTokenIn) ||
			!isBigInt(feeEstimate)
		)
			return;
		const plancks = getMaxSwapAmount({
			balance: balanceIn,
			tokenIn,
			existentialDeposit: edTokenIn,
			fee: { tokenId: feeToken.id, plancks: feeEstimate },
			deliveryFee,
		});
		onAmountInChange(plancksToTokens(plancks, tokenIn.decimals));
	}, [
		tokenIn,
		feeToken,
		balanceIn,
		edTokenIn,
		feeEstimate,
		deliveryFee,
		onAmountInChange,
	]);

	const inputErrorMessage = useMemo(() => {
		if (formData.amountIn && !isBigInt(totalIn)) return "Invalid amount";
		return (
			insufficientBalances[tokenIn?.id ?? ""] ??
			(hasInsufficientBalance ? "Insufficient balance" : undefined)
		);
	}, [
		formData.amountIn,
		insufficientBalances,
		totalIn,
		tokenIn?.id,
		hasInsufficientBalance,
	]);

	const { accounts: allAccounts } = useWallets();
	const account = useWalletAccount({ id: formData.from });
	const tokenPickerAccounts = useMemo(
		() =>
			(account
				? [account.address]
				: allAccounts.map((item) => item.address)) as string[],
		[account, allAccounts],
	);

	const handleAmountInInput: FormEventHandler<HTMLInputElement> = useCallback(
		(e) => {
			onAmountInChange(e.currentTarget.value);
		},
		[onAmountInChange],
	);

	return (
		<div className="relative flex flex-col gap-1.5">
			<TokenAmountPicker
				inputProps={{
					value: formData.amountIn,
					onInput: handleAmountInInput,
				}}
				tokenId={tokenIn?.id}
				plancks={totalIn}
				tokens={tokensIn}
				accounts={tokenPickerAccounts}
				isLoading={isLoadingTokens}
				onTokenChange={onTokenInChange}
				errorMessage={inputErrorMessage}
				balance={balanceIn}
				isLoadingBalance={isLoadingBalanceIn}
				onMaxClick={handleMaxClick}
				inputLabel="Amount to swap"
			/>
			{canFlip && <SwapTokensButton onClick={onSwapTokens} />}
			<TokenAmountPicker
				inputProps={{
					value: formatAmountOut(amountOut),
					title: amountOut,
					readOnly: true,
				}}
				tokenId={tokenOut?.id}
				plancks={swapPlancksOut}
				tokens={tokensOut}
				accounts={tokenPickerAccounts}
				isLoading={isLoadingTokens}
				onTokenChange={onTokenOutChange}
				errorMessage={outputErrorMessage}
				balance={balanceOut}
				isLoadingBalance={isLoadingBalanceOut}
				isComputingValue={isLoadingAmountOut}
				inputLabel="Amount to receive"
			/>
		</div>
	);
};
