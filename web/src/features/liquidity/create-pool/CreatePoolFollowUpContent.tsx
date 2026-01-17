import { refreshPools } from "@kheopswap/services/pools";
import { cn, type TxEvents } from "@kheopswap/utils";
import { isNumber } from "lodash";
import { type FC, useEffect, useMemo } from "react";
import { useRelayChains } from "src/state";
import type { TransactionRecord } from "src/state/transactions";

// TODO: The redirect functionality was handled by setRedirectUrl in the old system
// With the new global modal, we need a different approach for post-transaction navigation
// For now, we just show the pool ID and let users navigate manually

export const CreatePoolFollowUpContent: FC<{
	transaction: TransactionRecord;
}> = ({ transaction }) => {
	const txEvents = transaction.txEvents;
	const { assetHub } = useRelayChains();

	const individualEvents = useMemo<TxEvents>(
		() =>
			txEvents.flatMap(
				(e) =>
					(e.type === "finalized" && e.events) ||
					(e.type === "txBestBlocksState" && e.found && e.events) ||
					[],
			),
		[txEvents],
	);

	const poolId = useMemo(
		() =>
			(individualEvents.find(
				(e) => e.type === "AssetConversion" && e.value.type === "PoolCreated",
			)?.value.value.lp_token as number) ?? null,
		[individualEvents],
	);

	// Refresh pools list when pool is created
	useEffect(() => {
		if (poolId) {
			refreshPools(assetHub.id);
		}
	}, [poolId, assetHub.id]);

	return (
		<div className={cn(isNumber(poolId) ? "block" : "hidden")}>
			<div className="flex flex-wrap justify-between">
				<div className="text-neutral-500">Pool ID</div>
				<div className="text-right font-medium text-neutral-500">{poolId}</div>
			</div>
		</div>
	);
};
