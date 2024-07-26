import { DetailedHTMLProps, FC, InputHTMLAttributes, useMemo } from "react";

import { Shimmer } from "./Shimmer";
import { TokenSelectButton } from "./TokenSelectButton";
import { Styles } from "./styles";

import {
  Tokens,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  StablePrice,
} from "src/components";
import { Token, TokenId } from "src/config/tokens";
import { cn, isBigInt } from "src/util";

export type TokenAmountPickerProps = Partial<
  DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
>;

export const TokenAmountPicker: FC<{
  inputProps: TokenAmountPickerProps;
  tokenId: TokenId | null | undefined;
  tokens?: Token[] | undefined;
  plancks: bigint | null | undefined;
  isLoading: boolean;
  errorMessage?: string | null;
  disableTokenButton?: boolean;
  onTokenChange: (tokenId: TokenId) => void;
  balance?: bigint | null | undefined; // TODO remove optional
  isLoadingBalance?: boolean;
  onMaxClick?: () => void;
}> = ({
  inputProps,
  tokenId,
  tokens,
  isLoading,
  plancks,
  errorMessage,
  onTokenChange,
  disableTokenButton,

  balance,
  isLoadingBalance,
  onMaxClick,
}) => {
  const token = useMemo(
    () => tokens?.find((t) => t.id === tokenId),
    [tokenId, tokens],
  );

  const fiatPrefix = useMemo(() => {
    if (
      inputProps.readOnly &&
      typeof inputProps.value === "string" &&
      plancks &&
      inputProps.value.startsWith("< ")
    )
      return "< ";
    return null;
  }, [inputProps.readOnly, inputProps.value, plancks]);

  return (
    <div
      className={cn(
        Styles.field,
        "flex w-full flex-col gap-2 p-3 ",
        inputProps.readOnly && "focus-within:border-neutral-800",
      )}
    >
      <div className="flex w-full">
        <input
          {...inputProps}
          inputMode="decimal"
          placeholder="0.0"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          className={cn(
            "w-full min-w-0 grow border-none bg-transparent py-0 pr-2 text-left text-2xl font-semibold text-white placeholder:text-white/50 focus:border-none focus:outline-none focus:ring-0",
          )}
        />
        <TokenSelectButton
          className={cn(
            "shrink-0",
            disableTokenButton &&
              "border-neutral-750/50 bg-transparent disabled:opacity-100",
          )}
          tokens={tokens}
          isLoading={isLoading}
          tokenId={tokenId}
          onChange={onTokenChange}
          disabled={disableTokenButton}
        />
      </div>
      <div className="flex w-full overflow-hidden">
        <div className={cn("grow truncate", !!errorMessage && "text-error")}>
          {errorMessage ? (
            <Tooltip>
              <TooltipTrigger className={cn("text-error")}>
                {errorMessage}
              </TooltipTrigger>
              <TooltipContent>{errorMessage}</TooltipContent>
            </Tooltip>
          ) : (
            <StablePrice
              plancks={plancks}
              tokenId={tokenId}
              prefix={fiatPrefix}
              className="text-neutral-500"
            />
          )}
        </div>

        {(isLoadingBalance || isBigInt(balance)) && (
          <div className="flex shrink-0 items-center text-nowrap text-neutral-500">
            {isBigInt(balance) && token ? (
              <>
                {onMaxClick && !!balance && (
                  <button
                    type="button"
                    className={cn(
                      Styles.button,
                      "mr-2 px-1 py-0.5 text-xs",
                      "text-neutral-300",
                    )}
                    onClick={onMaxClick}
                  >
                    MAX
                  </button>
                )}
                <Tokens
                  plancks={balance}
                  token={token}
                  className={cn(isLoadingBalance && "animate-pulse")}
                />
              </>
            ) : isLoadingBalance ? (
              <Shimmer>0.000 TKN</Shimmer>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
