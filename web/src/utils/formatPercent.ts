/**
 * Format a ratio (0–1) as a human-readable percentage string.
 *
 * @example formatPercent(0.05123) // "5.12%"
 * @example formatPercent(0.1)     // "10%"
 * @example formatPercent(0)       // "0%"
 */
const percentFormatter = new Intl.NumberFormat(undefined, {
	style: "percent",
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
});

export const formatPercent = (ratio: number): string => {
	return percentFormatter.format(ratio);
};
