import { filter, map, type Observable, of, startWith, switchMap } from "rxjs";
import { isChainIdHydration } from "../registry/chains/chains";
import type { ChainId } from "../registry/chains/types";
import { getTokenId, parseTokenId } from "../registry/tokens/helpers";
import type { TokenId } from "../registry/tokens/types";
import { getTokenById$ } from "../services/tokens/service";
import {
	convertHydrationFee,
	getHydrationFeePrice$,
} from "../state/hydrationFees";
import { bindSerialized } from "../utils/bindSerialized";
import { useAssetConvertPlancks } from "./useAssetConvertPlancks";

type ConvertedFee = {
	isLoading: boolean;
	data: bigint | null | undefined;
};

const NO_FEE: ConvertedFee = { isLoading: false, data: null };

const getHydrationFee$ = (
	feeTokenId: TokenId | null,
	feeHdx: bigint | null,
): Observable<ConvertedFee> => {
	if (!feeTokenId || feeHdx === null) return of(NO_FEE);
	if (parseTokenId(feeTokenId).type === "native")
		return of({ isLoading: false, data: feeHdx });

	return getTokenById$(feeTokenId).pipe(
		filter(({ status }) => status === "loaded"),
		switchMap(({ token }) =>
			token?.type === "hydration-asset" && token.location
				? getHydrationFeePrice$(token.chainId, token.location)
				: of(null),
		),
		map(
			(price): ConvertedFee => ({
				isLoading: false,
				data: price && convertHydrationFee(feeHdx, price),
			}),
		),
		startWith<ConvertedFee>({ isLoading: true, data: undefined }),
	);
};

const useHydrationFee = bindSerialized(
	getHydrationFee$,
	(feeTokenId, feeHdx): ConvertedFee =>
		feeTokenId && feeHdx !== null
			? { isLoading: true, data: undefined }
			: NO_FEE,
);

export const useConvertedFee = ({
	chainId,
	feeTokenId,
	nativeFee,
}: {
	chainId: ChainId | null | undefined;
	feeTokenId: TokenId | null | undefined;
	nativeFee: bigint | null | undefined;
}): ConvertedFee => {
	const isHydration = isChainIdHydration(chainId);

	const assetHubFee = useAssetConvertPlancks({
		tokenIdIn:
			chainId && !isHydration ? getTokenId({ type: "native", chainId }) : null,
		tokenIdOut: isHydration ? null : feeTokenId,
		plancks: nativeFee,
	});
	const hydrationFee = useHydrationFee(
		(isHydration && feeTokenId) || null,
		isHydration ? (nativeFee ?? null) : null,
	);

	return isHydration
		? hydrationFee
		: { isLoading: assetHubFee.isLoading, data: assetHubFee.plancksOut };
};
