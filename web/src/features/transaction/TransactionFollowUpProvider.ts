import { useCallback, useDeferredValue, useEffect, useState } from "react";

import type { FollowUpData } from "src/components";
import { useTransaction } from "src/features/transaction/TransactionProvider";
import { provideContext } from "src/util";

const useTransactionFollowUpProvider = () => {
	const [followUp, setFollowUp] = useState<FollowUpData | null>(null);

	const { followUpInputs, onCloseFollowUp } = useTransaction();

	useEffect(() => {
		if (!followUpInputs) {
			setFollowUp(null);
			return;
		}

		const { obsTxEvents, ...rest } = followUpInputs;
		setFollowUp({
			txEvents: [{ type: "pending" }],
			...rest,
		});

		const sub = obsTxEvents.subscribe((x) => {
			setFollowUp((prev) =>
				prev
					? {
							...prev,
							txEvents: [...prev.txEvents, x],
						}
					: prev,
			);
		});

		return () => {
			sub.unsubscribe();
		};
	}, [followUpInputs]);

	const close = useCallback(() => {
		const success = !!followUp?.txEvents.some(
			(x) => x.type === "txBestBlocksState" && x.found && x.ok,
		);
		onCloseFollowUp(success);
	}, [followUp?.txEvents, onCloseFollowUp]);

	const deferred = useDeferredValue(followUp);

	return { followUp: deferred, close };
};

export const [TransactionFollowUpProvider, useTransactionFollowUp] =
	provideContext(useTransactionFollowUpProvider);
