import { FC, PropsWithChildren, useMemo } from "react";

import { useTeleport } from "./TeleportProvider";

import {
  CallSpendings,
  TransactionProvider,
} from "src/features/transaction/TransactionProvider";

export const TeleportTransactionProvider: FC<PropsWithChildren> = ({
  children,
}) => {
  const { call, fakeCall, formData, tokenIn, plancksIn, onReset } =
    useTeleport();

  const callSpendings = useMemo<CallSpendings>(
    () =>
      tokenIn && !!plancksIn
        ? {
            [tokenIn.id]: { plancks: plancksIn, allowDeath: false },
          }
        : {},
    [plancksIn, tokenIn],
  );

  return (
    <TransactionProvider
      call={call}
      fakeCall={fakeCall}
      callSpendings={callSpendings}
      chainId={tokenIn?.chainId}
      signer={formData.from}
      onReset={onReset}
    >
      {children}
    </TransactionProvider>
  );
};
