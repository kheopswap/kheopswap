import {
	type FC,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";

import { usePortfolio } from "./PortfolioProvider";
import type { PortfolioRowData } from "./types";

import {
	type DisplayProperty,
	type Token,
	type TokenId,
	getTokenDisplayProperties,
} from "@kheopswap/registry";
import type { TokenAsset, TokenForeignAsset } from "@kheopswap/registry";
import {
	cn,
	getBlockExplorerUrl,
	isBigInt,
	shortenAddress,
	sortBigInt,
} from "@kheopswap/utils";
import { useNavigate } from "react-router-dom";
import {
	AccountSelectDrawer,
	AddressDisplay,
	Drawer,
	DrawerContainer,
	InjectedAccountIcon,
	Shimmer,
	Styles,
	TokenLogo,
	Tokens,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "src/components";
import { Pulse } from "src/components/Pulse";
import {
	useNativeToken,
	useOpenClose,
	usePoolByTokenId,
	useTokenChain,
} from "src/hooks";
import { useTokenInfo } from "src/hooks";
import { useRelayChains } from "src/state";
import type { BalanceWithStable, BalanceWithStableSummary } from "src/types";
import { getTokenTypeLabel } from "src/util";

const sortBalances = (a: BalanceWithStable, b: BalanceWithStable) => {
	if (isBigInt(a.tokenPlancks) && isBigInt(b.tokenPlancks))
		return sortBigInt(a.tokenPlancks, b.tokenPlancks, true);
	if (a.tokenPlancks && !b.tokenPlancks) return -1;
	if (!a.tokenPlancks && b.tokenPlancks) return 1;
	return 0;
};

const Balances: FC<{ token: Token }> = ({ token }) => {
	const { stableToken } = useRelayChains();
	const { accounts, balances, isLoading } = usePortfolio();
	const { open, close, isOpen } = useOpenClose();

	const rows = useMemo(
		() =>
			accounts
				.map((account) => ({
					account,
					// biome-ignore lint/style/noNonNullAssertion: <explanation>
					balance: balances.find(
						(b) => b.tokenId === token.id && b.address === account.address,
					)!,
				}))
				.filter((row) => row.balance)
				.sort((a, b) => sortBalances(a.balance, b.balance)),
		[accounts, balances, token.id],
	);

	return (
		<div>
			{rows.length ? (
				<div className="flex flex-col gap-1 text-sm">
					{rows.map(({ account, balance }) => (
						<div
							key={account.id}
							className={cn(
								"flex h-12 items-center gap-4 rounded bg-neutral-850 px-2",
								!balance.tokenPlancks && "opacity-50",
							)}
						>
							<div className="flex grow items-center gap-2">
								<InjectedAccountIcon className="size-6" account={account} />
								<div className="grow">{account.name}</div>
							</div>
							<div className="flex shrink-0 flex-col items-end gap-0.5">
								<div className="text-sm">
									{isBigInt(balance.tokenPlancks) ? (
										<Tokens
											token={token}
											plancks={balance.tokenPlancks}
											pulse={balance.isLoadingTokenPlancks}
										/>
									) : (
										<Shimmer>
											<Tokens token={token} plancks={0n} />
										</Shimmer>
									)}
								</div>

								{stableToken.id !== token.id &&
									(isBigInt(balance.stablePlancks) ||
										balance.isLoadingStablePlancks) && (
										<div className="text-sm text-neutral-500">
											{isBigInt(balance.stablePlancks) ? (
												<Tokens
													token={stableToken}
													plancks={balance.stablePlancks}
													pulse={balance.isLoadingStablePlancks}
													digits={2}
												/>
											) : (
												<Shimmer
													className={isLoading ? "visible" : "invisible"}
												>
													<Tokens token={token} plancks={0n} digits={2} />
												</Shimmer>
											)}
										</div>
									)}
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="my-4 rounded-lg bg-neutral-850 p-4 text-neutral-500">
					<button
						type="button"
						onClick={open}
						className={cn("text-neutral-300 hover:text-neutral-100")}
					>
						Connect your accounts
					</button>{" "}
					to browse your balances.
				</div>
			)}
			<AccountSelectDrawer
				title={"Connect"}
				isOpen={isOpen}
				onDismiss={close}
				ownedOnly
			/>
		</div>
	);
};

const Header: FC<{
	token: Token;
}> = ({ token }) => {
	return (
		<div className="flex flex-col items-center gap-3 bg-neutral-950 p-4">
			<TokenLogo className="size-20" token={token} />
			<div className="flex max-w-full items-center gap-2 overflow-hidden text-xl">
				<div className="text-neutral-50">{token.symbol}</div>
				<div className="grow truncate text-neutral-400">{token.name}</div>
			</div>
		</div>
	);
};

const TokenDetailsRowValue: FC<
	BalanceWithStableSummary & {
		token: Token;
	}
> = ({
	token,
	tokenPlancks,
	isLoadingStablePlancks,
	stablePlancks,
	isLoadingTokenPlancks,
	isInitializing,
}) => {
	const { stableToken } = useRelayChains();

	if (isInitializing) return null;

	return (
		<div className="flex gap-2 whitespace-nowrap text-neutral-50">
			<Tokens
				token={token}
				plancks={tokenPlancks ?? 0n}
				pulse={isLoadingTokenPlancks}
			/>
			<span
				className={cn(
					"text-neutral-500",
					!isBigInt(stablePlancks) && "hidden",
					token.id === stableToken.id && "hidden",
				)}
			>
				<Tokens
					token={stableToken}
					plancks={stablePlancks ?? 0n}
					digits={2}
					pulse={isLoadingStablePlancks}
				/>
			</span>
		</div>
	);
};

const TokenDetailsRow: FC<{ label: ReactNode; children?: ReactNode }> = ({
	label,
	children,
}) => (
	<div className="flex w-full justify-between gap-4 overflow-hidden items-center h-7">
		<div className="text-neutral-400">{label}</div>
		<div className="overflow-hidden">{children}</div>
	</div>
);

const DisplayPropertyValue: FC<DisplayProperty> = ({ value, format, url }) => {
	if (format === "address")
		return <AddressDisplay address={value} url={url} iconClassName="size-5" />;

	const formatted = useMemo(() => {
		if (format === "address") return shortenAddress(value);
		return value;
	}, [format, value]);

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
			className={cn(Styles.button, "px-2")}
		>
			{pool ? `Pool ${pool.poolAssetId}` : "Create Pool"}{" "}
		</button>
	);
};

const TokenInfoRows: FC<{ token: Token }> = ({ token }) => {
	const { data: tokenInfo, isLoading } = useTokenInfo({ tokenId: token.id });
	const chain = useTokenChain({ tokenId: token.id });

	if (token.type === "pool-asset") return null;

	if (token.type === "native" || token.type === "hydration-asset")
		return (
			<TokenDetailsRow label="Total Supply">
				{tokenInfo && "supply" in tokenInfo ? (
					<Tokens plancks={tokenInfo.supply} token={token} pulse={isLoading} />
				) : (
					<Shimmer>000 TKN</Shimmer>
				)}
			</TokenDetailsRow>
		);

	if (
		tokenInfo?.type === "native" ||
		tokenInfo?.type === "pool-asset" ||
		tokenInfo?.type === "hydration-asset"
	)
		return null;

	return (
		<>
			<TokenDetailsRow label="Total Supply">
				{tokenInfo ? (
					<Tokens plancks={tokenInfo.supply} token={token} pulse={isLoading} />
				) : (
					<Shimmer>000 TKN</Shimmer>
				)}
			</TokenDetailsRow>
			<TokenDetailsRow label="Holders">
				{tokenInfo ? (
					<Pulse as="span" pulse={isLoading}>
						{tokenInfo.accounts}
					</Pulse>
				) : (
					<Shimmer>00000</Shimmer>
				)}
			</TokenDetailsRow>
			<TokenDetailsRow label="Status">
				{tokenInfo ? (
					<Pulse as="span" pulse={isLoading}>
						{tokenInfo.status}
					</Pulse>
				) : (
					<Shimmer>Live</Shimmer>
				)}
			</TokenDetailsRow>
			<TokenDetailsRow label="Owner">
				{tokenInfo ? (
					<AddressDisplay
						address={tokenInfo.owner}
						url={getBlockExplorerUrl(
							chain?.blockExplorerUrl,
							tokenInfo.owner,
							"account",
						)}
						pulse={isLoading}
						iconClassName="size-5"
					/>
				) : (
					<Shimmer>0xdeadbeef...deadbeef</Shimmer>
				)}
			</TokenDetailsRow>
			{tokenInfo && tokenInfo.admin !== tokenInfo?.owner && (
				<TokenDetailsRow label="Admin">
					<AddressDisplay
						address={tokenInfo.admin}
						url={getBlockExplorerUrl(
							chain?.blockExplorerUrl,
							tokenInfo.admin,
							"account",
						)}
						iconClassName="size-5"
						pulse={isLoading}
					/>
				</TokenDetailsRow>
			)}
			{tokenInfo && tokenInfo.issuer !== tokenInfo?.owner && (
				<TokenDetailsRow label="Issuer">
					<AddressDisplay
						address={tokenInfo.issuer}
						url={getBlockExplorerUrl(
							chain?.blockExplorerUrl,
							tokenInfo.issuer,
							"account",
						)}
						iconClassName="size-5"
						pulse={isLoading}
					/>
				</TokenDetailsRow>
			)}
			{tokenInfo && tokenInfo.freezer !== tokenInfo?.owner && (
				<TokenDetailsRow label="Freezer">
					<AddressDisplay
						address={tokenInfo.freezer}
						url={getBlockExplorerUrl(
							chain?.blockExplorerUrl,
							tokenInfo.freezer,
							"account",
						)}
						iconClassName="size-5"
						pulse={isLoading}
					/>
				</TokenDetailsRow>
			)}
		</>
	);
};

const TokenDetails = ({ row }: { row: PortfolioRowData }) => {
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
			{token.type === "asset" && (
				<TokenDetailsRow label="Asset Id">{token.assetId}</TokenDetailsRow>
			)}
			{displayProps.map((prop, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
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
				{price?.stablePlancks ? (
					<TokenDetailsRowValue {...price} token={nativeToken} />
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

			<Balances token={token} />
		</div>
	);
};

const DrawerContent: FC<{
	tokenRow: PortfolioRowData;
}> = ({ tokenRow }) => {
	return (
		<div>
			<Header token={tokenRow.token} />

			<div className="h-4 border-t border-neutral-800 p-3">
				<TokenDetails row={tokenRow} />
			</div>
		</div>
	);
};

export const PortfolioTokenDrawer: FC<{
	tokenId: TokenId | null;
	rows: PortfolioRowData[];
	onDismiss: () => void;
}> = ({ tokenId, rows, onDismiss }) => {
	const [tokenRow, setTokenRow] = useState<PortfolioRowData>();

	useEffect(() => {
		if (tokenId) setTokenRow(rows.find((row) => row.token.id === tokenId));
	}, [rows, tokenId]);

	return (
		<Drawer anchor="right" isOpen={!!tokenId} onDismiss={onDismiss}>
			<DrawerContainer
				contentClassName="p-0"
				title={"Token Details"}
				onClose={onDismiss}
			>
				{tokenRow && <DrawerContent tokenRow={tokenRow} />}
			</DrawerContainer>
		</Drawer>
	);
};
