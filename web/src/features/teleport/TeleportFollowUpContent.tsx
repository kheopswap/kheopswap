import {
	type ChainId,
	getTokenIdFromXcmV3Multilocation,
	type XcmV3Multilocation,
} from "@kheopswap/registry";
import { cn, type TxEvents } from "@kheopswap/utils";
import { type FC, useMemo } from "react";
import { Tokens } from "src/components";
import { useToken } from "src/hooks";
import type { TransactionRecord } from "src/state/transactions";

type TeleportFollowUpData = {
	chainId: ChainId | undefined;
	deliveryFeeEstimate:
		| {
				tokenId: string;
				plancks: bigint;
		  }
		| null
		| undefined;
};

export const TeleportFollowUpContent: FC<{
	transaction: TransactionRecord;
}> = ({ transaction }) => {
	const followUpData = transaction.followUpData as TeleportFollowUpData;
	const txEvents = transaction.txEvents;

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

	const effectiveDeliveryFee = useMemo(() => {
		if (!followUpData?.chainId || !individualEvents) return null;

		const deliveryFee = individualEvents.find(
			(e) =>
				["XcmPallet", "PolkadotXcm", "KusamaXcm"].includes(e.type) &&
				e.value.type === "FeesPaid",
		)?.value;

		const fee = deliveryFee?.value.fees[0];
		if (fee?.fun.type !== "Fungible") return null;

		const tokenId = getTokenIdFromXcmV3Multilocation(
			followUpData.chainId,
			fee.id as XcmV3Multilocation,
		);
		if (!tokenId) return null;

		return {
			tokenId,
			plancks: fee.fun.value,
		};
	}, [individualEvents, followUpData?.chainId]);

	const { data: expectedToken } = useToken({
		tokenId: followUpData?.deliveryFeeEstimate?.tokenId,
	});
	const { data: effectiveToken } = useToken({
		tokenId: effectiveDeliveryFee?.tokenId,
	});

	if (!followUpData?.deliveryFeeEstimate || !expectedToken) return null;

	return (
		<div className={cn(effectiveDeliveryFee ? "block" : "hidden")}>
			<div className="flex flex-wrap justify-between">
				<div className="text-neutral-500">Estimated delivery fee</div>
				<div className="text-right font-medium text-neutral-500">
					<Tokens
						plancks={followUpData.deliveryFeeEstimate.plancks}
						token={expectedToken}
					/>
				</div>
			</div>
			<div className="flex flex-wrap justify-between">
				<div className="text-neutral-500">Effective delivery fee</div>
				<div className="text-right font-medium">
					{!!effectiveDeliveryFee && !!effectiveToken && (
						<Tokens
							plancks={effectiveDeliveryFee.plancks}
							token={effectiveToken}
							className={cn(
								effectiveDeliveryFee.tokenId !==
									followUpData.deliveryFeeEstimate.tokenId ||
									effectiveDeliveryFee.plancks >=
										followUpData.deliveryFeeEstimate.plancks
									? "text-success"
									: "text-warn",
							)}
						/>
					)}
				</div>
			</div>
		</div>
	);
};
