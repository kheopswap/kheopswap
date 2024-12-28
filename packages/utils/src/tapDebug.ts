import { tap } from "rxjs";
import { logger } from "./logger";

export const tapDebug = <T>(label: string) =>
	tap<T>(() => {
		logger.debug(`[tap] ${label}`);
	});
