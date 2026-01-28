import { logger } from "@kheopswap/utils";
import { getBalancesWatchersCount } from "../balances/watchers";
import { getPoolSuppliesWatchersCount } from "../poolSupplies/watchers";
import { getTokenInfosWatchersCount } from "../tokenInfos/watchers";

let enabled = false;

export const enableWatchServiceSubscriptions = (enable: boolean) => {
	enabled = enable;
};

setInterval(() => {
	if (enabled)
		logger.debug(
			"[watchers report] balances:%d tokensInfos:%d poolSupplies:%d",
			getBalancesWatchersCount(),
			getTokenInfosWatchersCount(),
			getPoolSuppliesWatchersCount(),
		);
}, 5_000);
