import { Binary } from "polkadot-api-test";

export const isBinary = (value: unknown): value is Binary =>
	value instanceof Binary;
