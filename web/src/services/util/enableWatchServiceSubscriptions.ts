import { logger } from "../../utils/logger";
import { getBalancesWatchersCount } from "../balances/watchers";
import { getPoolSuppliesWatchersCount } from "../poolSupplies/watchers";
import { getPoolsWatchersCount } from "../pools/watchers";
import { getTokenInfosWatchersCount } from "../tokenInfos/watchers";
import { getTokensWatchersCount } from "../tokens/watchers";

let enabled = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

export const enableWatchServiceSubscriptions = (enable: boolean) => {
	enabled = enable;

	if (enabled && !intervalId) {
		intervalId = setInterval(() => {
			logger.debug(
				"[watchers report] balances:%d pools:%d tokens:%d tokensInfos:%d poolSupplies:%d",
				getBalancesWatchersCount(),
				getPoolsWatchersCount(),
				getTokensWatchersCount(),
				getTokenInfosWatchersCount(),
				getPoolSuppliesWatchersCount(),
			);
		}, 5_000);
	} else if (!enabled && intervalId) {
		clearInterval(intervalId);
		intervalId = null;
	}
};
