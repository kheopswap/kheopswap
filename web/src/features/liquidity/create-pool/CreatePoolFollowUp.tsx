import { refreshPools } from "@kheopswap/services/pools";
import { type TxEvents, cn } from "@kheopswap/utils";
import { isNumber } from "lodash";
import { type FC, useEffect, useMemo } from "react";
import { TransactionFollowUp } from "src/features/transaction/TransactionFollowUp";
import { useTransactionFollowUp } from "src/features/transaction/TransactionFollowUpProvider";
import { useRelayChains } from "src/hooks";

const OutcomeFollowUpInner: FC = () => {
	const { followUp, setRedirectUrl } = useTransactionFollowUp();
	const { relayId, assetHub } = useRelayChains();

	const individualEvents = useMemo<TxEvents>(
		() =>
			followUp?.txEvents.flatMap(
				(e) =>
					(e.type === "finalized" && e.events) ||
					(e.type === "txBestBlocksState" && e.found && e.events) ||
					[],
			) ?? [],
		[followUp?.txEvents],
	);

	const poolId = useMemo(
		() =>
			(individualEvents.find(
				(e) => e.type === "AssetConversion" && e.value.type === "PoolCreated",
			)?.value.value.lp_token as number) ?? null,
		[individualEvents],
	);

	useEffect(() => {
		setRedirectUrl(poolId === null ? null : `/${relayId}/pools/${poolId}`);

		if (poolId) {
			refreshPools(assetHub.id);
		}
	}, [poolId, relayId, assetHub.id, setRedirectUrl]);

	return (
		<div className={cn(isNumber(poolId) ? "block" : "hidden")}>
			<div className="flex flex-wrap justify-between">
				<div className="text-neutral-500">Pool ID</div>
				<div className="text-right font-medium text-neutral-500">{poolId}</div>
			</div>
		</div>
	);
};

const OutcomeFollowUp: FC = () => {
	const { followUp } = useTransactionFollowUp();

	if (!followUp) return null;

	return <OutcomeFollowUpInner />;
};

export const CreatePoolFollowUp: FC = () => {
	return (
		<TransactionFollowUp>
			<OutcomeFollowUp />
		</TransactionFollowUp>
	);
};
