const percentFormatter = new Intl.NumberFormat(undefined, {
	style: "percent",
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
});

const fixedPercentFormatter = new Intl.NumberFormat(undefined, {
	style: "percent",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export const formatPercent = (ratio: number): string =>
	percentFormatter.format(ratio);

export const formatFixedPercent = (ratio: number): string =>
	fixedPercentFormatter.format(ratio);
