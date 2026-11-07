import { resolve } from "node:path";
import { parseArgs } from "node:util";
import {
	type hydration,
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
import { writeFixture } from "./writeFixture.ts";

const DEFAULT_OUT = resolve(
	import.meta.dirname,
	"../src/features/swap/routes/xcm/xcmHubTransfer.fixtures.ts",
);
const XCM_VERSION = 5;

const FIXTURE_HEADER = `import type { XcmTransferArgs } from "../xcmTransfer/getXcmTransferCall";
import type {
	DeliveryFees,
	DestinationDryRun,
	HubDryRun,
	OriginDryRun,
} from "./xcmQuote";

export type HubTransferFixture = {
	sender: string;
	beneficiary: string;
	amount: bigint;
	args: XcmTransferArgs;
	originDryRun: OriginDryRun;
	deliveryFees: DeliveryFees;
	hubDryRun: HubDryRun;
	destinationDryRun: DestinationDryRun | null;
};
`;

const LEGS = {
	ppeople: { toHub: "Teleport", forward: "InitiateTeleport" },
	hydration: { toHub: "DestinationReserve", forward: "DepositReserveAsset" },
} as const;
type RemoteChainId = keyof typeof LEGS;
const isRemoteChainId = (id: string | undefined): id is RemoteChainId =>
	!!id && id in LEGS;

const { values } = parseArgs({
	options: {
		from: { type: "string" },
		to: { type: "string" },
		sender: { type: "string" },
		beneficiary: { type: "string" },
		amount: { type: "string" },
		name: { type: "string" },
		out: { type: "string", default: DEFAULT_OUT },
	},
});

const { from, to, sender, amount, name, out } = values;
if (
	!isRemoteChainId(from) ||
	!isRemoteChainId(to) ||
	from === to ||
	!sender ||
	!amount ||
	!name ||
	!/^[A-Za-z_]\w*$/.test(name)
)
	throw new Error(
		"Usage: --from ppeople|hydration --to hydration|ppeople --sender <funded address> --amount <plancks> --name <export identifier> [--beneficiary <address>] [--out <path>]",
	);
const beneficiary = values.beneficiary ?? sender;
const plancks = BigInt(amount);

const findChain = (id: string) => {
	const chain = chainsJson.find((chain) => chain.id === id);
	if (!chain) throw new Error(`No chain ${id}`);
	return chain;
};
const origin = findChain(from);
const hub = findChain("pah");
const destination = findChain(to);

const dot = { parents: 1, interior: XcmV5Junctions.Here() };
const sibling = (paraId: number) => ({
	parents: 1,
	interior: XcmV5Junctions.X1(XcmV5Junction.Parachain(paraId)),
});
const anyOneAsset = XcmV5AssetFilter.Wild(XcmV5WildAsset.AllCounted(1));

const onDestination = [
	XcmV5Instruction.BuyExecution({
		fees: { id: dot, fun: XcmV3MultiassetFungibility.Fungible(plancks / 2n) },
		weight_limit: XcmV3WeightLimit.Unlimited(),
	}),
	XcmV5Instruction.DepositAsset({
		assets: anyOneAsset,
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
];

const forward =
	LEGS[to].forward === "InitiateTeleport"
		? XcmV5Instruction.InitiateTeleport({
				assets: anyOneAsset,
				dest: sibling(destination.paraId),
				xcm: onDestination,
			})
		: XcmV5Instruction.DepositReserveAsset({
				assets: anyOneAsset,
				dest: sibling(destination.paraId),
				xcm: onDestination,
			});

const transferType = Enum(LEGS[from].toHub);
const args = {
	dest: XcmVersionedLocation.V5(sibling(hub.paraId)),
	assets: XcmVersionedAssets.V5([
		{ id: dot, fun: XcmV3MultiassetFungibility.Fungible(plancks) },
	]),
	assets_transfer_type: transferType,
	remote_fees_id: XcmVersionedAssetId.V5(dot),
	fees_transfer_type: transferType,
	custom_xcm_on_dest: XcmVersionedXcm.V5([forward]),
	weight_limit: XcmV3WeightLimit.Unlimited(),
};

const stringify = (value: unknown) =>
	JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v));

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
type CallDryRun = DryRunResult<{
	execution_result: { success: boolean };
	emitted_events: Event[];
	forwarded_xcms: [Location, unknown[]][];
}>;
type XcmDryRun = DryRunResult<{
	execution_result: { type: string };
	emitted_events: Event[];
	forwarded_xcms: [Location, unknown[]][];
}>;

const findForwarded = (
	forwarded: [Location, unknown[]][],
	paraId: number,
): unknown =>
	forwarded.find(
		([location]) =>
			location.type === "V5" &&
			location.value.interior.type === "X1" &&
			location.value.interior.value.type === "Parachain" &&
			location.value.interior.value.value === paraId,
	)?.[1][0];

const keepXcmEvents = <T extends { emitted_events: Event[] }>(value: T): T => ({
	...value,
	emitted_events: value.emitted_events.filter(
		({ type }) => type === "PolkadotXcm",
	),
});

const originClient = createClient(getWsProvider(origin.wsUrl));
const hubClient = createClient(getWsProvider(hub.wsUrl));
const destinationClient = createClient(getWsProvider(destination.wsUrl));
const originApi = originClient.getUnsafeApi<
	typeof ppeople | typeof hydration
>();
const hubApi = hubClient.getUnsafeApi<typeof pah>();
const destinationApi = destinationClient.getUnsafeApi<
	typeof ppeople | typeof hydration
>();

const call =
	await originApi.tx.PolkadotXcm.transfer_assets_using_type_and_then(args);
const originDryRun: CallDryRun = await originApi.apis.DryRunApi.dry_run_call(
	Enum("system", Enum("Signed", sender)),
	call.decodedCall,
	XCM_VERSION,
);
if (!originDryRun.success || !originDryRun.value.execution_result.success)
	throw new Error(`${from} dry run failed: ${stringify(originDryRun)}`);

const toHub = findForwarded(originDryRun.value.forwarded_xcms, hub.paraId);
if (!toHub) throw new Error(`${from} forwarded no message to Asset Hub`);

const hubLocation = XcmVersionedLocation.V5(sibling(hub.paraId));
const deliveryFees =
	from === "hydration"
		? await originApi.apis.XcmPaymentApi.query_delivery_fees(hubLocation, toHub)
		: await originApi.apis.XcmPaymentApi.query_delivery_fees(
				hubLocation,
				toHub,
				XcmVersionedAssetId.V5(dot),
			);

const hubDryRun: XcmDryRun = await hubApi.apis.DryRunApi.dry_run_xcm(
	XcmVersionedLocation.V5(sibling(origin.paraId)),
	toHub,
);
const toDestination =
	hubDryRun.success &&
	findForwarded(hubDryRun.value.forwarded_xcms, destination.paraId);
const destinationDryRun: XcmDryRun | null = toDestination
	? await destinationApi.apis.DryRunApi.dry_run_xcm(hubLocation, toDestination)
	: null;

originClient.destroy();
hubClient.destroy();
destinationClient.destroy();

writeFixture({
	out,
	header: FIXTURE_HEADER,
	type: "HubTransferFixture",
	name,
	value: {
		sender,
		beneficiary,
		amount: plancks,
		args,
		originDryRun: { ...originDryRun, value: keepXcmEvents(originDryRun.value) },
		deliveryFees,
		hubDryRun: hubDryRun.success
			? { ...hubDryRun, value: keepXcmEvents(hubDryRun.value) }
			: hubDryRun,
		destinationDryRun,
	},
});

const describeXcmDryRun = (dryRun: XcmDryRun | null) =>
	dryRun?.success
		? {
				execution: dryRun.value.execution_result.type,
				events: dryRun.value.emitted_events.map(
					(event) => `${event.type}.${event.value.type}`,
				),
			}
		: dryRun?.value;

console.log(
	stringify({
		name,
		from,
		to,
		deliveryFees,
		hub: describeXcmDryRun(hubDryRun),
		destination: describeXcmDryRun(destinationDryRun),
	}),
);
process.exit(0);
