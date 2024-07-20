import { FC, useMemo } from "react";

import { Tokens, FollowUpData } from "src/components";
import { Token } from "src/config/tokens";
import { TransactionFollowUp } from "src/features/transaction/TransactionFollowUp";
import { useTransactionFollowUp } from "src/features/transaction/TransactionFollowUpProvider";
import { TxEvents, cn, isBigInt } from "src/util";

type SwapFollowUpData = FollowUpData<{
  swapPlancksOut: bigint;
  minPlancksOut: bigint;
  slippage: number;
  tokenOut: Token;
}>;

const OutcomeFollowUpInner: FC<{
  followUp: SwapFollowUpData;
}> = ({ followUp }) => {
  const individualEvents = useMemo<TxEvents>(
    () =>
      followUp.txEvents.flatMap(
        (e) =>
          (e.type === "finalized" && e.events) ||
          (e.type === "txBestBlocksState" && e.found && e.events) ||
          [],
      ),
    [followUp.txEvents],
  );

  const effectiveOutcome = useMemo(() => {
    const amountOut = individualEvents.find(
      (e) => e.type === "AssetConversion" && e.value.type === "SwapExecuted",
    )?.value.value.amount_out;
    return amountOut ? BigInt(amountOut) : null;
  }, [individualEvents]);

  const effectiveSlippage = useMemo(() => {
    if (!isBigInt(effectiveOutcome)) return null;
    return (
      Number(
        (10000n * (followUp.swapPlancksOut - effectiveOutcome)) /
          followUp.swapPlancksOut,
      ) / 100
    );
  }, [effectiveOutcome, followUp.swapPlancksOut]);

  return (
    <div className={cn(effectiveOutcome ? "block" : "hidden")}>
      <div className="flex flex-wrap justify-between">
        <div className="text-neutral-500">Estimated outcome</div>
        <div className="text-right font-medium text-neutral-500">
          <Tokens plancks={followUp.swapPlancksOut} token={followUp.tokenOut} />
        </div>
      </div>
      <div className="flex flex-wrap justify-between">
        <div className="text-neutral-500">Effective outcome</div>
        <div className="text-right font-medium">
          {isBigInt(effectiveOutcome) && (
            <Tokens
              plancks={effectiveOutcome}
              token={followUp.tokenOut}
              className={cn(
                effectiveOutcome >= followUp.swapPlancksOut
                  ? "text-success"
                  : "text-warn",
              )}
            />
          )}
        </div>
      </div>
      <div className="flex flex-wrap justify-between">
        <div className="text-neutral-500">Effective slippage</div>
        {isBigInt(effectiveOutcome) && (
          <div
            className={cn(
              "text-right font-medium",
              effectiveOutcome >= followUp.swapPlancksOut
                ? "text-success"
                : "text-warn",
            )}
          >
            {typeof effectiveSlippage === "number"
              ? `${effectiveSlippage?.toFixed(2)}%`
              : null}
          </div>
        )}
      </div>
    </div>
  );
};

const OutcomeFollowUp: FC = () => {
  const { followUp } = useTransactionFollowUp();

  if (!followUp) return null;

  return <OutcomeFollowUpInner followUp={followUp as SwapFollowUpData} />;
};

export const SwapFollowUp: FC = () => {
  return (
    <TransactionFollowUp>
      <OutcomeFollowUp />
    </TransactionFollowUp>
  );
};
