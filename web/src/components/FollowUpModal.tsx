import type { TxEvent } from "polkadot-api";
import type { FC, PropsWithChildren } from "react";
import { cn } from "../utils/cn";

export type FollowUpTxEvent =
	| TxEvent
	| { type: "pending" }
	| { type: "error"; error: unknown };
export type FollowUpTxEvents = FollowUpTxEvent[];

export const FollowUpRow: FC<
	PropsWithChildren & { label: string; className?: string }
> = ({ label, className, children }) => (
	<div className="flex flex-wrap justify-between">
		<div className="text-muted">{label}</div>
		<div className={cn("text-right font-medium", className)}>{children}</div>
	</div>
);
