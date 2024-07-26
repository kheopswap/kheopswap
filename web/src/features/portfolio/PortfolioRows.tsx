import { useAutoAnimate } from "@formkit/auto-animate/react";
import { FC, useCallback } from "react";

import { PortfolioRowData, PortfolioVisibleColunm } from "./types";
import { PortfolioRow } from "./PortfolioRow";

import { Shimmer } from "src/components";
import { cn } from "src/util";
import { TokenId } from "src/config/tokens";

export const PortfolioRows: FC<{
  rows: PortfolioRowData[];
  visibleCol: PortfolioVisibleColunm;
  isLoading: boolean;
  onTokenSelect: (tokenId: TokenId) => void;
}> = ({ rows, visibleCol, isLoading, onTokenSelect }) => {
  const [parent] = useAutoAnimate();

  const handleRowClick = useCallback(
    (tokenId: TokenId) => () => {
      onTokenSelect(tokenId);
    },
    [onTokenSelect],
  );

  return (
    <div ref={parent} className="flex flex-col gap-2">
      {rows.map(({ token, balance, stableToken, tvl }) => (
        <PortfolioRow
          key={token.id}
          token={token}
          visibleCol={visibleCol}
          balance={balance}
          stableToken={stableToken}
          tvl={tvl}
          onClick={handleRowClick(token.id)}
        />
      ))}
      <div
        className={cn(
          "flex h-16 w-full items-center gap-2 rounded-md border  border-neutral-800 bg-primary-950/50 px-4",
          isLoading || !rows.length ? "visible" : "invisible",
        )}
      >
        {isLoading ? (
          <>
            <Shimmer className="size-10 rounded-full"></Shimmer>
            <div className="flex grow flex-col items-start gap-1 overflow-hidden text-xs">
              <Shimmer className="">TOKEN</Shimmer>
              <Shimmer className="">Polkadot Network</Shimmer>
            </div>
          </>
        ) : (
          <div className="text-base font-light text-neutral-400">
            No tokens match your search
          </div>
        )}
      </div>
    </div>
  );
};
