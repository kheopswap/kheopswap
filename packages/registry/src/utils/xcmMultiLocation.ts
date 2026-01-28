import {
	type XcmV3Junction,
	type XcmV3JunctionNetworkId,
	type XcmV3Junctions,
	XcmV5Junction,
	XcmV5Junctions,
	XcmV5NetworkId,
} from "@polkadot-api/descriptors";
import { type ChainId, isChainIdAssetHub } from "../chains";
import { getTokenId, parseTokenId, type TokenId } from "../tokens";
import type { XcmV5Multilocation } from "../types";

type XcmV3Multilocation = {
	parents: number;
	interior: XcmV3Junctions;
};

type MultilocationV5<T> = T extends TokenId ? XcmV5Multilocation : null;

const assertUnreachable = (value: never, message: string): never => {
	void value;
	throw new Error(message);
};

const toXcmV5NetworkId = (network: XcmV3JunctionNetworkId) => {
	switch (network.type) {
		case "ByGenesis":
			return XcmV5NetworkId.ByGenesis(network.value);
		case "ByFork":
			return XcmV5NetworkId.ByFork(network.value);
		case "Polkadot":
			return XcmV5NetworkId.Polkadot();
		case "Kusama":
			return XcmV5NetworkId.Kusama();
		case "Ethereum":
			return XcmV5NetworkId.Ethereum(network.value);
		case "BitcoinCore":
			return XcmV5NetworkId.BitcoinCore();
		case "BitcoinCash":
			return XcmV5NetworkId.BitcoinCash();
		case "PolkadotBulletin":
			return XcmV5NetworkId.PolkadotBulletin();
		case "Westend":
		case "Rococo":
		case "Wococo":
			throw new Error(`Unsupported XCM v3 network id: ${network.type}`);
		default:
			return assertUnreachable(network, "Unsupported XCM v3 network id");
	}
};

const toXcmV5Junction = (junction: XcmV3Junction): XcmV5Junction => {
	switch (junction.type) {
		case "Parachain":
			return XcmV5Junction.Parachain(junction.value);
		case "AccountId32":
			return XcmV5Junction.AccountId32({
				...junction.value,
				network: junction.value.network
					? toXcmV5NetworkId(junction.value.network)
					: undefined,
			});
		case "AccountIndex64":
			return XcmV5Junction.AccountIndex64({
				...junction.value,
				network: junction.value.network
					? toXcmV5NetworkId(junction.value.network)
					: undefined,
			});
		case "AccountKey20":
			return XcmV5Junction.AccountKey20({
				...junction.value,
				network: junction.value.network
					? toXcmV5NetworkId(junction.value.network)
					: undefined,
			});
		case "PalletInstance":
			return XcmV5Junction.PalletInstance(junction.value);
		case "GeneralIndex":
			return XcmV5Junction.GeneralIndex(junction.value);
		case "GeneralKey":
			return XcmV5Junction.GeneralKey(junction.value);
		case "OnlyChild":
			return XcmV5Junction.OnlyChild();
		case "Plurality":
			return XcmV5Junction.Plurality(junction.value);
		case "GlobalConsensus":
			return XcmV5Junction.GlobalConsensus(toXcmV5NetworkId(junction.value));
		default:
			return assertUnreachable(junction, "Unsupported XCM v3 junction");
	}
};

const toXcmV5Junctions = (junctions: XcmV3Junctions): XcmV5Junctions => {
	switch (junctions.type) {
		case "Here":
			return XcmV5Junctions.Here();
		case "X1":
			return XcmV5Junctions.X1(toXcmV5Junction(junctions.value));
		case "X2":
			return XcmV5Junctions.X2(
				junctions.value.map(toXcmV5Junction) as [XcmV5Junction, XcmV5Junction],
			);
		case "X3":
			return XcmV5Junctions.X3(
				junctions.value.map(toXcmV5Junction) as [
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
				],
			);
		case "X4":
			return XcmV5Junctions.X4(
				junctions.value.map(toXcmV5Junction) as [
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
				],
			);
		case "X5":
			return XcmV5Junctions.X5(
				junctions.value.map(toXcmV5Junction) as [
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
				],
			);
		case "X6":
			return XcmV5Junctions.X6(
				junctions.value.map(toXcmV5Junction) as [
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
				],
			);
		case "X7":
			return XcmV5Junctions.X7(
				junctions.value.map(toXcmV5Junction) as [
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
				],
			);
		case "X8":
			return XcmV5Junctions.X8(
				junctions.value.map(toXcmV5Junction) as [
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
					XcmV5Junction,
				],
			);
		default:
			return assertUnreachable(junctions, "Unsupported XCM v3 junctions");
	}
};

export const toXcmV5Multilocation = (
	multilocation: XcmV3Multilocation,
): XcmV5Multilocation => ({
	parents: multilocation.parents,
	interior: toXcmV5Junctions(multilocation.interior),
});

// TODO take parent chain into account
export const getXcmV5MultilocationFromTokenId = <
	T extends TokenId | null | undefined,
>(
	tokenId: T,
): MultilocationV5<T> => {
	if (!tokenId) return null as MultilocationV5<T>;

	const parsed = parseTokenId(tokenId);

	if (parsed.type === "native")
		return {
			parents: 1,
			interior: XcmV5Junctions.Here(),
		} as MultilocationV5<T>;

	if (parsed.type === "asset")
		return {
			parents: 0,
			interior: XcmV5Junctions.X2([
				XcmV5Junction.PalletInstance(50),
				XcmV5Junction.GeneralIndex(BigInt(parsed.assetId)),
			]),
		} as MultilocationV5<T>;

	if (parsed.type === "foreign-asset")
		return parsed.location as MultilocationV5<T>;

	throw new Error(`Invalid token type: ${parsed.type}`);
};

export const getTokenIdFromXcmV5Multilocation = (
	chainId: ChainId,
	multilocation: XcmV5Multilocation,
): TokenId | null => {
	const { interior } = multilocation;
	if (interior.type === "Here") return `native::${chainId}`;

	if (
		interior.type === "X2" &&
		interior.value.some((e) => e.type === "PalletInstance" && e.value === 50)
	)
		for (const entry of interior.value)
			if (entry.type === "GeneralIndex")
				return getTokenId({
					type: "asset",
					chainId,
					assetId: Number(entry.value),
				});

	if (isChainIdAssetHub(chainId))
		return getTokenId({
			type: "foreign-asset",
			chainId,
			location: multilocation,
		});

	return null;
};
