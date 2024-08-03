import type { TxEvent } from "polkadot-api";
import { type Id, toast } from "react-toastify";

import { getErrorMessageFromTxEvents } from "./getErrorMessageFromTxEvents";
import { logger } from "./logger";

export const notifyTxStatus = () => {
	let toastId: Id;

	/**
	 *
	 * @param status current block status
	 * @returns whether the watcher should stop watching blocks
	 */
	const callback = (status: TxEvent): boolean => {
		switch (status.type) {
			case "signed": {
				toastId = toast("Transaction signed", {
					type: "info",
					isLoading: true,
					autoClose: 30_000,
				});
				return false;
			}
			case "broadcasted": {
				toast.update(toastId, {
					type: "info",
					autoClose: 30_000,
					render: "Transaction submitted",
					isLoading: true,
				});
				return false;
			}
			case "txBestBlocksState": {
				if (status.found) {
					if (status.ok) {
						toast.update(toastId, {
							type: "success",
							autoClose: 30_000,
							render: (
								<div>
									<div>Transaction succeeded</div>
									<div className="text-neutral-500">
										Waiting for finalization
									</div>
								</div>
							),
							isLoading: true,
						});
						return false;
						// biome-ignore lint/style/noUselessElse: <explanation>
					} else {
						const errorMessage = getErrorMessageFromTxEvents(status.events);

						toast.update(toastId, {
							type: "error",
							autoClose: false,
							render: errorMessage ? (
								<div>
									<div>Transaction failed</div>
									<div className="text-error-500">{errorMessage}</div>
								</div>
							) : (
								"Transaction failed"
							),
							isLoading: false,
						});

						// prevent further updates
						toastId = "STOP";
						return true;
					}
				}
				logger.warn("tx not found in best block", status);
				return false;
			}
			case "finalized": {
				if (toastId === "STOP") return true;

				if (status.ok) {
					toast.update(toastId, {
						autoClose: 4_000,
						type: "success",
						render: "Transaction succeeded",
						isLoading: false,
					});
				} else {
					const errorMessage = getErrorMessageFromTxEvents(status.events);

					toast.update(toastId, {
						type: "error",
						autoClose: false,
						render: errorMessage ? (
							<div>
								<div>Transaction failed</div>
								<div className="text-error-500">{errorMessage}</div>
							</div>
						) : (
							"Transaction failed"
						),
						isLoading: false,
					});
				}

				return true;
			}
			default: {
				logger.warn("Unknown tx status", status);
				return false;
			}
		}
	};

	return callback;
};
