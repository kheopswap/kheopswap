import type { FC } from "react";
import { AddressDisplay } from "../../components/AddressDisplay";
import { Pulse } from "../../components/Pulse";
import { Shimmer } from "../../components/Shimmer";
import { Tokens } from "../../components/Tokens";
import { useTokenChain } from "../../hooks/useTokenChain";
import { useTokenInfo } from "../../hooks/useTokenInfo";
import type {
	Token,
	TokenAsset,
	TokenForeignAsset,
	TokenInfo,
	TokenInfoAsset,
	TokenInfoForeignAsset,
} from "../../registry/tokens/types";
import { formatDecimals } from "../../utils/formatDecimals";
import { getBlockExplorerUrl } from "../../utils/getBlockExplorerUrl";
import { TokenDetailsRow } from "./TokenDetailsRow";

const TotalSupplyRow: FC<{
	token: Token;
	tokenInfo: TokenInfo | undefined;
	isLoading: boolean;
}> = ({ token, tokenInfo, isLoading }) => (
	<TokenDetailsRow label="Total Supply">
		{tokenInfo ? (
			<Tokens plancks={tokenInfo.supply} token={token} pulse={isLoading} />
		) : (
			<Shimmer>000 TKN</Shimmer>
		)}
	</TokenDetailsRow>
);

type TokenInfoAssetsPallet = TokenInfoAsset | TokenInfoForeignAsset;

const isTokenInfoAssetsPallet = (
	tokenInfo: TokenInfo | undefined,
): tokenInfo is TokenInfoAssetsPallet =>
	tokenInfo?.type === "asset" || tokenInfo?.type === "foreign-asset";

const AssetsPalletInfoRows: FC<{
	token: TokenAsset | TokenForeignAsset;
	tokenInfo: TokenInfoAssetsPallet | undefined;
	isLoading: boolean;
}> = ({ token, tokenInfo, isLoading }) => {
	const chain = useTokenChain({ tokenId: token.id });

	return (
		<>
			<TotalSupplyRow
				token={token}
				tokenInfo={tokenInfo}
				isLoading={isLoading}
			/>
			<TokenDetailsRow label="Holders">
				{tokenInfo ? (
					<Pulse
						as="span"
						pulse={isLoading}
						className="font-mono"
						title={tokenInfo.accounts.toString()}
					>
						{formatDecimals(tokenInfo.accounts)}
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

export const TokenInfoRows: FC<{ token: Token }> = ({ token }) => {
	const { data: tokenInfo, isLoading } = useTokenInfo({ tokenId: token.id });

	switch (token.type) {
		case "native":
		case "hydration-asset":
			return (
				<TotalSupplyRow
					token={token}
					tokenInfo={tokenInfo}
					isLoading={isLoading}
				/>
			);
		case "asset":
		case "foreign-asset":
			return (
				<AssetsPalletInfoRows
					token={token}
					tokenInfo={isTokenInfoAssetsPallet(tokenInfo) ? tokenInfo : undefined}
					isLoading={isLoading}
				/>
			);
		case "pool-asset":
			return null;
	}
};
