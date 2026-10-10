import type { FC } from "react";
import { FollowUpRow } from "../../../../components/FollowUpModal";
import { Pulse } from "../../../../components/Pulse";
import { Tokens } from "../../../../components/Tokens";
import { getChainById } from "../../../../registry/chains/chains";
import type { TransactionRecord } from "../../../../state/transactions/types";
import {
	useXcmArrival,
	type XcmArrival,
	type XcmTransferFollowUpData,
} from "../../../../state/transactions/xcmArrival";

const ArrivalStatus: FC<{ arrival: XcmArrival }> = ({ arrival }) => {
	switch (arrival.status) {
		case "awaiting-origin":
			return <span className="text-neutral-500">Waiting for Asset Hub</span>;
		case "in-transit":
			return <Pulse pulse>In transit</Pulse>;
		case "arrived":
			return <span className="text-success">Arrived</span>;
		case "failed-on-destination":
			return <span className="text-error">Failed, assets trapped</span>;
		case "unconfirmed":
			return <span className="text-warn">Not confirmed</span>;
		case "origin-failed":
			return null;
	}
};

export const XcmTransferFollowUpContent: FC<{
	transaction: TransactionRecord;
}> = ({ transaction }) => {
	const { target, tokenOut, estimatedReceived } =
		transaction.followUpData as Partial<XcmTransferFollowUpData>;
	const arrival = useXcmArrival(transaction.id);

	if (!target || !tokenOut || !arrival || arrival.status === "origin-failed")
		return null;

	const received = arrival.status === "arrived" ? arrival.received : null;

	return (
		<div>
			<FollowUpRow
				label={`Arrival on ${getChainById(target.destination).name}`}
			>
				<ArrivalStatus arrival={arrival} />
			</FollowUpRow>
			{estimatedReceived !== undefined && (
				<FollowUpRow label="Estimated received" className="text-neutral-500">
					<Tokens plancks={estimatedReceived} token={tokenOut} />
				</FollowUpRow>
			)}
			{received !== null && (
				<FollowUpRow label="Received">
					<Tokens
						plancks={received}
						token={tokenOut}
						className="text-success"
					/>
				</FollowUpRow>
			)}
		</div>
	);
};
