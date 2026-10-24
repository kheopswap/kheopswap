import type { FC } from "react";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { AddressDisplay } from "../../components/AddressDisplay";
import { Shimmer } from "../../components/Shimmer";
import { Styles } from "../../components/styles";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../components/tooltip/Tooltip";
import { useNativeToken } from "../../hooks/useNativeToken";
import { usePoolByTokenId } from "../../hooks/usePoolByTokenId";
import { useTokenChain } from "../../hooks/useTokenChain";
import type { DisplayProperty } from "../../registry/tokens/helpers";
import { getTokenDisplayProperties } from "../../registry/tokens/helpers";
import type {
	TokenAsset,
	TokenForeignAsset,
} from "../../registry/tokens/types";
import { useRelayChains } from "../../state/relay";
import { cn } from "../../utils/cn";
import { getTokenTypeLabel } from "../../utils/getTokenTypeLabel";
import { shortenAddress } from "../../utils/shortenAddress";
import { TokenDetailsBalances } from "./TokenDetailsBalances";
import { TokenDetailsRow, TokenDetailsRowValue } from "./TokenDetailsRow";
import { TokenInfoRows } from "./TokenInfoRows";
import type { PortfolioRowData } from "./types";

const DisplayPropertyValue: FC<DisplayProperty> = ({ value, format, url }) => {
	const formatted = useMemo(() => {
		if (format === "address") return shortenAddress(value);
		return value;
	}, [format, value]);

	if (format === "address")
		return <AddressDisplay address={value} url={url} iconClassName="size-5" />;

	if (url)
		return (
			<a href={url} target="_blank" rel="noreferrer">
				{formatted}
			</a>
		);

	if (formatted && formatted !== value)
		return (
			<Tooltip>
				<TooltipTrigger>{formatted}</TooltipTrigger>
				<TooltipContent>{value}</TooltipContent>
			</Tooltip>
		);

	return formatted || null;
};

const LiquidityPoolValue: FC<{ token: TokenAsset | TokenForeignAsset }> = ({
	token,
}) => {
	const { relayId } = useRelayChains();
	const { data: pool, isLoading } = usePoolByTokenId({ tokenId: token.id });
	const navigate = useNavigate();

	const handleClick = useCallback(() => {
		const url = pool
			? `/${relayId}/pools/${pool.poolAssetId}`
			: `/${relayId}/pools/create/${token.id}`;
		navigate(url);
	}, [token, pool, relayId, navigate]);

	if (!pool && isLoading) return <Shimmer className="w-20 h-5" />;

	return (
		<button
			type="button"
			onClick={handleClick}
			className={cn(Styles.button, "h-8 px-3 text-[13px] font-medium")}
		>
			{pool ? `Pool ${pool.poolAssetId}` : "Create Pool"}{" "}
		</button>
	);
};

export const TokenDetails: FC<{ row: PortfolioRowData }> = ({ row }) => {
	const { token, balance, price, tvl } = row;
	const { assetHub } = useRelayChains();
	const nativeToken = useNativeToken({ chain: assetHub });

	const chain = useTokenChain({ tokenId: token.id });

	const displayProps = useMemo(() => {
		return getTokenDisplayProperties(token);
	}, [token]);

	return (
		<div className="flex flex-col gap-2">
			<TokenDetailsRow label="Network">
				<div className="flex w-full items-center gap-2 overflow-hidden">
					<img src={chain.logo} alt="" className="size-6 shrink-0" />
					<div className="truncate">{chain.name}</div>
				</div>
			</TokenDetailsRow>
			<TokenDetailsRow label="Type">
				{getTokenTypeLabel(token.type)}
			</TokenDetailsRow>
			{(token.type === "asset" || token.type === "hydration-asset") && (
				<TokenDetailsRow label="Asset Id">
					<span className="font-mono">{token.assetId}</span>
				</TokenDetailsRow>
			)}
			{displayProps.map((prop, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: legacy
				<TokenDetailsRow key={i} label={prop.label}>
					<DisplayPropertyValue {...prop} />
				</TokenDetailsRow>
			))}
			<TokenInfoRows token={token} />
			{token.type === "asset" || token.type === "foreign-asset" ? (
				<TokenDetailsRow label="Liquidity Pool">
					<LiquidityPoolValue token={token} />
				</TokenDetailsRow>
			) : null}
			<TokenDetailsRow label="Price">
				{price?.tokenPlancks ? (
					<TokenDetailsRowValue {...price} token={nativeToken} isPrice />
				) : (
					<span className="opacity-50">N/A</span>
				)}
			</TokenDetailsRow>
			{!!tvl && (
				<TokenDetailsRow label="TVL">
					<TokenDetailsRowValue {...tvl} token={token} />
				</TokenDetailsRow>
			)}

			{!!balance && (
				<TokenDetailsRow label="Portfolio">
					<TokenDetailsRowValue {...balance} token={token} />
				</TokenDetailsRow>
			)}

			<TokenDetailsBalances token={token} />
		</div>
	);
};
