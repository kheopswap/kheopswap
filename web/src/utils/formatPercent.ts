/**
 * Formats a decimal ratio as a percentage string with up to 2 decimal places.
 * Trailing zeros and unnecessary decimal points are stripped.
 *
 * @example formatPercent(0.05)   // "5%"
 * @example formatPercent(0.001)  // "0.1%"
 * @example formatPercent(0.0035) // "0.35%"
 * @example formatPercent(0)      // "0%"
 */
export const formatPercent = (value: number): string => {
	const pct = value * 100;
	const str = pct.toFixed(2).replace(/\.?0+$/, "");
	return `${str}%`;
};
