import type { Token } from "@kheopswap/registry";
import { cn } from "@kheopswap/utils";
import type { TxEvent } from "polkadot-api";
import type { FC, PropsWithChildren } from "react";
import type { PolkadotAccount } from "src/hooks";

export type FollowUpTxEvent =
	| TxEvent
	| { type: "pending" }
	| { type: "error"; error: unknown };
export type FollowUpTxEvents = FollowUpTxEvent[];

export type FollowUpData<T = unknown> = {
	txEvents: FollowUpTxEvents;
	account: PolkadotAccount;
	feeEstimate: bigint;
	feeToken: Token;
} & T;

export const FollowUpRow: FC<
	PropsWithChildren & { label: string; className?: string }
> = ({ label, className, children }) => (
	<div className="flex flex-wrap justify-between">
		<div className="text-neutral">{label}</div>
		<div className={cn("text-right font-medium", className)}>{children}</div>
	</div>
);
