export const isBigInt = <T>(value: T | bigint): value is bigint =>
  typeof value === "bigint";
