import { resolve } from "node:path";
import { parseArgs } from "node:util";
import {
	hydration,
	pah,
	XcmV2MultiassetWildFungibility,
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

const XCM_VERSION = 5;
const DEFAULT_OUT = resolve(
	import.meta.dirname,
	"../src/features/swap/routes/xcmDestinationSwap/xcmDestinationSwap.fixtures.ts",
);

const FIXTURE_HEADER = `import type { DryRun } from "../../../../hooks/useDryRun";
import type { Api } from "../../../../papi/getApi";
import type { TokenId } from "../../../../registry/tokens/types";
import type { DeliveryFees, DestinationDryRun } from "../xcm/xcmQuote";

type QuotedPoolHop = {
	tokenIdIn: TokenId;
	tokenIdOut: TokenId;
	reserveIn: bigint;
	reserveOut: bigint;
	amountIn: bigint;
	amountOut: bigint;
	minOut: bigint;
};

export type XcmDestinationSwapFixture = {
	sender: string;
	beneficiary: string;
	tokenIdIn: TokenId;
	tokenIdOut: TokenId;
	amount: bigint;
	slippage: number;
	lpFee: number;
	destinationWeight: { ref_time: bigint; proof_size: bigint };
	destinationFee: bigint;
	hops: QuotedPoolHop[];
	args: Parameters<
		Api<"hydration">["tx"]["PolkadotXcm"]["transfer_assets_using_type_and_then"]
	>[0];
	originDryRun: DryRun<"hydration">;
	deliveryFees: DeliveryFees;
	destinationDryRun: DestinationDryRun;
};
`;

const { values } = parseArgs({
	options: {
		sender: { type: "string" },
		beneficiary: { type: "string" },
		asset: { type: "string" },
		amount: { type: "string" },
		to: { type: "string" },
		slippage: { type: "string", default: "0.005" },
		"price-moved": { type: "boolean", default: false },
		name: { type: "string" },
		out: { type: "string", default: DEFAULT_OUT },
	},
});

const { sender, asset, amount, to, name } = values;
if (
	!sender ||
	!asset ||
	!amount ||
	!to ||
	!name ||
	!/^[A-Za-z_]\w*$/.test(name)
)
	throw new Error(
		"Usage: --sender <Hydration holder> --asset <Hydration asset id> --amount <plancks> --to <native|Asset Hub asset id> --name <export identifier> [--slippage <fraction>] [--price-moved, to double the last min out] [--beneficiary <address>] [--out <path>]",
	);
const beneficiary = values.beneficiary ?? sender;
const slippage = Number(values.slippage);
const plancks = BigInt(amount);

const findChain = (id: string) => {
	const chain = chainsJson.find((chain) => chain.id === id);
	if (!chain) throw new Error(`No chain ${id}`);
	return chain;
};
const assetHub = findChain("pah");
const hydrationChain = findChain("hydration");

const siblingLocation = (paraId: number) =>
	XcmVersionedLocation.V5({
		parents: 1,
		interior: XcmV5Junctions.X1(XcmV5Junction.Parachain(paraId)),
	});

const stringify = (value: unknown) =>
	JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v));

const hydrationClient = createClient(getWsProvider(hydrationChain.wsUrl));
const assetHubClient = createClient(getWsProvider(assetHub.wsUrl));
const hydrationApi = hydrationClient.getTypedApi(hydration);
const assetHubApi = assetHubClient.getTypedApi(pah);

const locationOnHydration =
	await hydrationApi.query.AssetRegistry.AssetLocations.getValue(Number(asset));
if (!locationOnHydration) throw new Error(`No location for asset ${asset}`);

type Location = typeof locationOnHydration;
type PathToken = { tokenId: string; location: Location };

const native: PathToken = {
	tokenId: "native::pah",
	location: { parents: 1, interior: XcmV5Junctions.Here() },
};
const assetHubAsset = (assetId: bigint): PathToken => ({
	tokenId: `asset::pah::${assetId}`,
	location: {
		parents: 0,
		interior: XcmV5Junctions.X2([
			XcmV5Junction.PalletInstance(50),
			XcmV5Junction.GeneralIndex(assetId),
		]),
	},
});

const getMirror = ({ parents, interior }: Location): PathToken => {
	if (parents === 1 && interior.type === "Here") return native;
	if (
		parents === 1 &&
		interior.type === "X3" &&
		interior.value[0].type === "Parachain" &&
		interior.value[0].value === assetHub.paraId &&
		interior.value[1].type === "PalletInstance" &&
		interior.value[1].value === 50 &&
		interior.value[2].type === "GeneralIndex"
	)
		return assetHubAsset(interior.value[2].value);
	throw new Error(`Not an Asset Hub asset: ${stringify(interior)}`);
};

const mirror = getMirror(locationOnHydration);
const output = to === "native" ? native : assetHubAsset(BigInt(to));
const path =
	mirror === native || output === native
		? [mirror, output]
		: [mirror, native, output];

const toFungible = (plancks: bigint) =>
	XcmV3MultiassetFungibility.Fungible(plancks > 0n ? plancks : 1n);
const allOf = ({ location }: PathToken) =>
	XcmV5AssetFilter.Wild(
		XcmV5WildAsset.AllOf({
			id: location,
			fun: XcmV2MultiassetWildFungibility.Fungible(),
		}),
	);
const depositToBeneficiary = (assets: XcmV5AssetFilter) =>
	XcmV5Instruction.DepositAsset({
		assets,
		beneficiary: {
			parents: 0,
			interior: XcmV5Junctions.X1(
				XcmV5Junction.AccountId32({
					network: undefined,
					id: Binary.toHex(AccountId().enc(beneficiary)),
				}),
			),
		},
	});

const buildArgs = (minOuts: bigint[]) => ({
	dest: siblingLocation(assetHub.paraId),
	assets: XcmVersionedAssets.V5([
		{
			id: locationOnHydration,
			fun: XcmV3MultiassetFungibility.Fungible(plancks),
		},
	]),
	assets_transfer_type: Enum("DestinationReserve"),
	remote_fees_id: XcmVersionedAssetId.V5(locationOnHydration),
	fees_transfer_type: Enum("DestinationReserve"),
	custom_xcm_on_dest: XcmVersionedXcm.V5([
		XcmV5Instruction.SetAppendix([
			depositToBeneficiary(XcmV5AssetFilter.Wild(XcmV5WildAsset.AllCounted(1))),
		]),
		...path.slice(1).map((want, index) =>
			XcmV5Instruction.ExchangeAsset({
				give: allOf(path[index] as PathToken),
				want: [{ id: want.location, fun: toFungible(minOuts[index] ?? 0n) }],
				maximal: true,
			}),
		),
		depositToBeneficiary(allOf(output)),
	]),
	weight_limit: XcmV3WeightLimit.Unlimited(),
});

type Event = { type: string; value: { type: string; value: unknown } };
type VersionedLocation = {
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
	forwarded_xcms: [VersionedLocation, unknown[]][];
}>;
type DestinationDryRun = DryRunResult<{
	execution_result: { type: string };
	emitted_events: Event[];
}>;

const dryRunOnHydration = async (args: ReturnType<typeof buildArgs>) => {
	const call =
		hydrationApi.tx.PolkadotXcm.transfer_assets_using_type_and_then(args);
	const dryRun: OriginDryRun = await hydrationApi.apis.DryRunApi.dry_run_call(
		Enum("system", Enum("Signed", sender)),
		call.decodedCall,
		XCM_VERSION,
	);
	if (!dryRun.success || !dryRun.value.execution_result.success)
		throw new Error(`Hydration dry run failed: ${stringify(dryRun)}`);
	const message = dryRun.value.forwarded_xcms.find(
		([location]) =>
			location.type === "V5" &&
			location.value.interior.type === "X1" &&
			location.value.interior.value.type === "Parachain" &&
			location.value.interior.value.value === assetHub.paraId,
	)?.[1][0];
	if (!message) throw new Error("Hydration forwarded no message to Asset Hub");
	return { dryRun, message };
};

const probe = await dryRunOnHydration(buildArgs([]));
const weight = await assetHubApi.apis.XcmPaymentApi.query_xcm_weight(
	probe.message,
);
if (!weight.success) throw new Error(`Cannot weigh: ${stringify(weight)}`);
const fee = await assetHubApi.apis.XcmPaymentApi.query_weight_to_asset_fee(
	weight.value,
	XcmVersionedAssetId.V5(mirror.location),
);
if (!fee.success) throw new Error(`No fee in ${mirror.tokenId}`);
const destinationFee = fee.value;

const lpFee = await assetHubApi.constants.AssetConversion.LPFee();
const applySlippage = (plancksOut: bigint) =>
	(plancksOut * (10000n - BigInt(slippage * 10000))) / 10000n;

const hops = [];
let amountIn = plancks - destinationFee;
for (const [index, want] of path.slice(1).entries()) {
	const give = path[index] as PathToken;
	const reserves = await assetHubApi.apis.AssetConversionApi.get_reserves(
		give.location,
		want.location,
	);
	const amountOut =
		await assetHubApi.apis.AssetConversionApi.quote_price_exact_tokens_for_tokens(
			give.location,
			want.location,
			amountIn,
			true,
		);
	if (!reserves || !amountOut)
		throw new Error(`No pool for ${give.tokenId} to ${want.tokenId}`);
	hops.push({
		tokenIdIn: give.tokenId,
		tokenIdOut: want.tokenId,
		reserveIn: reserves[0],
		reserveOut: reserves[1],
		amountIn,
		amountOut,
		minOut: applySlippage(amountOut),
	});
	amountIn = amountOut;
}

const minOuts = hops.map(({ minOut }, index) =>
	values["price-moved"] && index === hops.length - 1 ? minOut * 2n : minOut,
);
const args = buildArgs(minOuts);
const { dryRun: originDryRun, message } = await dryRunOnHydration(args);
const deliveryFees = await hydrationApi.apis.XcmPaymentApi.query_delivery_fees(
	siblingLocation(assetHub.paraId),
	message,
);
const destinationDryRun: DestinationDryRun =
	await assetHubApi.apis.DryRunApi.dry_run_xcm(
		siblingLocation(hydrationChain.paraId),
		message,
	);

hydrationClient.destroy();
assetHubClient.destroy();

writeFixture({
	out: values.out,
	header: FIXTURE_HEADER,
	type: "XcmDestinationSwapFixture",
	name,
	value: {
		sender,
		beneficiary,
		tokenIdIn: `hydration-asset::hydration::${asset}`,
		tokenIdOut: output.tokenId,
		amount: plancks,
		slippage,
		lpFee,
		destinationWeight: weight.value,
		destinationFee,
		hops,
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
	},
});

console.log(
	stringify({
		name,
		destinationFee,
		hops,
		execution: destinationDryRun.success
			? destinationDryRun.value.execution_result
			: destinationDryRun.value,
		destinationEvents: destinationDryRun.success
			? destinationDryRun.value.emitted_events.map((event) =>
					["AssetConversion", "Assets", "Balances", "PolkadotXcm"].includes(
						event.type,
					)
						? `${event.type}.${event.value.type} ${stringify(event.value.value)}`
						: `${event.type}.${event.value.type}`,
				)
			: [],
	}),
);
process.exit(0);
