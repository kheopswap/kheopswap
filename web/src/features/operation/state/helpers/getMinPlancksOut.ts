export const getMinPlancksOut = (plancksOut: bigint, slippage: number) => {
	const safetyDecimal = 10000n;
	return (
		(plancksOut * (safetyDecimal - BigInt(slippage * Number(safetyDecimal)))) /
		safetyDecimal
	);
};
