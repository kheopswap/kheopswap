import type { TxEvent } from "polkadot-api";
import type { Observable } from "rxjs";

export const waitTransactionComplete = async (
	label: string,
	obsEvents: Observable<TxEvent>,
) => {
	return new Promise<void>((resolve, reject) => {
		try {
			const sub = obsEvents.subscribe({
				next: (e) => {
					if (e.type === "broadcasted")
						console.log("[%s] Transaction broadcasted", label);
					if (e.type === "txBestBlocksState")
						if (e.found) {
							if (e.ok) {
								console.log(
									"[%s] Transaction appears valid",
									label,
									`${e.block.hash}-${e.block.index}`,
								);
							} else {
								const { events, ...rest } = e;
								console.log(rest);
								for (const event of events) {
									const { type, value } = event;
									const eventType = [type, value.type].join(".");
									console.log("Event ", eventType);
									console.log(value);
								}
								reject(new Error("Transaction failed"));
							}
						}

					if (e.type === "finalized") {
						sub.unsubscribe();
						console.log(
							e.ok ? "[%s] Transaction successful" : "[%s] Transaction failed",
							label,
							`${e.block.hash}-${e.block.index}`,
							// e.events
						);

						if (e.ok) {
							resolve();
						} else reject(new Error("Transaction failed"));
					}
				},
				error: reject,
			});
		} catch (err) {
			console.error("Tracking failed", err);
		}
	});
};
