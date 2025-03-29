import { safeStringify } from "./serialization";

export const safeQueryKeyPart = (value: unknown) => {
	if (value === null) return "<null>";
	if (value === undefined) return "<undefined>";

	return safeStringify(value);
};
