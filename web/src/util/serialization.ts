import { Binary } from "polkadot-api";

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

export const safeParse = <T = unknown>(value: string): T => {
  return JSON.parse(value, (_, value) => {
    if (typeof value === "string") {
      if (value.startsWith("bigint:")) return BigInt(value.slice(7));
      if (value.startsWith("binary:")) return Binary.fromHex(value.slice(7));
    }
    return value;
  });
};
