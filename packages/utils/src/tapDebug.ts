import { tap } from "rxjs";
import { logger } from "./logger";

export const tapDebug = <T>(label: string) =>
	tap<T>({
		next: (next) => logger.debug(`[tap next] ${label}`, { next }),
		subscribe: () => logger.debug(`[tap subscribe] ${label}`),
		unsubscribe: () => logger.debug(`[tap unsubscribe] ${label}`),
		error: (error) => logger.debug(`[tap error] ${label}`, { error }),
	});
