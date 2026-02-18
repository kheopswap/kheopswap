import type { WalletAccount } from "@kheopskit/core";
import type { TxEvent } from "polkadot-api";
import type { FC, PropsWithChildren } from "react";
import type { Token } from "../registry/tokens/types";
import { cn } from "../utils/cn";

export type FollowUpTxEvent =
	| TxEvent
	| { type: "pending" }
	| { type: "error"; error: unknown };
export type FollowUpTxEvents = FollowUpTxEvent[];

export type FollowUpData<T = unknown> = {
	txEvents: FollowUpTxEvents;
	account: WalletAccount;
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
