import { plancksToTokens } from "../../../utils/plancks";

export type HubSpoke = {
	poolAssetId: number;
	angle: number;
	radius: number;
	rank: number;
};

type HubPool = { poolAssetId: number; valuation: bigint | null };

type HubSpokesOptions = {
	stableDecimals: number;
	rMin: number;
	rMax: number;
	decades?: number;
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const byValuationDesc = (a: HubPool, b: HubPool) => {
	const va = a.valuation ?? 0n;
	const vb = b.valuation ?? 0n;
	return va === vb ? 0 : va > vb ? -1 : 1;
};

export const getHubSpokes = (
	pools: HubPool[],
	{ stableDecimals, rMin, rMax, decades = 4 }: HubSpokesOptions,
): HubSpoke[] => {
	const n = pools.length;
	if (!n) return [];

	const ranked = pools.concat().sort(byValuationDesc);
	const rawMagnitudes = ranked.map(({ valuation }) =>
		Math.log10(Number(plancksToTokens(valuation ?? 0n, stableDecimals))),
	);
	const maxMagnitude = rawMagnitudes[0] as number;
	const floorMagnitude = Math.max(
		Math.min(...rawMagnitudes),
		maxMagnitude - decades,
	);
	const magnitudes = rawMagnitudes.map((m) => Math.max(m, floorMagnitude));
	const magnitudeRange = Number.isFinite(maxMagnitude)
		? maxMagnitude - floorMagnitude
		: 0;
	return ranked.map(({ poolAssetId }, rank) => {
		const magnitude = magnitudes[rank] as number;
		return {
			poolAssetId,
			rank,
			angle: -Math.PI / 2 + ((rank * GOLDEN_ANGLE) % (2 * Math.PI)),
			radius: magnitudeRange
				? rMin + ((magnitude - floorMagnitude) / magnitudeRange) * (rMax - rMin)
				: rMax,
		};
	});
};
