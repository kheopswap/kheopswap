import { FC } from "react";

import { TokenBalancesSummaryData } from "./types";

import { Token } from "src/config/tokens";
import { cn } from "src/util";
import { Tokens } from "src/components";

export const TokenBalancesSummary: FC<
  TokenBalancesSummaryData & {
    className?: string;
    token: Token;
    stableToken: Token;
  }
> = ({
  token,
  stableToken,
  tokenPlancks,
  isLoadingStablePlancks,
  stablePlancks,
  isLoadingTokenPlancks,
  className,
}) => (
  <div
    className={cn(
      "flex flex-col items-end overflow-hidden text-right",
      className,
    )}
  >
    <div
      className={cn(
        "w-full truncate",
        isLoadingTokenPlancks && "animate-pulse",
      )}
    >
      <Tokens token={token} plancks={tokenPlancks ?? 0n} digits={2} />
    </div>
    <div
      className={cn(
        "w-full truncate text-sm text-neutral-500 ",
        isLoadingStablePlancks && "animate-pulse",
      )}
    >
      <Tokens token={stableToken} plancks={stablePlancks ?? 0n} digits={2} />
    </div>
  </div>
);
