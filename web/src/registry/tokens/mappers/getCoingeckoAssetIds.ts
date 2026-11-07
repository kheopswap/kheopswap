export type CoingeckoCoin = {
	id: string;
	platforms?: Record<string, string | null>;
};

const ASSET_ID_PATTERNS = {
	hydration: /^asset_registry%2F(\d+)$/,
	polkadot: /^(\d+)$/,
};

export type CoingeckoAssetPlatform = keyof typeof ASSET_ID_PATTERNS;

export const getCoingeckoAssetPlatform = ({
	type,
	chainId,
}: {
	type?: string;
	chainId?: string;
}): CoingeckoAssetPlatform | undefined => {
	if (type === "hydration-asset") return "hydration";
	if (type === "asset" && chainId === "pah") return "polkadot";
	return undefined;
};

export const getCoingeckoAssetIds = (
	coins: CoingeckoCoin[],
	platform: CoingeckoAssetPlatform,
): Map<number, string> =>
	new Map(
		coins.flatMap(({ id, platforms }) => {
			const match = ASSET_ID_PATTERNS[platform].exec(
				platforms?.[platform] ?? "",
			);
			return match ? [[Number(match[1]), id] as const] : [];
		}),
	);
