import { isBigInt } from "./isBigInt";
import { isBinary } from "./isBinary";

export const safeStringify = (value: unknown) => {
	if (!value) return value?.toString() ?? "";

	return JSON.stringify(
		value,
		(_, value) =>
			isBigInt(value)
				? value.toString()
				: isBinary(value)
					? value.asHex()
					: value,
		2,
	);
};
