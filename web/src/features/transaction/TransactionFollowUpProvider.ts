import { provideContext } from "@kheopswap/utils";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FollowUpData } from "src/components";
import { useTransaction } from "src/features/transaction/TransactionProvider";

const useTransactionFollowUpProvider = () => {
	const [followUp, setFollowUp] = useState<FollowUpData | null>(null);

	const { followUpInputs, onCloseFollowUp } = useTransaction();

	const navigate = useNavigate();
	const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

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

		if (redirectUrl) navigate(redirectUrl);
		else onCloseFollowUp(success);
	}, [followUp?.txEvents, onCloseFollowUp, navigate, redirectUrl]);

	const deferred = useDeferredValue(followUp);

	return { followUp: deferred, close, setRedirectUrl };
};

export const [TransactionFollowUpProvider, useTransactionFollowUp] =
	provideContext(useTransactionFollowUpProvider);
