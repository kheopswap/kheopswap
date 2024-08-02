import { SS58String } from "polkadot-api";

import { TokenId } from "src/config/tokens";
import { LoadingStatus } from "src/services/common";

export type Address = SS58String; // ethereum soon

export type StoredBalance = {
	tokenId: TokenId;
	address: Address;
	balance: string; // serialized bigint
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
