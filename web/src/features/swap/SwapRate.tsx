import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Price } from "../../components/SmallNumber";
import { getSwapRate } from "./getSwapRate";
import { useSwap } from "./SwapProvider";

export const SwapRate = () => {
	const { tokenIn, tokenOut, totalIn, swapPlancksOut } = useSwap();
	const [isInverted, setIsInverted] = useState(false);
	if (!tokenIn || !tokenOut || !totalIn || !swapPlancksOut) return null;

	const sent = { plancks: totalIn, ...tokenIn };
	const received = { plancks: swapPlancksOut, ...tokenOut };
	const [base, quote] = isInverted ? [received, sent] : [sent, received];
	const rate = getSwapRate(base, quote);

	return (
		<button
			type="button"
			onClick={() => setIsInverted((inverted) => !inverted)}
			title="Invert rate"
			className="flex items-center gap-1.5 font-mono"
		>
			<ArrowsRightLeftIcon className="size-4 text-muted" />
			<span>1 {base.symbol} =</span>
			<Price value={rate} decimals={quote.decimals} suffix={quote.symbol} />
		</button>
	);
};
