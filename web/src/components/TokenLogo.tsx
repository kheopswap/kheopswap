import type { Token, TokenId } from "@kheopswap/registry";

import { getChainById } from "@kheopswap/registry";
import { cn } from "@kheopswap/utils";
import { type FC, useMemo } from "react";
import { useToken } from "src/hooks";
import { GitHubImage } from "./GitHubImage";

const FALLBACK_LOGO = "/img/tokens/asset.svg";

const TokenLogoDisplay: FC<{ token: Token | null; className?: string }> = ({
	token,
	className,
}) => {
	const chain = useMemo(
		() => (token ? getChainById(token.chainId) : null),
		[token],
	);

	return (
		<div className={cn("relative size-6 shrink-0", className)}>
			<GitHubImage
				loading="lazy"
				src={token?.logo ?? FALLBACK_LOGO}
				fallbackSrc={FALLBACK_LOGO}
				alt={token?.symbol ?? ""}
				className={cn(
					"size-full",
					token?.logo?.endsWith("?rounded") && "rounded-full",
				)}
			/>
			{chain && chain.logo !== token?.logo && (
				<GitHubImage
					loading="lazy"
					src={chain.logo}
					fallbackSrc={FALLBACK_LOGO}
					alt={""}
					className="absolute bottom-[-10%] left-[-10%] size-1/2"
				/>
			)}
		</div>
	);
};

const TokenLogoFromId: FC<{ tokenId: TokenId; className?: string }> = ({
	tokenId,
	className,
}) => {
	const { data: token } = useToken({ tokenId });
	return <TokenLogoDisplay token={token} className={className} />;
};

export const TokenLogo: FC<{
	token: Token | TokenId | null;
	className?: string;
}> = ({ token, className }) => {
	return typeof token === "string" ? (
		<TokenLogoFromId tokenId={token} className={className} />
	) : (
		<TokenLogoDisplay token={token} className={className} />
	);
};
