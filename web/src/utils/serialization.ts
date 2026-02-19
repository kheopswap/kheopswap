import { Binary } from "polkadot-api";

import { isBigInt } from "./isBigInt.ts";

export const safeJsonReplacer = (_key: string, value: unknown) =>
	isBigInt(value)
		? `bigint:${value.toString()}`
		: value instanceof Uint8Array
			? `binary:${Binary.toHex(value)}`
			: value;

export const safeStringify = (value: unknown, format?: boolean) => {
	if (!value) return value?.toString() ?? "";

	return JSON.stringify(value, safeJsonReplacer, format ? 2 : undefined);
};

export const safeParse = <T = unknown>(value: string): T => {
	return JSON.parse(value, (_, value) => {
		if (typeof value === "string") {
			if (value.startsWith("bigint:")) return BigInt(value.slice(7));
			if (value.startsWith("binary:")) return Binary.fromHex(value.slice(7));
		}
		return value;
	});
};
