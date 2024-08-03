import { Binary } from "polkadot-api";

export const isBinary = (value: unknown): value is Binary =>
	value instanceof Binary;
