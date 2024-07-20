import { ArrowDownIcon } from "@heroicons/react/24/solid";
import { FC, useCallback, useMemo } from "react";

import { useSwap } from "./SwapProvider";

import { TokenAmountPicker, Styles } from "src/components";
import { useTransaction } from "src/features/transaction/TransactionProvider";
import { cn, isBigInt } from "src/util";

const SwapTokensButton: FC<{ onClick: () => void; className?: string }> = ({
  onClick,
  className,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      Styles.button,
      "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2  p-2",
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
    tokens,
    isLoadingTokens,
    outputErrorMessage,

    balanceIn,
    balanceOut,
    isLoadingBalanceIn,
    isLoadingBalanceOut,

    onAmountInChange,
    onTokenInChange,
    onTokenOutChange,
    onSwapTokens,
    onMaxClick,
  } = useSwap();

  const { insufficientBalances } = useTransaction();

  const inputErrorMessage = useMemo(() => {
    if (!!formData.amountIn && !isBigInt(totalIn)) return "Invalid amount";
    return insufficientBalances[tokenIn?.id ?? ""];
  }, [formData.amountIn, insufficientBalances, totalIn, tokenIn?.id]);

  const handleAmountInChange: React.ChangeEventHandler<HTMLInputElement> =
    useCallback(
      (e) => {
        onAmountInChange(e.target.value);
      },
      [onAmountInChange],
    );

  return (
    <div className="relative flex flex-col gap-2">
      <TokenAmountPicker
        inputProps={{
          value: formData.amountIn,
          onChange: handleAmountInChange,
        }}
        tokenId={tokenIn?.id}
        plancks={totalIn}
        tokens={tokens}
        isLoading={isLoadingTokens}
        onTokenChange={onTokenInChange}
        errorMessage={inputErrorMessage}
        balance={balanceIn}
        isLoadingBalance={isLoadingBalanceIn}
        onMaxClick={onMaxClick}
      />
      <SwapTokensButton onClick={onSwapTokens} />
      <TokenAmountPicker
        inputProps={{ value: amountOut, readOnly: true }}
        tokenId={tokenOut?.id}
        plancks={swapPlancksOut}
        tokens={tokens}
        isLoading={isLoadingTokens}
        onTokenChange={onTokenOutChange}
        errorMessage={outputErrorMessage}
        balance={balanceOut}
        isLoadingBalance={isLoadingBalanceOut}
      />
    </div>
  );
};
