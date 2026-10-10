import { AccountId, Binary, type SS58String } from "polkadot-api";
import { parseTokenId } from "../registry/tokens/helpers";
import type { TokenId } from "../registry/tokens/types";
import type { TxEvents } from "./getErrorMessageFromTxEvents";

export type XcmDepositTarget = { tokenId: TokenId; beneficiary: SS58String };

type ChainEvent = TxEvents[number];

type Deposit = { who: SS58String; amount: bigint };

const toPublicKey = (address: SS58String) =>
	Binary.toHex(AccountId().enc(address));

const getDepositReader = (
	tokenId: TokenId,
): ((event: ChainEvent) => Deposit | null) => {
	const token = parseTokenId(tokenId);
	switch (token.type) {
		case "native":
			return ({ type, value }) =>
				type === "Balances" && value.type === "Deposit" ? value.value : null;
		case "asset":
			return ({ type, value }) =>
				type === "Assets" &&
				value.type === "Deposited" &&
				value.value.asset_id === token.assetId
					? value.value
					: null;
		case "hydration-asset":
			return ({ type, value }) =>
				type === "Tokens" &&
				value.type === "Deposited" &&
				value.value.currency_id === token.assetId
					? value.value
					: null;
		case "pool-asset":
		case "foreign-asset":
			return () => null;
	}
};

export const getXcmDepositMatcher = ({
	tokenId,
	beneficiary,
}: XcmDepositTarget): ((event: ChainEvent) => bigint) => {
	const readDeposit = getDepositReader(tokenId);
	const beneficiaryKey = toPublicKey(beneficiary);
	return (event) => {
		const deposit = readDeposit(event);
		return deposit && toPublicKey(deposit.who) === beneficiaryKey
			? deposit.amount
			: 0n;
	};
};
