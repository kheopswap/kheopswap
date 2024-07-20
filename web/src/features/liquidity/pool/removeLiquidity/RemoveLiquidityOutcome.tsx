import { FC } from "react";

import { Tokens, TokenLogo, Styles } from "src/components";
import { TokenId } from "src/config/tokens";
import { useToken } from "src/hooks";
import { cn } from "src/util";

const AssetRow = ({
  tokenId,
  plancks,
}: {
  tokenId: TokenId;
  plancks: bigint;
}) => {
  const { data: token } = useToken({ tokenId });

  return (
    <div className="flex w-full justify-between text-xl text-neutral-200">
      <div className=" flex grow items-center gap-2">
        <TokenLogo token={tokenId} className="inline-block size-5" />
        <div className="">{token?.symbol}</div>
      </div>
      <div>
        {token && <Tokens plancks={plancks} token={token} showSymbol={false} />}
      </div>
    </div>
  );
};

export const RemoveLiquidityOutcome: FC<{
  tokenId1: TokenId;
  tokenId2: TokenId;
  plancks1: bigint;
  plancks2: bigint;
}> = ({ tokenId1, tokenId2, plancks1, plancks2 }) => {
  // TODO opacity 50 and disabled if no liquidity
  return (
    <div className={cn(Styles.field, "flex w-full flex-col gap-1 border p-3 ")}>
      <AssetRow tokenId={tokenId1} plancks={plancks1} />
      <AssetRow tokenId={tokenId2} plancks={plancks2} />
    </div>
  );
};
