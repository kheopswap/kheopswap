export const getMissingLiquiditySide = (
	liquidity: [bigint, bigint] | null,
): 0 | 1 | null => {
	if (!liquidity) return null;
	const [native, asset] = liquidity;
	if (native > 0n && asset === 0n) return 1;
	if (asset > 0n && native === 0n) return 0;
	return null;
};
