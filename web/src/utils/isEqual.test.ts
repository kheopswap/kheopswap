import { isEqual } from "es-toolkit";
import { Binary } from "polkadot-api";
import { describe, expect, it } from "vitest";
import { ksmKusamaToPolkadot } from "../features/swap/routes/xcm/xcmBridge.fixtures";
import { safeParse, safeStringify } from "./serialization";

const balance = {
	address: "15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5",
	tokenId: "native::pah",
	balance: 1234567890123n,
	key: Binary.fromHex("0x1234abcd"),
};

describe("isEqual on chain values", () => {
	it("treats copies as equal", () => {
		expect(isEqual(balance, safeParse(safeStringify(balance)))).toBe(true);
		expect(
			isEqual(ksmKusamaToPolkadot, structuredClone(ksmKusamaToPolkadot)),
		).toBe(true);
	});

	it("compares binaries byte by byte", () => {
		expect(
			isEqual(balance, { ...balance, key: Binary.fromHex("0x1234abce") }),
		).toBe(false);
		expect(
			isEqual(balance, { ...balance, key: [0x12, 0x34, 0xab, 0xcd] }),
		).toBe(false);
	});

	it("compares bigints by value and type", () => {
		expect(isEqual(balance, { ...balance, balance: 1234567890124n })).toBe(
			false,
		);
		expect(isEqual({ amount: 1n }, { amount: 1 })).toBe(false);
	});

	it("tells a missing key from an undefined one", () => {
		expect(
			isEqual({ status: "loaded" }, { status: "loaded", data: undefined }),
		).toBe(false);
	});
});
