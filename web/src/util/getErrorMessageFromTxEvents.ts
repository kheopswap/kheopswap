import { logger } from "./logger";

export type TxEvents = {
	type: string;
	value: {
		type: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value: any;
	};
}[];

export const getErrorMessageFromTxEvents = (events: TxEvents) => {
	try {
		const errorEvent = events.find(
			(e) => e.type === "System" && e.value.type === "ExtrinsicFailed",
		);
		const dispatchError = errorEvent?.value.value.dispatch_error;
		if (dispatchError && dispatchError.type && dispatchError.value?.type)
			return `${dispatchError.type}: ${dispatchError.value.type}`;

		// const moduleError =
		//   dispatchError &&
		//   dispatchError.type === "Module" &&
		//   dispatchError.value.error;
		// if (moduleError && typeof moduleError?.asText === "function")
		//   return `Module: ${moduleError?.asText()}`;
	} catch (err) {
		logger.error("Failed to parse error", { err, events });
	}

	return "Unknown error";
};
