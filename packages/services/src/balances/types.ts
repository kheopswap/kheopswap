import type { TokenId } from "@kheopswap/registry";
import type { SS58String } from "polkadot-api";
import type { LoadingStatus } from "../common";

export type Address = SS58String; // ethereum soon

export type StoredBalance = {
	tokenId: TokenId;
	address: Address;
	balance: bigint;
};

export type BalanceId = string; // `${Address}||${TokenId}`;

/** Subscription mode for balance updates */
export type BalanceSubscriptionMode = "live" | "poll";

export type BalanceDef = {
	address: Address;
	tokenId: TokenId;
	/** Subscription mode: "live" for real-time updates, "poll" for periodic updates */
	mode?: BalanceSubscriptionMode;
};

export type BalanceState = {
	balance: bigint | undefined;
	status: LoadingStatus;
};
