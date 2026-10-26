import { AccountId } from "polkadot-api";
import { getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { getAccountPublicKey, uniqByPublicKey } from "./accountPublicKey";

const publicKey = new Uint8Array(32).fill(7);
const polkadotFormat = AccountId(0).dec(publicKey);
const genericFormat = AccountId(42).dec(publicKey);
const other = AccountId(42).dec(new Uint8Array(32).fill(9));
const ethereum = getAddress("0xabcdef0123456789abcdef0123456789abcdef01");

describe("uniqByPublicKey", () => {
	it("keeps one account when two wallets expose the same key in different encodings", () => {
		expect(polkadotFormat).not.toBe(genericFormat);
		expect(
			uniqByPublicKey(
				[polkadotFormat, genericFormat, other, polkadotFormat],
				(address) => address,
			),
		).toEqual([polkadotFormat, other]);
	});

	it("keys Ethereum accounts on their lowercase address", () => {
		expect(getAccountPublicKey(ethereum)).toBe(ethereum.toLowerCase());
		expect(
			uniqByPublicKey([ethereum, ethereum.toLowerCase()], (a) => a),
		).toEqual([ethereum]);
	});
});
