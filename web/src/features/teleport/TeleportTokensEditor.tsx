import { ArrowDownIcon } from "@heroicons/react/24/solid";
import { FC, useCallback, useMemo } from "react";

import { useTeleport } from "./TeleportProvider";

import { TokenAmountPicker, Styles } from "src/components";
import { useTransaction } from "src/features/transaction/TransactionProvider";
import { cn, isBigInt } from "src/util";
import { useWalletAccount, useWallets } from "src/hooks";

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

export const TeleportTokensEditor = () => {
  const {
    formData,
    tokenIn,
    plancksIn,
    tokenOut,
    plancksOut,
    amountOut,
    tokens,
    isLoadingTokens,
    balanceIn,
    balanceOut,
    isLoadingBalanceIn,
    isLoadingBalanceOut,
    onAmountInChange,
    onTokenInChange,
    onTokenOutChange,
    onSwapTokens,
    onMaxClick,
  } = useTeleport();

  const { accounts: allAccounts } = useWallets();
  const account = useWalletAccount({ id: formData.from });
  const tokenPickerAccounts = useMemo(
    () => (account ? [account] : allAccounts),
    [account, allAccounts],
  );

  const { insufficientBalances } = useTransaction();

  const inputErrorMessage = useMemo(() => {
    if (!!formData.amountIn && !isBigInt(plancksIn)) return "Invalid amount";
    return insufficientBalances[tokenIn?.id ?? ""];
  }, [formData.amountIn, insufficientBalances, plancksIn, tokenIn?.id]);

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
        plancks={plancksIn}
        tokens={tokens}
        accounts={tokenPickerAccounts}
        isLoading={isLoadingTokens}
        onTokenChange={onTokenInChange}
        errorMessage={inputErrorMessage}
        balance={balanceIn}
        isLoadingBalance={isLoadingBalanceIn}
        onMaxClick={onMaxClick}
      />
      <SwapTokensButton onClick={onSwapTokens} />
      <TokenAmountPicker
        inputProps={{
          value: plancksOut && amountOut ? `< ${amountOut}` : "",
          readOnly: true,
        }}
        tokenId={tokenOut?.id}
        plancks={plancksOut}
        tokens={tokens}
        accounts={tokenPickerAccounts}
        isLoading={isLoadingTokens}
        onTokenChange={onTokenOutChange}
        balance={balanceOut}
        isLoadingBalance={isLoadingBalanceOut}
      />
    </div>
  );
};
