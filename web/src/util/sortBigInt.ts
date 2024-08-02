export const sortBigInt = (a: bigint, b: bigint, desc?: boolean) => {
	if (desc) return a > b ? -1 : a < b ? 1 : 0;
	return a > b ? 1 : a < b ? -1 : 0;
};
