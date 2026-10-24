import { type FC, Fragment } from "react";
import { Tokens } from "../../../components/Tokens";
import { useToken } from "../../../hooks/useToken";
import type { TokenAmount, TokenId } from "../../../registry/tokens/types";
import { type AmmPath, type AmmPathQuote, getPathTokenIds } from "./ammPath";

const TokenSymbol: FC<{ tokenId: TokenId }> = ({ tokenId }) => {
	const { data: token } = useToken({ tokenId });
	return token?.symbol ?? null;
};

export const RouteValue: FC<{ path: AmmPath }> = ({ path }) => (
	<div className="flex flex-wrap justify-end gap-1">
		{getPathTokenIds(path).map((tokenId, index) => (
			<Fragment key={tokenId}>
				{index > 0 && <span className="text-muted">→</span>}
				<TokenSymbol tokenId={tokenId} />
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
