import { logger } from "./logger";

export type TxEvents = {
	type: string;
	value: {
		type: string;
		// biome-ignore lint/suspicious/noExplicitAny: legacy
		value: any;
	};
}[];

export const getErrorMessageFromTxEvents = (events: TxEvents) => {
	try {
		const errorEvent = events.find(
			(e) => e.type === "System" && e.value.type === "ExtrinsicFailed",
		);

		const dispatchError = errorEvent?.value.value.dispatch_error;
		if (dispatchError) return formatTxError(dispatchError);
	} catch (err) {
		logger.error("Failed to parse error", { err, events });
	}

	return "Unknown error";
};

// biome-ignore lint/suspicious/noExplicitAny: legacy
export const formatTxError = (error: any): string => {
	if (!error) return "";
	if (typeof error === "string") return error;
	if (error.type === "Module") return formatTxError(error.value);
	if (typeof error.type === "string")
		return [error.type, formatTxError(error.value)].filter(Boolean).join(": ");
	logger.warn("Unknown error type", { error });
	return "Unknown error";
};
