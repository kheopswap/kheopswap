import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import type { TxEvent } from "polkadot-api";
import {
	type FC,
	type PropsWithChildren,
	type ReactNode,
	useMemo,
} from "react";
import urlJoin from "url-join";

import { Modal } from "./Modal";
import { Tokens } from "./Tokens";
import { SpinnerIcon } from "./icons";
import { Styles } from "./styles";

import { getChainById } from "src/config/chains";
import type { Token } from "src/config/tokens";
import { type InjectedAccount, useInjectedExtension } from "src/hooks";
import {
	type TxEvents,
	cn,
	getErrorMessageFromTxEvents,
	isBigInt,
} from "src/util";

export type FollowUpTxEvent =
	| TxEvent
	| { type: "pending" }
	| { type: "error"; error: unknown };
export type FollowUpTxEvents = FollowUpTxEvent[];

export type FollowUpData<T = unknown> = {
	txEvents: FollowUpTxEvents;
	account: InjectedAccount;
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

const FollowUpResultIcon: FC<{
	result: "loading" | "success" | "error";
	className?: string;
}> = ({ result, className }) => (
	<div className={cn("relative size-24", className)}>
		<SpinnerIcon
			className={cn(
				"absolute size-24 transition-opacity duration-500",
				result === "loading" ? "opacity-100" : "opacity-0",
			)}
		/>
		<div
			className={cn(
				"absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-success/20 p-2 transition-opacity duration-500",
				result === "success" ? "opacity-100" : "opacity-0",
			)}
		>
			<CheckIcon className="size-12 text-success" />
		</div>
		<div
			className={cn(
				"absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-error/20 p-2 transition-opacity duration-500",
				result === "error" ? "opacity-100" : "opacity-0",
			)}
		>
			<XMarkIcon className="size-12 text-error" />
		</div>
	</div>
);

const FollowUpModalInner: FC<{
	followUp: FollowUpData;
	onClose: () => void;
	children?: ReactNode;
}> = ({ followUp, onClose, children }) => {
	const extension = useInjectedExtension(followUp.account.wallet);

	const chain = useMemo(
		() => getChainById(followUp.feeToken.chainId),
		[followUp.feeToken.chainId],
	);

	const blockExplorerUrl = useMemo(() => {
		if (!chain?.blockExplorerUrl) return null;

		for (const event of followUp.txEvents) {
			switch (event.type) {
				case "signed":
				case "broadcasted":
				case "txBestBlocksState":
				case "finalized":
					return urlJoin(chain.blockExplorerUrl, "tx", event.txHash);
				default:
					break;
			}
		}
		return null;
	}, [followUp, chain]);

	const error = useMemo(
		() =>
			followUp.txEvents.find(
				(e): e is { type: "error"; error: unknown } => e.type === "error",
			)?.error,
		[followUp.txEvents],
	);

	const [message, canClose, result] = useMemo<
		[string, boolean, "loading" | "success" | "error"]
	>(() => {
		if (error) return ["Transaction failed", true, "error"];

		const finalized = followUp.txEvents.find(
			(event) => event.type === "finalized",
		);
		if (finalized?.type === "finalized") {
			if (finalized.ok) return ["Transaction succeeded", true, "success"];
			else return ["Transaction failed", true, "error"];
		}

		const best = followUp.txEvents.find(
			(event) => event.type === "txBestBlocksState",
		);
		if (best?.type === "txBestBlocksState" && best.found) {
			if (best.ok) return ["Waiting for finalization", true, "success"];
			else return ["Waiting for finalization", true, "error"];
		}

		const broadcasted = followUp.txEvents.find(
			(event) => event.type === "broadcasted",
		);
		if (broadcasted?.type === "broadcasted")
			return ["Transaction submitted...", false, "loading"];

		const signed = followUp.txEvents.find((event) => event.type === "signed");
		if (signed?.type === "signed")
			return ["Submitting transaction...", false, "loading"];

		return [
			`Approve in ${extension?.extension?.title ?? followUp.account?.wallet}`,
			false,
			"loading",
		];
	}, [followUp, extension, error]);

	const [individualEvents, errorMessage, isPendingFinalization, isFinalized] =
		useMemo<[TxEvents, string | null, boolean, boolean]>(() => {
			const allEvents: TxEvents = followUp.txEvents.flatMap(
				(e) =>
					(e.type === "finalized" && e.events) ||
					(e.type === "txBestBlocksState" && e.found && e.events) ||
					[],
			);

			const errorMessage = error
				? (error as Error).message ?? error.toString() ?? "Unknown error"
				: null;
			const txFailedErrorMessage = followUp.txEvents.some(
				(e) =>
					(e.type === "finalized" && !e.ok) ||
					(e.type === "txBestBlocksState" && e.found && !e.ok),
			)
				? getErrorMessageFromTxEvents(allEvents)
				: null;

			return [
				allEvents,
				errorMessage ?? txFailedErrorMessage ?? null,
				result !== "loading" &&
					!followUp.txEvents.some((e) => e.type === "finalized"),
				followUp.txEvents.some((e) => e.type === "finalized"),
			];
		}, [followUp.txEvents, result, error]);

	const effectiveFee = useMemo(() => {
		if (result !== "success") return null;
		const actualFee = individualEvents.find(
			(e) =>
				(e.type === "TransactionPayment" &&
					e.value.type === "TransactionFeePaid") ||
				(e.type === "AssetTxPayment" && e.value.type === "AssetTxFeePaid"),
		)?.value.value.actual_fee;
		return actualFee ? BigInt(actualFee) : null;
	}, [individualEvents, result]);

	return (
		<div
			className={cn(
				"h-dvh max-h-dvh w-dvw max-w-[100dvw] p-3 sm:p-4",
				"bg-black sm:border-neutral-850",
				"sm:h-[32rem] sm:w-auto sm:rounded-xl sm:border sm:shadow",
				"flex flex-col",
			)}
		>
			<div className="pt-5">
				<FollowUpResultIcon className="inline-block" result={result} />
			</div>
			<div
				className={cn(
					"text-xl font-medium text-neutral-300 transition-colors",
					!error && isPendingFinalization && "animate-pulse",
					(!!error || isFinalized) && "text-neutral-100",
				)}
			>
				{message ?? null}
			</div>
			<div className="my-10 flex w-96 max-w-full grow flex-col justify-center gap-4 text-center">
				{!!errorMessage && <div className="text-error">{errorMessage}</div>}
				{children && <div>{children}</div>}
				<div className={cn(effectiveFee ? "block" : "hidden")}>
					<FollowUpRow label="Estimated fee" className="text-neutral-500">
						<Tokens plancks={followUp.feeEstimate} token={followUp.feeToken} />
					</FollowUpRow>
					<FollowUpRow label="Effective fee">
						{isBigInt(effectiveFee) && (
							<Tokens
								plancks={effectiveFee}
								token={followUp.feeToken}
								className={cn(
									effectiveFee <= followUp.feeEstimate
										? "text-success"
										: "text-warn",
								)}
							/>
						)}
					</FollowUpRow>
				</div>
			</div>
			<div className="space-y-2">
				<button
					type="button"
					onClick={() => {
						if (blockExplorerUrl)
							window.open(blockExplorerUrl, "_blank", "noopener noreferrer");
					}}
					className={cn(Styles.button, "h-12 w-full  disabled:opacity-50")}
					disabled={!blockExplorerUrl}
				>
					View in block explorer
				</button>
				<button
					type="button"
					onClick={onClose}
					className={cn(
						Styles.button,
						"h-12 w-full border-primary-400 bg-primary enabled:hover:bg-primary-450 disabled:opacity-50",
					)}
					disabled={!canClose}
				>
					Close
				</button>
			</div>
		</div>
	);
};

export const FollowUpModal: FC<{
	followUp: FollowUpData | null;
	onClose: () => void;
	children?: ReactNode;
}> = ({ followUp, onClose, children }) => (
	<Modal isOpen={!!followUp}>
		{followUp && (
			<FollowUpModalInner followUp={followUp} onClose={onClose}>
				{children}
			</FollowUpModalInner>
		)}
	</Modal>
);
