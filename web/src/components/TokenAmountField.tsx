import {
  DetailedHTMLProps,
  InputHTMLAttributes,
  forwardRef,
  useMemo,
} from "react";

import { TokenId } from "src/config/tokens";
import { useToken } from "src/hooks";
import { cn } from "src/util";

export const TokenAmountField = forwardRef<
  HTMLInputElement,
  DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & {
    tokenId?: TokenId;
  }
>(({ tokenId, className, ...props }, ref) => {
  const { data: token } = useToken({ tokenId });

  const disabled = useMemo(
    () => props.disabled || !token,
    [props.disabled, token],
  );

  return (
    <div
      className={cn(
        "flex h-[42px] w-full items-center rounded-sm border border-neutral-500 bg-neutral-900 outline-1 focus-within:outline ",
        className,
        disabled && "opacity-50",
      )}
    >
      <input
        ref={ref}
        {...props}
        inputMode="decimal"
        placeholder={token ? "0" : undefined}
        autoComplete="off"
        className="grow bg-transparent text-right outline-none"
        disabled={disabled}
      />
      {token && <div className="mx-4">{token.symbol}</div>}
    </div>
  );
});
TokenAmountField.displayName = "TokenAmountField";
