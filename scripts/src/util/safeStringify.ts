import { isBigInt } from "./isBigInt";
import { isBinary } from "./isBinary";

export const safeStringify = (value: unknown, format?: boolean) => {
	if (!value) return value?.toString() ?? "";

	return JSON.stringify(
		value,
		(_, value) =>
			isBigInt(value)
				? `bigint:${value.toString()}`
				: isBinary(value)
					? `binary:${value.asHex()}`
					: value,
		format ? 2 : undefined,
	);
};
