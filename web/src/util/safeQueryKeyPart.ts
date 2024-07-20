import { isBigInt } from "./isBigInt";

export const safeQueryKeyPart = (value: unknown) => {
  if (value === null || value === undefined) return value;

  return JSON.parse(
    JSON.stringify(value, (_, value) =>
      isBigInt(value) ? value.toString() : value,
    ),
  );
};
