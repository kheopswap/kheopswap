import { getBalancesWatchersCount } from "./services/balances";
import { getPoolSuppliesWatchersCount } from "./services/poolSupplies";
import { getPoolsWatchersCount } from "./services/pools";
import { getTokensWatchersCount } from "./services/tokens";
import { logger } from "./util";

setInterval(() => {
	logger.debug(
		"[watchers report] balances:%d pools:%d tokens:%d poolSupplies:%d",
		getBalancesWatchersCount(),
		getPoolsWatchersCount(),
		getTokensWatchersCount(),
		getPoolSuppliesWatchersCount(),
	);
}, 5_000);
