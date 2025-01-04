import { type Api, getApi$, isApiIn } from "@kheopswap/papi";
import {
	type Chain,
	type ChainId,
	type Token,
	XcmV3Junction,
	XcmV3Junctions,
	XcmV3MultiassetFungibility,
	type XcmV3Multilocation,
	XcmV3WeightLimit,
	XcmVersionedAssets,
	XcmVersionedLocation,
	getChainById,
	isRelay,
} from "@kheopswap/registry";
import {
	type LoadableState,
	isBigInt,
	isNumber,
	loadableData,
	loadableError,
	loadableLoading,
} from "@kheopswap/utils";
import { AccountId, Binary, type SS58String } from "polkadot-api";
import { type Observable, catchError, map, of, startWith } from "rxjs";
import type { AnyTransaction } from "src/types";
import type { OperationInputs } from "../operationInputs";

export const getXcmTransaction$ = (
	inputs: OperationInputs,
): Observable<LoadableState<AnyTransaction | null>> => {
	if (inputs.type !== "xcm") of(loadableData(null)); //throw new Error("Invalid operation type");

	const { account, recipient, plancksIn } = inputs;
	const tokenIn = inputs.tokenIn?.token;
	const tokenOut = inputs.tokenOut?.token;
	const isLoading =
		inputs.tokenIn?.status !== "loaded" || inputs.tokenOut?.status !== "loaded";

	if (!account || !tokenIn || !tokenOut || !recipient || !isBigInt(plancksIn))
		return of(loadableData(null));

	return getApi$(tokenIn.chainId).pipe(
		map((api) => getXcmCall(api, tokenIn, tokenOut, plancksIn, recipient)),
		map((tx) => loadableData<AnyTransaction | null>(tx, isLoading)),
		startWith(loadableLoading<AnyTransaction>()),
		catchError((error) => of(loadableError<AnyTransaction>(error))),
	);
};

const getXcmCall = (
	api: Api<ChainId>,
	tokenIn: Token,
	tokenOut: Token,
	plancks: bigint,
	recipient: string,
): AnyTransaction | null => {
	if (isApiIn(api, ["polkadot", "kusama", "paseo"]))
		return api.tx.XcmPallet.transfer_assets({
			assets: getAssets(api.chainId, tokenIn, tokenOut, plancks),
			dest: getDestLocation(api.chainId, tokenOut),
			beneficiary: getBeneficiary(recipient),
			fee_asset_item: 0,
			weight_limit: XcmV3WeightLimit.Unlimited(),
		});

	if (isApiIn(api, ["pah", "kah", "pasah", "bifrostPolkadot", "wah"]))
		return api.tx.PolkadotXcm.transfer_assets({
			assets: getAssets(api.chainId, tokenIn, tokenOut, plancks),
			dest: getDestLocation(api.chainId, tokenOut),
			beneficiary: getBeneficiary(recipient),
			fee_asset_item: 0,
			weight_limit: XcmV3WeightLimit.Unlimited(),
		});

	if (isApiIn(api, ["hydration"]))
		return api.tx.PolkadotXcm.transfer_assets({
			assets: getAssets(api.chainId, tokenIn, tokenOut, plancks),
			dest: getDestLocation(api.chainId, tokenOut),
			beneficiary: getBeneficiary(recipient),
			fee_asset_item: 0,
			weight_limit: XcmV3WeightLimit.Unlimited(),
		});

	throw new Error("Unsupported xcm transfer");
};

const encodeAccount = AccountId().enc;

const getBeneficiary = (address: SS58String) =>
	XcmVersionedLocation.V4({
		parents: 0,
		interior: XcmV3Junctions.X1(
			XcmV3Junction.AccountId32({
				network: undefined,
				id: Binary.fromBytes(encodeAccount(address)),
			}),
		),
	});

const getAssets = (
	fromChainId: ChainId,
	tokenIn: Token,
	tokenOut: Token,
	plancks: bigint,
) => {
	// location needs to be derived from one of the 2 tokens
	const token = findOriginToken(tokenIn, tokenOut);

	return XcmVersionedAssets.V4([
		{
			id: getAssetLocation(fromChainId, token),
			fun: XcmV3MultiassetFungibility.Fungible(plancks),
		},
	]);
};

const getAssetLocation = (
	fromChainId: ChainId,
	token: Token,
): XcmV3Multilocation => {
	const from = getChainById(fromChainId);
	const to = getChainById(token.chainId);

	return {
		parents: getParents(from, to),
		interior: getAssetInterior(from, to, token),
	};
};

const getAssetInterior = (
	from: Chain,
	to: Chain,
	token: Token,
): XcmV3Junctions => {
	const junctions: XcmV3Junction[] = [];

	if (isNumber(to.paraId) && from.id !== token.chainId)
		junctions.push(XcmV3Junction.Parachain(to.paraId));

	if (token.type === "asset")
		junctions.push(
			XcmV3Junction.PalletInstance(50),
			XcmV3Junction.GeneralIndex(BigInt(token.assetId)),
		);

	switch (junctions.length) {
		case 0:
			return XcmV3Junctions.Here();
		case 1:
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			return XcmV3Junctions.X1(junctions[0]!);
		case 2:
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			return XcmV3Junctions.X2([junctions[0]!, junctions[1]!]);
		case 3:
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			return XcmV3Junctions.X3([junctions[0]!, junctions[1]!, junctions[2]!]);
	}

	throw new Error("Can't determine asset interior");
};

const findOriginToken = (...tokens: Token[]): Token => {
	// in a valid xcm operation at least one token has an origin property set to the id of the origin token

	const originTokenId = tokens
		.map((t) => "origin" in t && t.origin)
		.find((id) => id);
	if (!originTokenId) throw new Error("Origin token id not found");

	const originToken = tokens.find((t) => t.id === originTokenId);
	if (!originToken) throw new Error("Origin token not found");

	return originToken;
};

const getDestLocation = (fromChainId: ChainId, token: Token) => {
	const from = getChainById(fromChainId);
	const to = getChainById(token.chainId);

	return XcmVersionedLocation.V4({
		parents: getParents(from, to),
		interior: getDestChainInterior(to), // TODO
	});
};

const getDestChainInterior = (chain: Chain): XcmV3Junctions => {
	if (isRelay(chain)) return XcmV3Junctions.Here(); // the parent 1 will designate that chain

	if (!isNumber(chain.paraId)) throw new Error("Missing Parachain ID");

	return XcmV3Junctions.X1(XcmV3Junction.Parachain(chain.paraId));
};

const getParents = (from: Chain, to: Chain): 0 | 1 | 2 => {
	if (from.id === to.id) return 0;
	if (from.id === to.relay) return 0;
	if (from.relay === to.id) return 1;
	if (from.relay === to.relay) return 1;

	throw new Error("Can't determine parents");
};
