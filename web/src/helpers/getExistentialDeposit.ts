import {
	type Api,
	getApi,
	getApi$,
	isApiAssetHub,
	isApiHydration,
} from "@kheopswap/papi";
import {
	type ChainId,
	type TokenId,
	type TokenSpec,
	getTokenId,
	parseTokenId,
} from "@kheopswap/registry";
import {
	type LoadableState,
	loadableStateData,
	loadableStateError,
	loadableStateLoading,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { Observable, catchError, map, of, switchMap } from "rxjs";

export const getExistentialDeposit = async (tokenId: TokenId) => {
	const token = parseTokenId(tokenId);

	const api = await getApi(token.chainId);

	switch (token.type) {
		case "asset": {
			if (!isApiAssetHub(api)) throw new Error("Chain is not an asset hub");
			const asset = await api.query.Assets.Asset.getValue(token.assetId, {
				at: "best",
			});
			return asset?.min_balance ?? null;
		}

		case "native":
			return api.constants.Balances.ExistentialDeposit();

		case "foreign-asset": {
			if (!isApiAssetHub(api)) throw new Error("Chain is not an asset hub");
			const asset = await api.query.ForeignAssets.Asset.getValue(
				token.location,
				{ at: "best" },
			);
			return asset?.min_balance ?? null;
		}

		case "hydration-asset": {
			if (!isApiHydration(api)) throw new Error("Chain is not Hydration");
			const asset = await api.query.AssetRegistry.Assets.getValue(
				token.assetId,
				{
					at: "best",
				},
			);
			return asset?.existential_deposit ?? null;
		}

		default:
			throw new Error(`Unsupported token type: ${tokenId}`);
	}
};

const getTokenExistentialDeposit = async (
	api: Api<ChainId>,
	token: TokenSpec,
) => {
	switch (token.type) {
		case "asset": {
			if (!isApiAssetHub(api)) throw new Error("Chain is not an asset hub");
			const asset = await api.query.Assets.Asset.getValue(token.assetId, {
				at: "best",
			});
			return asset?.min_balance ?? null;
		}

		case "native":
			return api.constants.Balances.ExistentialDeposit();

		case "foreign-asset": {
			if (!isApiAssetHub(api)) throw new Error("Chain is not an asset hub");
			const asset = await api.query.ForeignAssets.Asset.getValue(
				token.location,
				{ at: "best" },
			);
			return asset?.min_balance ?? null;
		}

		case "hydration-asset": {
			if (!isApiHydration(api)) throw new Error("Chain is not Hydration");
			const asset = await api.query.AssetRegistry.Assets.getValue(
				token.assetId,
				{
					at: "best",
				},
			);
			return asset?.existential_deposit ?? null;
		}

		default:
			throw new Error(`Unsupported token type: ${getTokenId(token)}`);
	}
};

export const [useExistentialDeposit, getExistentialDeposit$] = bind(
	(tokenId: TokenId) =>
		new Observable<LoadableState<bigint | null>>((subscriber) => {
			subscriber.next(loadableStateLoading());

			const token = parseTokenId(tokenId);
			if (!token)
				subscriber.next(
					loadableStateError(new Error(`Token not found ${tokenId}`)),
				);

			// TODO try get rid of observable wrapper, just need a startWith ?

			// assume getApi& emits again if runtime changes
			return getApi$(token.chainId)
				.pipe(
					switchMap((api) => getTokenExistentialDeposit(api, token)),
					map((existentialDeposit) => loadableStateData(existentialDeposit)),
					catchError((cause) =>
						of(
							loadableStateError<bigint | null>(
								new Error(`Failed to fetch existential for token ${tokenId}`, {
									cause,
								}),
							),
						),
					),
				)
				.subscribe((res) => {
					subscriber.next(res);
				});
		}),
	() => loadableStateLoading<bigint | null>(),
);
