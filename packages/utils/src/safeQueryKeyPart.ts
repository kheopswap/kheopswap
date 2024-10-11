import { safeStringify } from "./serialization";

export const safeQueryKeyPart = (value: unknown) => {
	if (value === null || value === undefined) return value;

	return safeStringify(value);
};
