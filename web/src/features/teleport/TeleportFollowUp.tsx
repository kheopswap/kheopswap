import {
	type ChainId,
	getTokenIdFromXcmV3Multilocation,
	type XcmV3Multilocation,
} from "@kheopswap/registry";
import { cn, type TxEvents } from "@kheopswap/utils";
import { type FC, useMemo } from "react";
import { type FollowUpData, Tokens } from "src/components";
import { TransactionFollowUp } from "src/features/transaction/TransactionFollowUp";
import { useTransactionFollowUp } from "src/features/transaction/TransactionFollowUpProvider";
import { useToken } from "src/hooks";

type TeleportFollowUpData = FollowUpData<{
	chainId: ChainId | undefined;
	deliveryFeeEstimate:
		| {
				tokenId: string;
				plancks: bigint;
		  }
		| null
		| undefined;
}>;

const OutcomeFollowUpInner: FC<{
	followUp: TeleportFollowUpData;
}> = ({ followUp }) => {
	const individualEvents = useMemo<TxEvents>(
		() =>
			followUp.txEvents.flatMap(
				(e) =>
					(e.type === "finalized" && e.events) ||
					(e.type === "txBestBlocksState" && e.found && e.events) ||
					[],
			),
		[followUp.txEvents],
	);

	const effectiveDeliveryFee = useMemo(() => {
		if (!followUp.chainId || !individualEvents) return null;

		const deliveryFee = individualEvents.find(
			(e) =>
				["XcmPallet", "PolkadotXcm", "KusamaXcm"].includes(e.type) &&
				e.value.type === "FeesPaid",
		)?.value;

		const fee = deliveryFee?.value.fees[0];
		if (fee?.fun.type !== "Fungible") return null;

		const tokenId = getTokenIdFromXcmV3Multilocation(
			followUp.chainId,
			fee.id as XcmV3Multilocation,
		);
		if (!tokenId) return null;

		return {
			tokenId,
			plancks: fee.fun.value,
		};
	}, [individualEvents, followUp.chainId]);

	const { data: expectedToken } = useToken({
		tokenId: followUp.deliveryFeeEstimate?.tokenId,
	});
	const { data: effectiveToken } = useToken({
		tokenId: effectiveDeliveryFee?.tokenId,
	});

	if (!followUp.deliveryFeeEstimate || !expectedToken) return null;

	return (
		<div className={cn(effectiveDeliveryFee ? "block" : "hidden")}>
			<div className="flex flex-wrap justify-between">
				<div className="text-neutral-500">Estimated delivery fee</div>
				<div className="text-right font-medium text-neutral-500">
					<Tokens
						plancks={followUp.deliveryFeeEstimate.plancks}
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
									followUp.deliveryFeeEstimate.tokenId ||
									effectiveDeliveryFee.plancks >=
										followUp.deliveryFeeEstimate.plancks
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

const OutcomeFollowUp: FC = () => {
	const { followUp } = useTransactionFollowUp();

	if (!followUp) return null;

	return <OutcomeFollowUpInner followUp={followUp as TeleportFollowUpData} />;
};

export const TeleportFollowUp: FC = () => {
	return (
		<TransactionFollowUp>
			<OutcomeFollowUp />
		</TransactionFollowUp>
	);
};
