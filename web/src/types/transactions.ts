import type { Transaction } from "polkadot-api";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type AnyTransaction = Transaction<any, any, any, any>;
