import { type FC, Fragment } from "react";
import { Tokens } from "../../../components/Tokens";
import { useToken } from "../../../hooks/useToken";
import type { TokenAmount, TokenId } from "../../../registry/tokens/types";
import { type AmmPath, type AmmPathQuote, getPathTokenIds } from "./ammPath";

const TokenSymbol: FC<{ tokenId: TokenId }> = ({ tokenId }) => {
	const { data: token } = useToken({ tokenId });
	return token?.symbol ?? null;
};

export type RouteStep = { tokenId: TokenId; chainName?: string };

export const getPathSteps = (path: AmmPath): RouteStep[] =>
	getPathTokenIds(path).map((tokenId) => ({ tokenId }));

export const RouteValue: FC<{ steps: RouteStep[] }> = ({ steps }) => (
	<div className="flex flex-wrap justify-end gap-1">
		{steps.map(({ tokenId, chainName }, index) => (
			<Fragment key={tokenId}>
				{index > 0 && <span className="text-muted">→</span>}
				<span>
					<TokenSymbol tokenId={tokenId} />
					{chainName && <span className="text-muted"> ({chainName})</span>}
				</span>
			</Fragment>
		))}
	</div>
);

export const TokenAmountValue: FC<TokenAmount> = ({ tokenId, plancks }) => {
	const { data: token } = useToken({ tokenId });
	return token ? <Tokens plancks={plancks} token={token} /> : null;
};

export const ProtocolFeeValue: FC<{ quote: AmmPathQuote }> = ({ quote }) => (
	<div className="flex flex-wrap justify-end">
		{quote.hops.map(({ tokenIdIn, protocolCommission }, index) => (
			<Fragment key={tokenIdIn}>
				{index > 0 && <span className="mx-1">+</span>}
				<TokenAmountValue tokenId={tokenIdIn} plancks={protocolCommission} />
			</Fragment>
		))}
	</div>
);
