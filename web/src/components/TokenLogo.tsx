import { type FC, useMemo } from "react";

import { getChainById } from "@kheopswap/registry";
import type { Token, TokenId } from "@kheopswap/registry";
import { cn } from "@kheopswap/utils";
import { useToken } from "src/hooks";

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
			<img
				loading="lazy"
				src={token?.logo ?? "/img/tokens/unknown.svg"}
				alt={token?.symbol ?? ""}
				className={cn(
					"size-full",
					token?.logo.endsWith("?rounded") && "rounded-full",
				)}
			/>
			{chain && chain.logo !== token?.logo && (
				<img
					loading="lazy"
					src={chain.logo}
					alt={""}
					className={cn(
						"absolute bottom-[-10%] left-[-10%] size-1/2",
						chain.logo.endsWith("?rounded") && "rounded-full",
					)}
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
