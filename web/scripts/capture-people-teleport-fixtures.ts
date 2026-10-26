import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import {
	type pah,
	type ppeople,
	XcmV3MultiassetFungibility,
	XcmV3WeightLimit,
	XcmV5AssetFilter,
	XcmV5Instruction,
	XcmV5Junction,
	XcmV5Junctions,
	XcmV5WildAsset,
	XcmVersionedAssetId,
	XcmVersionedAssets,
	XcmVersionedLocation,
	XcmVersionedXcm,
} from "@polkadot-api/descriptors";
import { AccountId, Binary, createClient, Enum } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws";
import chainsJson from "../src/registry/chains/chains.prod.json" with {
	type: "json",
};
import {
	DESCRIPTORS_ASSET_HUB,
	DESCRIPTORS_PEOPLE,
} from "../src/registry/chains/descriptors.ts";

const DEFAULT_OUT = resolve(
	import.meta.dirname,
	"../src/features/swap/routes/xcm/xcmToPeople.fixtures.ts",
);
const XCM_VERSION = 5;

const FIXTURE_HEADER = `import type { RelayId } from "../../../../registry/chains/types";
import type { XcmTransferArgs } from "../xcmTransfer/getXcmTransferCall";
import type {
	DeliveryFees,
	DestinationDryRun,
	OriginDryRun,
} from "./xcmQuote";

export type PeopleTeleportFixture = {
	relay: RelayId;
	sender: string;
	beneficiary: string;
	amount: bigint;
	args: XcmTransferArgs;
	originDryRun: OriginDryRun;
	deliveryFees: DeliveryFees;
	destinationDryRun: DestinationDryRun;
};
`;

const { values } = parseArgs({
	options: {
		relay: { type: "string" },
		sender: { type: "string" },
		beneficiary: { type: "string" },
		amount: { type: "string" },
		name: { type: "string" },
		out: { type: "string", default: DEFAULT_OUT },
	},
});

const { relay, sender, amount, name, out } = values;
if (!relay || !sender || !amount || !name || !/^[A-Za-z_]\w*$/.test(name))
	throw new Error(
		"Usage: --relay <relay> --sender <any funded address> --amount <plancks> --name <export identifier> [--beneficiary <address, empty to capture the below-ED trap>] [--out <path>]",
	);
const beneficiary = values.beneficiary ?? sender;

type ChainEntry = {
	id: string;
	relay: string;
	paraId: number;
	wsUrl: string[];
};
const chains: ChainEntry[] = chainsJson;

const findChain = (ids: Record<string, unknown>) => {
	const chain = chains.find(
		(chain) => chain.relay === relay && chain.id in ids,
	);
	if (!chain) throw new Error(`No such chain on relay ${relay}`);
	return chain;
};

const assetHub = findChain(DESCRIPTORS_ASSET_HUB);
const people = findChain(DESCRIPTORS_PEOPLE);

const relayToken = { parents: 1, interior: XcmV5Junctions.Here() };
const siblingLocation = (paraId: number) =>
	XcmVersionedLocation.V5({
		parents: 1,
		interior: XcmV5Junctions.X1(XcmV5Junction.Parachain(paraId)),
	});

const args = {
	dest: siblingLocation(people.paraId),
	assets: XcmVersionedAssets.V5([
		{
			id: relayToken,
			fun: XcmV3MultiassetFungibility.Fungible(BigInt(amount)),
		},
	]),
	assets_transfer_type: Enum("Teleport"),
	remote_fees_id: XcmVersionedAssetId.V5(relayToken),
	fees_transfer_type: Enum("Teleport"),
	custom_xcm_on_dest: XcmVersionedXcm.V5([
		XcmV5Instruction.DepositAsset({
			assets: XcmV5AssetFilter.Wild(XcmV5WildAsset.AllCounted(1)),
			beneficiary: {
				parents: 0,
				interior: XcmV5Junctions.X1(
					XcmV5Junction.AccountId32({
						network: undefined,
						id: Binary.toHex(AccountId().enc(beneficiary)),
					}),
				),
			},
		}),
	]),
	weight_limit: XcmV3WeightLimit.Unlimited(),
};

const stringify = (value: unknown) =>
	JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v));

const assetHubClient = createClient(getWsProvider(assetHub.wsUrl));
const peopleClient = createClient(getWsProvider(people.wsUrl));
const assetHubApi = assetHubClient.getUnsafeApi<typeof pah>();
const peopleApi = peopleClient.getUnsafeApi<typeof ppeople>();

type Event = { type: string; value: { type: string } };
type Location = {
	type: string;
	value: {
		interior: { type: string; value: { type: string; value: unknown } };
	};
};
type DryRunResult<T> =
	| { success: true; value: T }
	| { success: false; value: unknown };
type OriginDryRun = DryRunResult<{
	execution_result: { success: boolean };
	emitted_events: Event[];
	forwarded_xcms: [Location, unknown[]][];
}>;
type DestinationDryRun = DryRunResult<{
	execution_result: { type: string };
	emitted_events: Event[];
}>;

const call =
	await assetHubApi.tx.PolkadotXcm.transfer_assets_using_type_and_then(args);
const originDryRun: OriginDryRun =
	await assetHubApi.apis.DryRunApi.dry_run_call(
		Enum("system", Enum("Signed", sender)),
		call.decodedCall,
		XCM_VERSION,
	);
if (!originDryRun.success || !originDryRun.value.execution_result.success)
	throw new Error(`Asset Hub dry run failed: ${stringify(originDryRun)}`);

const message = originDryRun.value.forwarded_xcms.find(
	([location]) =>
		location.type === "V5" &&
		location.value.interior.type === "X1" &&
		location.value.interior.value.type === "Parachain" &&
		location.value.interior.value.value === people.paraId,
)?.[1][0];
if (!message) throw new Error("Asset Hub forwarded no message to People");

const deliveryFees = await assetHubApi.apis.XcmPaymentApi.query_delivery_fees(
	siblingLocation(people.paraId),
	message,
	XcmVersionedAssetId.V5(relayToken),
);
const destinationDryRun: DestinationDryRun =
	await peopleApi.apis.DryRunApi.dry_run_xcm(
		siblingLocation(assetHub.paraId),
		message,
	);

assetHubClient.destroy();
peopleClient.destroy();

const fixture = {
	relay,
	sender,
	beneficiary,
	amount: BigInt(amount),
	args,
	originDryRun: {
		...originDryRun,
		value: {
			...originDryRun.value,
			emitted_events: originDryRun.value.emitted_events.filter(
				({ type }) => type === "PolkadotXcm",
			),
		},
	},
	deliveryFees,
	destinationDryRun,
};

const PLAIN_KEY = /^[A-Za-z_$][\w$]*$/;

const toLiteral = (value: unknown, indent = ""): string => {
	const inner = `${indent}\t`;
	switch (typeof value) {
		case "undefined":
			return "undefined";
		case "bigint":
			return `${value}n`;
		case "string":
			return JSON.stringify(value);
		case "number":
		case "boolean":
			return String(value);
	}
	if (value === null) return "null";
	if (Array.isArray(value))
		return `[\n${value.map((item) => `${inner}${toLiteral(item, inner)},\n`).join("")}${indent}]`;
	if (
		typeof value !== "object" ||
		Object.getPrototypeOf(value) !== Object.prototype
	)
		throw new Error(`Cannot write ${String(value)} as a literal`);
	return `{\n${Object.entries(value)
		.map(
			([key, item]) =>
				`${inner}${PLAIN_KEY.test(key) ? key : JSON.stringify(key)}: ${toLiteral(item, inner)},\n`,
		)
		.join("")}${indent}}`;
};

const exportBlock = `export const ${name}: PeopleTeleportFixture = ${toLiteral(fixture)};\n`;

const outPath = resolve(out);
const source = existsSync(outPath)
	? readFileSync(outPath, "utf8")
	: FIXTURE_HEADER;
const existing = new RegExp(
	`export const ${name}: PeopleTeleportFixture = \\{[\\s\\S]*?\\n\\};\\n`,
);
writeFileSync(
	outPath,
	existing.test(source)
		? source.replace(existing, exportBlock)
		: `${source}\n${exportBlock}`,
);
execFileSync("pnpm", ["exec", "biome", "format", "--write", outPath], {
	cwd: import.meta.dirname,
	stdio: "inherit",
});

console.log(
	stringify({
		name,
		relay,
		execution: destinationDryRun.success
			? destinationDryRun.value.execution_result.type
			: destinationDryRun.value,
		destinationEvents: destinationDryRun.success
			? destinationDryRun.value.emitted_events.map(
					(event) => `${event.type}.${event.value.type}`,
				)
			: [],
		deliveryFees,
	}),
);
process.exit(0);
