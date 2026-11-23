import { describe, expect, it } from "vitest";
import { getChains } from "../registry/chains/chains";
import { getEvmNetworks } from "../registry/evmNetworks/evmNetworks";
import { getBlockExplorerUrl } from "./getBlockExplorerUrl";

const ss58 = "15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5";
const hash =
	"0x8b0f5d0e0a3c2e7a6b1f4d9c3e2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f40";
const ethereumAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

const subscanLinks = (baseUrl: string) =>
	[
		[baseUrl, "account", ss58, `${baseUrl}/account/${ss58}`],
		[baseUrl, "extrinsic", hash, `${baseUrl}/extrinsic/${hash}`],
	] as const;

const registryLinks = [
	...subscanLinks("https://assethub-polkadot.subscan.io"),
	...subscanLinks("https://assethub-kusama.subscan.io"),
	...subscanLinks("https://assethub-westend.subscan.io"),
	...subscanLinks("https://assethub-paseo.subscan.io"),
	...subscanLinks("https://hydration.subscan.io"),
	...subscanLinks("https://people-polkadot.subscan.io"),
	...subscanLinks("https://people-kusama.subscan.io"),
	...subscanLinks("https://people-westend.subscan.io"),
	[
		"https://blockscout.polkadot.io/",
		"tx",
		hash,
		`https://blockscout.polkadot.io/tx/${hash}`,
	],
	[
		"https://blockscout-kusama-asset-hub.parity-chains-scw.parity.io/",
		"tx",
		hash,
		`https://blockscout-kusama-asset-hub.parity-chains-scw.parity.io/tx/${hash}`,
	],
	[
		"https://blockscout-asset-hub.parity-chains-scw.parity.io",
		"tx",
		hash,
		`https://blockscout-asset-hub.parity-chains-scw.parity.io/tx/${hash}`,
	],
	[
		"https://blockscout-testnet.polkadot.io/",
		"tx",
		hash,
		`https://blockscout-testnet.polkadot.io/tx/${hash}`,
	],
	[
		"https://etherscan.io",
		"address",
		ethereumAddress,
		`https://etherscan.io/address/${ethereumAddress}`,
	],
] as const;

describe("getBlockExplorerUrl", () => {
	it.each(registryLinks)(
		"joins %s, %s and the id",
		(baseUrl, type, id, expected) => {
			expect(getBlockExplorerUrl(baseUrl, id, type)).toBe(expected);
		},
	);

	it("covers every explorer of the registry", () => {
		const registryBaseUrls = [
			...getChains().flatMap((chain) => [
				chain.blockExplorerUrl,
				...(chain.evmBlockExplorers ?? []),
			]),
			...getEvmNetworks().map((network) => network.explorerUrl),
		].filter(Boolean);

		expect(new Set(registryBaseUrls)).toEqual(
			new Set(registryLinks.map(([baseUrl]) => baseUrl)),
		);
	});

	it.each(["https://x.io/sub", "https://x.io/sub/"])(
		"keeps the path of %s",
		(baseUrl) => {
			expect(getBlockExplorerUrl(baseUrl, hash, "tx")).toBe(
				`https://x.io/sub/tx/${hash}`,
			);
		},
	);

	it.each([null, undefined, ""])(
		"returns null without a base url",
		(baseUrl) => {
			expect(getBlockExplorerUrl(baseUrl, ss58, "account")).toBeNull();
		},
	);

	it("returns null without an id", () => {
		expect(
			getBlockExplorerUrl("https://hydration.subscan.io", "", "account"),
		).toBeNull();
	});
});
