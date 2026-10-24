import { type FC, Fragment } from "react";
import {
	FormSummary,
	FormSummaryRow,
	FormSummarySection,
} from "../../components/FormSummary";
import { Tokens } from "../../components/Tokens";
import { useToken } from "../../hooks/useToken";
import type { TokenId } from "../../registry/tokens/types";
import { isBigInt } from "../../utils/isBigInt";
import { TransactionDryRunSummaryValue } from "../transaction/TransactionDryRunValue";
import { TransactionFeeSummaryValue } from "../transaction/TransactionFeeSummaryValue";
import { PriceImpact } from "./PriceImpact";
import {
	type AmmPath,
	type AmmPathQuote,
	getPathTokenIds,
	type PathLiquidity,
} from "./routes/ammPath";
import { XcmSwapSummary } from "./routes/xcmSwap/XcmSwapSummary";
import { XcmTransferSummary } from "./routes/xcmTransfer/XcmTransferSummary";
import { Slippage } from "./Slippage";
import { type AmmSwapDetails, useSwap } from "./SwapProvider";

const PoolReservesValue: FC<{ liquidity: PathLiquidity | null }> = ({
	liquidity,
}) => {
	const { tokenIn, tokenOut } = useSwap();
	if (!tokenIn || !tokenOut) return null;

	switch (liquidity?.status) {
		case "no-pool":
			return <div className="text-error">Pool not found</div>;
		case "no-liquidity":
			return <div className="text-error">No liquidity</div>;
		case "available": {
			const [{ reserveIn, reserveOut }] = liquidity.hops;
			return (
				<div className="flex flex-wrap justify-end">
					<Tokens plancks={reserveIn} token={tokenIn} />
					<span className="mx-1">/</span>
					<Tokens plancks={reserveOut} token={tokenOut} />
				</div>
			);
		}
		default:
			return null;
	}
};

const TokenSymbol: FC<{ tokenId: TokenId }> = ({ tokenId }) => {
	const { data: token } = useToken({ tokenId });
	return token?.symbol ?? null;
};

const RouteValue: FC<{ path: AmmPath }> = ({ path }) => (
	<div className="flex flex-wrap justify-end gap-1">
		{getPathTokenIds(path).map((tokenId, index) => (
			<Fragment key={tokenId}>
				{index > 0 && <span className="text-muted">→</span>}
				<TokenSymbol tokenId={tokenId} />
			</Fragment>
		))}
	</div>
);

const HopTokens: FC<{ tokenId: TokenId; plancks: bigint }> = ({
	tokenId,
	plancks,
}) => {
	const { data: token } = useToken({ tokenId });
	return token ? <Tokens plancks={plancks} token={token} /> : null;
};

const ProtocolFeeValue: FC<{ quote: AmmPathQuote }> = ({ quote }) => (
	<div className="flex flex-wrap justify-end">
		{quote.hops.map(({ tokenIdIn, protocolCommission }, index) => (
			<Fragment key={tokenIdIn}>
				{index > 0 && <span className="mx-1">+</span>}
				<HopTokens tokenId={tokenIdIn} plancks={protocolCommission} />
			</Fragment>
		))}
	</div>
);

const AmmSwapSummary: FC<{ details: AmmSwapDetails }> = ({ details }) => {
	const { tokenIn, tokenOut, transaction } = useSwap();
	const {
		route,
		minPlancksOut,
		priceImpact,
		liquidity,
		quote,
		appCommission,
		slippage,
	} = details;
	const { call } = transaction;

	return (
		<FormSummary>
			<FormSummarySection>
				{route && route.path.length > 1 ? (
					<FormSummaryRow
						label="Route"
						value={<RouteValue path={route.path} />}
					/>
				) : (
					<FormSummaryRow
						label="Pool reserves"
						value={<PoolReservesValue liquidity={liquidity} />}
					/>
				)}
				<FormSummaryRow
					label="Price impact"
					value={
						priceImpact !== undefined && <PriceImpact value={priceImpact} />
					}
				/>
			</FormSummarySection>
			{!!call && (
				<>
					<FormSummarySection>
						<FormSummaryRow
							label="Slippage tolerance"
							value={<Slippage value={slippage} />}
						/>
						<FormSummaryRow
							label="Min. received"
							value={
								isBigInt(minPlancksOut) &&
								!!tokenOut && (
									<Tokens plancks={minPlancksOut} token={tokenOut} />
								)
							}
						/>
					</FormSummarySection>
					<FormSummarySection>
						<FormSummaryRow
							label="Simulation"
							value={<TransactionDryRunSummaryValue />}
						/>
						<FormSummaryRow
							label="Transaction fee"
							value={<TransactionFeeSummaryValue />}
						/>
						<FormSummaryRow
							label="Service fee"
							value={
								!!tokenIn &&
								isBigInt(minPlancksOut) &&
								isBigInt(appCommission) && (
									<Tokens plancks={appCommission} token={tokenIn} />
								)
							}
						/>
						<FormSummaryRow
							label="Protocol fee"
							value={
								isBigInt(minPlancksOut) &&
								!!quote && <ProtocolFeeValue quote={quote} />
							}
						/>
					</FormSummarySection>
				</>
			)}
		</FormSummary>
	);
};

export const SwapSummary = () => {
	const { details } = useSwap();

	switch (details.kind) {
		case "amm-swap":
			return <AmmSwapSummary details={details} />;
		case "xcm-transfer":
			return <XcmTransferSummary details={details} />;
		case "xcm-swap":
			return <XcmSwapSummary details={details} />;
	}
};
