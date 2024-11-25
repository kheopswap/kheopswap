import type { Transaction } from "polkadot-api-test";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type AnyTransaction = Transaction<any, any, any, any>;
