import type { ChainId } from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";
import { getLookupFn } from "@polkadot-api/metadata-builders";
import { getMetadataV15 } from "./getMetadataV15";

const ERRORS_TRANSACTIONAL = {
	LimitReached: "Too many transactional layers have been spawned",
	NoLayer: "A transactional layer was expected, but does not exist",
};

const ERRORS_TOKEN = {
	FundsUnavailable: "Funds are unavailable",
	OnlyProvider: "Account that must exist would die",
	BelowMinimum: "Account cannot exist with the funds that would be given",
	CannotCreate: "Account cannot be created",
	UnknownAsset: "The asset in question is unknown",
	Frozen: "Funds exist but are frozen",
	Unsupported: "Operation is not supported by the asset",
	CannotCreateHold: "Account cannot be created for recording amount on hold",
	NotExpendable: "Account that is desired to remain would die",
	Blocked: "Account cannot receive the assets",
};

const ERRORS_ARITHMETIC = {
	Overflow: "An underflow would occur",
	Underflow: "An overflow would occur",
	DivisionByZero: "Division by zero",
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
	Trie: "Unknown error", // unsupported,
	Other: "Unknown error", // unsupported,
};

// TODO cleanup :)
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

		const lookup = getLookupFn(metadata);

		const palletErrors = lookup(pallet.errors);
		if (
			palletErrors.type !== "enum" ||
			!palletErrors.innerDocs[error.value.type]?.length
		)
			throw new Error("Unknown error type");

		// biome-ignore lint/style/noNonNullAssertion: checked above
		return palletErrors.innerDocs[error.value.type]!.join(" ");
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
