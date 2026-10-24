import { getLookupFn } from "@polkadot-api/metadata-builders";
import { unifyMetadata } from "@polkadot-api/substrate-bindings";
import type { ChainId } from "../registry/chains/types";
import { logger } from "../utils/logger";
import { getMetadataV15 } from "./getMetadataV15";

const ERRORS_TRANSACTIONAL = {
	LimitReached: "The transaction nests too many operations",
	NoLayer: "The transaction is missing an operation layer",
};

const ERRORS_TOKEN = {
	FundsUnavailable: "Insufficient balance",
	OnlyProvider:
		"This would empty the account while other assets still depend on it",
	BelowMinimum:
		"The recipient would hold less than the minimum balance for this token",
	CannotCreate: "The recipient account cannot be created",
	UnknownAsset: "This token does not exist on the chain",
	Frozen: "These funds are frozen",
	Unsupported: "This token does not support the operation",
	CannotCreateHold: "The account cannot hold this amount",
	NotExpendable: "Insufficient balance to keep account alive",
	Blocked: "The recipient account cannot receive this token",
};

const ERRORS_ARITHMETIC = {
	Overflow: "The amount is too large for the chain to compute",
	Underflow: "The amount is too small for the chain to compute",
	DivisionByZero: "The chain divided by zero",
};

const ERROR_METADATA_LOOKUP = "METADATA_LOOKUP";

const DISPATCH_ERROR = {
	CannotLookup: "Cannot lookup",
	BadOrigin: "Bad origin",
	Module: ERROR_METADATA_LOOKUP,
	ConsumerRemaining: "Consumer remaining",
	NoProviders: "No providers",
	TooManyConsumers: "Too many consumers",
	Token: ERRORS_TOKEN,
	Arithmetic: ERRORS_ARITHMETIC,
	Transactional: ERRORS_TRANSACTIONAL,
	Exhausted: "Resources exhausted",
	Corruption: "State corrupt",
	Unavailable: "Resource unavailable",
	RootNotAllowed: "Root not allowed",
	Trie: "Unknown error",
	Other: "Unknown error",
};

type DispatchError = {
	type: string;
	value:
		| {
				type: string;
				value:
					| {
							type: string;
							value: undefined;
					  }
					| undefined;
		  }
		| undefined;
};

type ModuleError = {
	type: string;
	value: {
		type: string;
		value: undefined;
	};
};

const getModuleErrorMessage = async (
	chainId: ChainId,
	error: ModuleError,
): Promise<string | null> => {
	try {
		const metadata = await getMetadataV15(chainId);
		if (!metadata) throw new Error("Could not fetch metadata");

		const pallet = metadata.pallets.find((p) => p.name === error.type);
		if (typeof pallet?.errors !== "number") throw new Error("Unknown pallet");

		const lookup = getLookupFn(unifyMetadata(metadata));

		const palletErrors = lookup(pallet.errors);
		if (palletErrors.type !== "enum") throw new Error("Unknown error type");

		const docs = palletErrors.innerDocs[error.value.type];
		if (!docs?.length) throw new Error("Unknown error type");

		return docs.join(" ");
	} catch (err) {
		logger.error("Failed to parse module error", { chainId, error, err });
		return null;
	}
};

export const getDispatchErrorMessage = async (
	chainId: ChainId,
	err: unknown,
): Promise<string | null> => {
	try {
		if (!err) return null;

		const error = err as DispatchError;
		if (!error.type) throw new Error("Unknown dispatch error");

		const lv1 = DISPATCH_ERROR[error.type as keyof typeof DISPATCH_ERROR];
		if (!lv1) throw new Error("Unknown dispatch error");
		if (lv1 === ERROR_METADATA_LOOKUP)
			return await getModuleErrorMessage(chainId, error.value as ModuleError);
		if (typeof lv1 === "string") return lv1;

		const lv2 = lv1[error.value?.type as keyof typeof lv1];
		if (!lv2) throw new Error("Unknown dispatch error");
		if (typeof lv2 === "string") return lv2;

		throw new Error("Unknown dispatch error");
	} catch (cause) {
		logger.error("Failed to parse runtime error", { cause, err });
		return null;
	}
};
