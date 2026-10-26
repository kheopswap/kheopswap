import { type FC, Fragment } from "react";
import { FollowUpRow } from "../../../../components/FollowUpModal";
import { Pulse } from "../../../../components/Pulse";
import { Tokens } from "../../../../components/Tokens";
import { getChainById } from "../../../../registry/chains/chains";
import type { ChainId } from "../../../../registry/chains/types";
import { parseTokenId } from "../../../../registry/tokens/helpers";
import type { TransactionRecord } from "../../../../state/transactions/types";
import {
	describeFailedArrival,
	isXcmArrivalRecord,
	useXcmArrival,
	type XcmArrival,
} from "../../../../state/transactions/xcmArrival";
import { TokenAmountValue } from "../AmmPathValues";

const ArrivalStatus: FC<{
	arrival: XcmArrival;
	origin: ChainId;
}> = ({ arrival, origin }) => {
	switch (arrival.status) {
		case "awaiting-origin":
			return (
				<span className="text-muted">
					Waiting for {getChainById(origin).name}
				</span>
			);
		case "in-transit":
			return <Pulse pulse>In transit</Pulse>;
		case "arrived":
			return (
				<Pulse pulse={!arrival.finalized} className="text-success">
					Arrived
				</Pulse>
			);
		case "failed-on-destination":
			return (
				<Pulse pulse={!arrival.finalized} className="text-error">
					{["Failed", describeFailedArrival(arrival)]
						.filter(Boolean)
						.join(", ")}
				</Pulse>
			);
		case "unreachable":
			return <Pulse pulse>Unreachable, retrying</Pulse>;
		case "unconfirmed":
			return <span className="text-warn">Not confirmed</span>;
		case "origin-failed":
			return null;
	}
};

export const XcmTransferFollowUpContent: FC<{
	transaction: TransactionRecord;
}> = ({ transaction }) => {
	const arrival = useXcmArrival(transaction.id);

	if (
		!isXcmArrivalRecord(transaction) ||
		!arrival ||
		arrival.status === "origin-failed"
	)
		return null;

	const { origin, target, tokenOut, estimatedReceived } =
		transaction.followUpData;

	const received = arrival.status === "arrived" ? arrival.received : null;
	const returned =
		arrival.status === "failed-on-destination" ? arrival.returned : [];

	return (
		<div>
			<FollowUpRow
				label={`Arrival on ${getChainById(parseTokenId(target.tokenId).chainId).name}`}
			>
				<ArrivalStatus arrival={arrival} origin={origin} />
			</FollowUpRow>
			{estimatedReceived !== undefined && (
				<FollowUpRow label="Estimated received" className="text-muted">
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
			{!!returned.length && (
				<FollowUpRow label="Returned">
					<div className="flex flex-wrap justify-end">
						{returned.map((amount, index) => (
							<Fragment key={amount.tokenId}>
								{index > 0 && <span className="mx-1">+</span>}
								<TokenAmountValue {...amount} />
							</Fragment>
						))}
					</div>
				</FollowUpRow>
			)}
		</div>
	);
};
