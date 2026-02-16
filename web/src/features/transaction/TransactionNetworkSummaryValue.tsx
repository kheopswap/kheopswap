import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useMemo } from "react";
import { useTransaction } from "./TransactionProvider";

export const TransactionNetworkSummaryValue = () => {
	const {
		account,
		isEthereumNetworkMismatch,
		targetEvmChainId,
		onSwitchEthereumNetwork,
		isSwitchingEthereumNetwork,
	} = useTransaction();

	const targetChainLabel = useMemo(() => {
		if (!targetEvmChainId) return null;
		return `eip155:${targetEvmChainId}`;
	}, [targetEvmChainId]);

	if (account?.platform !== "ethereum") return null;

	if (!isEthereumNetworkMismatch) {
		return <span className="text-success-400">Connected</span>;
	}

	return (
		<div className="flex items-center gap-2">
			<span className="text-warn-400">Switch to {targetChainLabel}</span>
			<button
				type="button"
				onClick={() => {
					void onSwitchEthereumNetwork();
				}}
				disabled={isSwitchingEthereumNetwork}
				className="inline-flex items-center gap-1 rounded border border-neutral-600 px-2 py-0.5 text-xs hover:bg-white/5 disabled:opacity-60"
			>
				<ArrowPathIcon className="size-3.5" />
				{isSwitchingEthereumNetwork ? "Switching..." : "Switch"}
			</button>
		</div>
	);
};
