import type { SS58String } from "polkadot-api-test";

import type { TokenId } from "@kheopswap/registry";
import type { LoadingStatus } from "../common";

export type Address = SS58String; // ethereum soon

export type StoredBalance = {
	tokenId: TokenId;
	address: Address;
	balance: bigint;
};

export type BalanceId = string; // `${Address}||${TokenId}`;

export type BalanceDef = {
	address: Address;
	tokenId: TokenId;
};

export type BalanceState = {
	balance: bigint | undefined;
	status: LoadingStatus;
};

export type Balance = {
	address: Address;
	tokenId: TokenId;
} & BalanceState;
