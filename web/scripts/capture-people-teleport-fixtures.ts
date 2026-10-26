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
import { writeFixture } from "./writeFixture.ts";

const FIXTURES_DIR = resolve(
	import.meta.dirname,
	"../src/features/swap/routes/xcm",
);
const DEFAULT_OUT = {
	"asset-hub": resolve(FIXTURES_DIR, "xcmToPeople.fixtures.ts"),
	people: resolve(FIXTURES_DIR, "xcmFromPeople.fixtures.ts"),
};
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
		origin: { type: "string", default: "asset-hub" },
		sender: { type: "string" },
		beneficiary: { type: "string" },
		amount: { type: "string" },
		name: { type: "string" },
		out: { type: "string" },
	},
});

const { relay, origin, sender, amount, name } = values;
if (
	!relay ||
	(origin !== "asset-hub" && origin !== "people") ||
	!sender ||
	!amount ||
	!name ||
	!/^[A-Za-z_]\w*$/.test(name)
)
	throw new Error(
		"Usage: --relay <relay> [--origin asset-hub|people] --sender <any funded address> --amount <plancks> --name <export identifier> [--beneficiary <address, empty to capture the below-ED trap>] [--out <path>]",
	);
const out = values.out ?? DEFAULT_OUT[origin];
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
const [from, to] =
	origin === "asset-hub" ? [assetHub, people] : [people, assetHub];

const relayToken = { parents: 1, interior: XcmV5Junctions.Here() };
const siblingLocation = (paraId: number) =>
	XcmVersionedLocation.V5({
		parents: 1,
		interior: XcmV5Junctions.X1(XcmV5Junction.Parachain(paraId)),
	});

const args = {
	dest: siblingLocation(to.paraId),
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

const fromClient = createClient(getWsProvider(from.wsUrl));
const toClient = createClient(getWsProvider(to.wsUrl));
const fromApi = fromClient.getUnsafeApi<typeof pah | typeof ppeople>();
const toApi = toClient.getUnsafeApi<typeof pah | typeof ppeople>();

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
	await fromApi.tx.PolkadotXcm.transfer_assets_using_type_and_then(args);
const originDryRun: OriginDryRun = await fromApi.apis.DryRunApi.dry_run_call(
	Enum("system", Enum("Signed", sender)),
	call.decodedCall,
	XCM_VERSION,
);
if (!originDryRun.success || !originDryRun.value.execution_result.success)
	throw new Error(`${from.id} dry run failed: ${stringify(originDryRun)}`);

const message = originDryRun.value.forwarded_xcms.find(
	([location]) =>
		location.type === "V5" &&
		location.value.interior.type === "X1" &&
		location.value.interior.value.type === "Parachain" &&
		location.value.interior.value.value === to.paraId,
)?.[1][0];
if (!message) throw new Error(`${from.id} forwarded no message to ${to.id}`);

const deliveryFees = await fromApi.apis.XcmPaymentApi.query_delivery_fees(
	siblingLocation(to.paraId),
	message,
	XcmVersionedAssetId.V5(relayToken),
);
const destinationDryRun: DestinationDryRun =
	await toApi.apis.DryRunApi.dry_run_xcm(siblingLocation(from.paraId), message);

fromClient.destroy();
toClient.destroy();

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

writeFixture({
	out,
	header: FIXTURE_HEADER,
	type: "PeopleTeleportFixture",
	name,
	value: fixture,
});

console.log(
	stringify({
		name,
		relay,
		origin,
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
