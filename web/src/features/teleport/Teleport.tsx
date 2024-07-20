import { TeleportForm } from "./TeleportForm";
import { TeleportProvider } from "./TeleportProvider";
import { TeleportTransactionProvider } from "./TeleportTransactionProvider";

import { TransactionFollowUp } from "src/features/transaction/TransactionFollowUp";

export const Teleport = () => (
  <TeleportProvider>
    <TeleportTransactionProvider>
      <TeleportForm />
      <TransactionFollowUp />
    </TeleportTransactionProvider>
  </TeleportProvider>
);
