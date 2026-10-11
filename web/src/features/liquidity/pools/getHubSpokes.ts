export type HubSpoke = {
	poolAssetId: number;
	angle: number;
	radius: number;
	rank: number;
};

type HubPool = { poolAssetId: number; valuation: bigint | null };

type HubSpokesOptions = {
	rMin: number;
	rMax: number;
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const SHARE_PRECISION = 1_000_000n;
const LOG_SCALE = 1000;

const byValuationDesc = (a: HubPool, b: HubPool) => {
	const va = a.valuation ?? 0n;
	const vb = b.valuation ?? 0n;
	return va === vb ? 0 : va > vb ? -1 : 1;
};

const getShare = (valuation: bigint | null, max: bigint) =>
	max
		? Number(((valuation ?? 0n) * SHARE_PRECISION) / max) /
			Number(SHARE_PRECISION)
		: 1;

const getExtension = (share: number) =>
	Math.log10(1 + LOG_SCALE * share) / Math.log10(1 + LOG_SCALE);

export const getHubSpokes = (
	pools: HubPool[],
	{ rMin, rMax }: HubSpokesOptions,
): HubSpoke[] => {
	const ranked = pools.concat().sort(byValuationDesc);
	const max = ranked[0]?.valuation ?? 0n;
	return ranked.map(({ poolAssetId, valuation }, rank) => ({
		poolAssetId,
		rank,
		angle: -Math.PI / 2 + ((rank * GOLDEN_ANGLE) % (2 * Math.PI)),
		radius: rMin + getExtension(getShare(valuation, max)) * (rMax - rMin),
	}));
};
