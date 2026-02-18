import type { SS58String } from "polkadot-api";
import type { TokenId } from "../../registry/tokens/types";
import type { LoadingStatus } from "../common";

export type Address = SS58String | `0x${string}`;

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
