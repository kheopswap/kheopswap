import { resolve } from "node:path";
import { parseArgs } from "node:util";
import {
	type pah,
	XcmV3MultiassetFungibility,
	XcmV3WeightLimit,
	XcmV5AssetFilter,
	XcmV5Instruction,
	XcmV5Junction,
	XcmV5Junctions,
	XcmV5NetworkId,
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
	"../src/features/swap/routes/xcm/xcmBridge.fixtures.ts",
);
const XCM_VERSION = 5;
const ASSET_HUB_PARA_ID = 1000;
const BRIDGE_HUB_PARA_ID = 1002;
const BRIDGE_MESSAGES_PALLET_INSTANCE = 53;

const FIXTURE_HEADER = `import {
	XcmV5Junction,
	XcmV5Junctions,
	XcmV5NetworkId,
} from "@polkadot-api/descriptors";
import { getTokenId } from "../../../../registry/tokens/helpers";
import type { XcmHopInbound } from "../../../../utils/xcmHop";
import type { XcmTransferArgs } from "../xcmTransfer/getXcmTransferCall";
import type {
	DeliveryFees,
	DestinationDryRun,
	OriginDryRun,
} from "./xcmQuote";

export type BridgeTransferFixture = (
	| { origin: "pah"; destination: "kah" }
	| { origin: "kah"; destination: "pah" }
) & {
	sender: string;
	beneficiary: string;
	amount: bigint;
	args: XcmTransferArgs;
	originDryRun: OriginDryRun;
	deliveryFees: DeliveryFees | null;
	inbound: XcmHopInbound | null;
	destinationDryRun: DestinationDryRun | null;
};

const getBridgedRelayTokenId = (
	chainId: "pah" | "kah",
	network: XcmV5NetworkId,
) =>
	getTokenId({
		type: "foreign-asset",
		chainId,
		location: {
			parents: 2,
			interior: XcmV5Junctions.X1(XcmV5Junction.GlobalConsensus(network)),
		},
	});

export const KSM_ON_PAH = getBridgedRelayTokenId(
	"pah",
	XcmV5NetworkId.Kusama(),
);
export const DOT_ON_KAH = getBridgedRelayTokenId(
	"kah",
	XcmV5NetworkId.Polkadot(),
);
`;

const HUBS = {
	pah: {
		network: XcmV5NetworkId.Polkadot(),
		bridgeHubName: "Polkadot Bridge Hub",
		bridgeHubWsUrl: [
			"wss://polkadot-bridge-hub-rpc.polkadot.io",
			"wss://bridge-hub-polkadot-rpc.n.dwellir.com",
			"wss://sys.ibp.network/bridgehub-polkadot",
		],
	},
	kah: {
		network: XcmV5NetworkId.Kusama(),
		bridgeHubName: "Kusama Bridge Hub",
		bridgeHubWsUrl: [
			"wss://kusama-bridge-hub-rpc.polkadot.io",
			"wss://bridge-hub-kusama-rpc.n.dwellir.com",
			"wss://sys.ibp.network/bridgehub-kusama",
		],
	},
};
type HubId = keyof typeof HUBS;

const KUSAMA_TREASURY = "F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29";
const HYDRATION_ON_POLKADOT_ASSET_HUB =
	"13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6";
const KSM_PLANCKS = 100_000_000_000n;
const DOT_PLANCKS = 10_000_000_000n;

type Leg = {
	name: string;
	from: HubId;
	to: HubId;
	token: "native" | "bridged";
	sender: string;
	amount: bigint;
	originError?: string;
};

const LEGS: Leg[] = [
	{
		name: "ksmKusamaToPolkadot",
		from: "kah",
		to: "pah",
		token: "native",
		sender: KUSAMA_TREASURY,
		amount: KSM_PLANCKS,
	},
	{
		name: "ksmPolkadotToKusama",
		from: "pah",
		to: "kah",
		token: "bridged",
		sender: HYDRATION_ON_POLKADOT_ASSET_HUB,
		amount: KSM_PLANCKS,
	},
	{
		name: "dotPolkadotToKusama",
		from: "pah",
		to: "kah",
		token: "native",
		sender: HYDRATION_ON_POLKADOT_ASSET_HUB,
		amount: DOT_PLANCKS,
	},
	{
		name: "dotKusamaToPolkadot",
		from: "kah",
		to: "pah",
		token: "bridged",
		sender: KUSAMA_TREASURY,
		amount: DOT_PLANCKS,
	},
];

const { values } = parseArgs({
	options: { out: { type: "string", default: DEFAULT_OUT } },
});

const stringify = (value: unknown) =>
	JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v));

type Event = { type: string; value: { type: string; value: unknown } };
type Instruction = { type: string; value: unknown };
type Message = { type: string; value: Instruction[] };
type Location = {
	type: string;
	value: {
		parents: number;
		interior: { type: string; value: { type: string; value: unknown } };
	};
};
type DryRunResult<T> =
	| { success: true; value: T }
	| { success: false; value: unknown };
type CallDryRun = DryRunResult<{
	execution_result:
		| { success: true; value: unknown }
		| {
				success: false;
				value: {
					error: { type: string; value: { value: { type: string } } };
				};
		  };
	emitted_events: Event[];
	forwarded_xcms: [Location, Message[]][];
}>;
type XcmDryRun = DryRunResult<{
	execution_result: { type: string };
	emitted_events: Event[];
	forwarded_xcms: [Location, Message[]][];
}>;
type ExportMessage = {
	type: "ExportMessage";
	value: {
		network: { type: string };
		destination: { type: string; value: { type: string; value: unknown } };
		xcm: XcmV5Instruction[];
	};
};
type DeliveryFees = DryRunResult<{
	type: string;
	value: { fun: { type: string; value: bigint } }[];
}>;

const relayToken = { parents: 1, interior: XcmV5Junctions.Here() };
const sibling = (paraId: number) =>
	XcmVersionedLocation.V5({
		parents: 1,
		interior: XcmV5Junctions.X1(XcmV5Junction.Parachain(paraId)),
	});
const bridgedToken = (hub: HubId) => ({
	parents: 2,
	interior: XcmV5Junctions.X1(XcmV5Junction.GlobalConsensus(HUBS[hub].network)),
});
const bridgedHub = (hub: HubId) => ({
	parents: 2,
	interior: XcmV5Junctions.X2([
		XcmV5Junction.GlobalConsensus(HUBS[hub].network),
		XcmV5Junction.Parachain(ASSET_HUB_PARA_ID),
	]),
});

const getArgs = ({ to, token, sender, amount }: Leg) => {
	const id = token === "native" ? relayToken : bridgedToken(to);
	const transferType = Enum(
		token === "native" ? "LocalReserve" : "DestinationReserve",
	);
	return {
		dest: XcmVersionedLocation.V5(bridgedHub(to)),
		assets: XcmVersionedAssets.V5([
			{ id, fun: XcmV3MultiassetFungibility.Fungible(amount) },
		]),
		assets_transfer_type: transferType,
		remote_fees_id: XcmVersionedAssetId.V5(id),
		fees_transfer_type: transferType,
		custom_xcm_on_dest: XcmVersionedXcm.V5([
			XcmV5Instruction.DepositAsset({
				assets: XcmV5AssetFilter.Wild(XcmV5WildAsset.AllCounted(1)),
				beneficiary: {
					parents: 0,
					interior: XcmV5Junctions.X1(
						XcmV5Junction.AccountId32({
							network: undefined,
							id: Binary.toHex(AccountId().enc(sender)),
						}),
					),
				},
			}),
		]),
		weight_limit: XcmV3WeightLimit.Unlimited(),
	};
};

const isExportTo = (
	instruction: Instruction,
	to: HubId,
): instruction is ExportMessage => {
	if (instruction.type !== "ExportMessage") return false;
	const { network, destination } = (instruction as ExportMessage).value;
	return (
		network.type === HUBS[to].network.type &&
		destination.type === "X1" &&
		destination.value.type === "Parachain" &&
		destination.value.value === ASSET_HUB_PARA_ID
	);
};

const findWrapper = (forwarded: [Location, Message[]][], to: HubId) => {
	for (const [location, messages] of forwarded) {
		const { parents, interior } = location.value;
		if (
			location.type !== "V5" ||
			parents !== 1 ||
			interior.type !== "X1" ||
			interior.value.type !== "Parachain" ||
			interior.value.value !== BRIDGE_HUB_PARA_ID
		)
			continue;
		for (const wrapper of messages) {
			const exported = wrapper.value.find(
				(instruction): instruction is ExportMessage =>
					isExportTo(instruction, to),
			);
			if (exported) return { wrapper, inner: exported.value.xcm };
		}
	}
	return null;
};

const sumFees = (events: Event[]) =>
	events
		.filter(
			({ type, value }) => type === "PolkadotXcm" && value.type === "FeesPaid",
		)
		.flatMap(
			({ value }) =>
				(value.value as { fees: { fun: { value: bigint } }[] }).fees,
		)
		.reduce((sum, { fun }) => sum + fun.value, 0n);

const keepXcmEvents = <T extends { emitted_events: Event[] }>(value: T): T => ({
	...value,
	emitted_events: value.emitted_events.filter(
		({ type }) => type === "PolkadotXcm",
	),
});

const findChain = (id: HubId) => {
	const chain = chainsJson.find((chain) => chain.id === id);
	if (!chain) throw new Error(`No chain ${id}`);
	return chain;
};

const clients = {
	pah: createClient(getWsProvider(findChain("pah").wsUrl)),
	kah: createClient(getWsProvider(findChain("kah").wsUrl)),
};
const bridgeHubClients = {
	pah: createClient(getWsProvider(HUBS.pah.bridgeHubWsUrl)),
	kah: createClient(getWsProvider(HUBS.kah.bridgeHubWsUrl)),
};
const apis = {
	pah: clients.pah.getUnsafeApi<typeof pah>(),
	kah: clients.kah.getUnsafeApi<typeof pah>(),
};

const capture = async (leg: Leg) => {
	const { name, from, to, sender, amount, originError } = leg;
	const args = getArgs(leg);
	const call =
		await apis[from].tx.PolkadotXcm.transfer_assets_using_type_and_then(args);
	const originDryRun: CallDryRun = await apis[from].apis.DryRunApi.dry_run_call(
		Enum("system", Enum("Signed", sender)),
		call.decodedCall,
		XCM_VERSION,
	);
	if (!originDryRun.success)
		throw new Error(
			`${name}: ${from} dry run failed: ${stringify(originDryRun)}`,
		);

	const fixture = {
		origin: from,
		destination: to,
		sender,
		beneficiary: sender,
		amount,
		args,
		originDryRun: { ...originDryRun, value: keepXcmEvents(originDryRun.value) },
	};
	const write = (rest: {
		deliveryFees: unknown;
		inbound: unknown;
		destinationDryRun: unknown;
	}) =>
		writeFixture({
			out: values.out,
			header: FIXTURE_HEADER,
			type: "BridgeTransferFixture",
			name,
			value: { ...fixture, ...rest },
		});

	const { execution_result } = originDryRun.value;
	if (originError) {
		if (
			execution_result.success ||
			execution_result.value.error.value.value.type !== originError
		)
			throw new Error(
				`${name}: expected ${from} to fail with ${originError}: ${stringify(execution_result)}`,
			);
		write({ deliveryFees: null, inbound: null, destinationDryRun: null });
		console.log(stringify({ name, from, to, originError }));
		return;
	}
	if (!execution_result.success)
		throw new Error(
			`${name}: ${from} rejected: ${stringify(execution_result)}`,
		);

	const forwarded = findWrapper(originDryRun.value.forwarded_xcms, to);
	if (!forwarded)
		throw new Error(`${name}: ${from} exported no message for ${to}`);
	const inner = XcmVersionedXcm.V5(forwarded.inner);

	const deliveryFees: DeliveryFees = await apis[
		from
	].apis.XcmPaymentApi.query_delivery_fees(
		XcmVersionedLocation.V5(bridgedHub(to)),
		inner,
		XcmVersionedAssetId.V5(relayToken),
	);
	const feesPaid = sumFees(originDryRun.value.emitted_events);
	const feesQuoted = deliveryFees.success
		? deliveryFees.value.value.reduce((sum, { fun }) => sum + fun.value, 0n)
		: null;
	if (feesQuoted !== feesPaid)
		throw new Error(
			`${name}: ${from} quotes a bridge fee of ${feesQuoted} and charges ${feesPaid}`,
		);

	const inbound = {
		origin: sibling(BRIDGE_HUB_PARA_ID),
		message: XcmVersionedXcm.V5([
			XcmV5Instruction.DescendOrigin(
				XcmV5Junctions.X1(
					XcmV5Junction.PalletInstance(BRIDGE_MESSAGES_PALLET_INSTANCE),
				),
			),
			XcmV5Instruction.UniversalOrigin(
				XcmV5Junction.GlobalConsensus(HUBS[from].network),
			),
			XcmV5Instruction.DescendOrigin(
				XcmV5Junctions.X1(XcmV5Junction.Parachain(ASSET_HUB_PARA_ID)),
			),
			...forwarded.inner,
		]),
	};
	const destinationDryRun: XcmDryRun = await apis[
		to
	].apis.DryRunApi.dry_run_xcm(inbound.origin, inbound.message);
	if (
		!destinationDryRun.success ||
		destinationDryRun.value.execution_result.type !== "Complete"
	)
		throw new Error(
			`${name}: ${to} would not complete the inbound message: ${stringify(destinationDryRun)}`,
		);

	const bridgeHubDryRun: XcmDryRun = await bridgeHubClients[from]
		.getUnsafeApi<typeof pah>()
		.apis.DryRunApi.dry_run_xcm(sibling(ASSET_HUB_PARA_ID), forwarded.wrapper);
	const accepted =
		bridgeHubDryRun.success &&
		bridgeHubDryRun.value.execution_result.type === "Complete"
			? bridgeHubDryRun.value.emitted_events.find(
					({ value }) => value.type === "MessageAccepted",
				)
			: undefined;
	if (!accepted)
		throw new Error(
			`${name}: ${HUBS[from].bridgeHubName} did not accept the exported message: ${stringify(bridgeHubDryRun)}`,
		);

	write({ deliveryFees, inbound, destinationDryRun });
	console.log(
		stringify({
			name,
			from,
			to,
			bridgeFee: feesPaid,
			destinationEvents: destinationDryRun.value.emitted_events.map(
				(event) => `${event.type}.${event.value.type}`,
			),
			bridgeHub: `${HUBS[from].bridgeHubName} accepted: ${accepted.type}.${accepted.value.type} ${stringify(accepted.value.value)}`,
		}),
	);
};

for (const leg of LEGS) await capture(leg);

for (const client of [
	...Object.values(clients),
	...Object.values(bridgeHubClients),
])
	client.destroy();
process.exit(0);
