const SHARE_PRECISION = 1_000_000n;

export const TEXT_COLOR = "var(--color-text)";

const NEUTRAL_COLORS = [
	TEXT_COLOR,
	"color-mix(in oklab, var(--color-text) 60%, var(--color-page))",
	"color-mix(in oklab, var(--color-text) 35%, var(--color-page))",
];

export const getAllocationColors = (dominantColors: (string | null)[]) => {
	let neutralIndex = 0;
	return dominantColors.map(
		(color) =>
			color ??
			NEUTRAL_COLORS[Math.min(neutralIndex++, NEUTRAL_COLORS.length - 1)] ??
			TEXT_COLOR,
	);
};

type Holding<T> = { token: T; stablePlancks: bigint };

type AllocationSlice<T> = Holding<T> & { share: number };

type Allocation<T> = {
	total: bigint;
	slices: AllocationSlice<T>[];
	other: { stablePlancks: bigint; share: number } | null;
};

export const getShare = (part: bigint, total: bigint) =>
	total > 0n
		? Number((part * SHARE_PRECISION) / total) / Number(SHARE_PRECISION)
		: 0;

export const sortByStablePlancksDesc = <T>(a: Holding<T>, b: Holding<T>) =>
	a.stablePlancks === b.stablePlancks
		? 0
		: a.stablePlancks > b.stablePlancks
			? -1
			: 1;

export const getAllocation = <T>(
	holdings: Holding<T>[],
	minShare = 0.02,
): Allocation<T> => {
	const positive = holdings.filter((h) => h.stablePlancks > 0n);
	const total = positive.reduce((acc, h) => acc + h.stablePlancks, 0n);

	const slices: AllocationSlice<T>[] = [];
	let otherPlancks = 0n;

	for (const holding of positive.concat().sort(sortByStablePlancksDesc)) {
		const share = getShare(holding.stablePlancks, total);
		if (share >= minShare) slices.push({ ...holding, share });
		else otherPlancks += holding.stablePlancks;
	}

	return {
		total,
		slices,
		other: otherPlancks
			? { stablePlancks: otherPlancks, share: getShare(otherPlancks, total) }
			: null,
	};
};
