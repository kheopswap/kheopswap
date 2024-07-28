import { FC } from "react";

import { Token } from "src/config/tokens";
import { cn, isBigInt } from "src/util";
import { Shimmer, Tokens } from "src/components";
import { BalanceWithStableSummary } from "src/types";

export const TokenBalancesSummary: FC<
  BalanceWithStableSummary & {
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
  isInitializing,
}) => {
  if (!isInitializing && !tokenPlancks) return null;

  if (isInitializing)
    return (
      <div
        className={cn(
          "flex size-full flex-col items-end justify-center gap-1 overflow-hidden",
        )}
      >
        <div>
          <Shimmer className="h-5 overflow-hidden">0.0001 TKN</Shimmer>
        </div>
        <div>
          <Shimmer className="h-4 overflow-hidden text-sm">0.00 USDC</Shimmer>
        </div>
      </div>
    );

  return (
    <div className="flex size-full flex-col items-end justify-center overflow-hidden">
      <div className={cn("truncate", isLoadingTokenPlancks && "animate-pulse")}>
        <Tokens token={token} plancks={tokenPlancks ?? 0n} />
      </div>
      <div
        className={cn(
          "truncate text-sm text-neutral-500 ",
          isLoadingStablePlancks && "animate-pulse",
        )}
      >
        <Tokens
          token={stableToken}
          plancks={stablePlancks ?? 0n}
          digits={2}
          className={cn(
            !isBigInt(stablePlancks) && "invisible",
            token.id === stableToken.id && "invisible",
          )}
        />
      </div>
    </div>
  );
};
