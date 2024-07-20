import type { Binary } from "polkadot-api";

export const isBinary = (value: unknown): value is Binary =>
  typeof value === "object" &&
  !!(value as Binary).asText &&
  !!(value as Binary).asHex &&
  !!(value as Binary).asBytes;
