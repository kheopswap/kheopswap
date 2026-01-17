import type { Transaction } from "polkadot-api";

// biome-ignore lint/suspicious/noExplicitAny: this is the way
export type AnyTransaction = Transaction<any, any, any, any>;
