import { type FC, useMemo, useState } from "react";
import { useToken } from "../hooks/useToken";
import { getChainById } from "../registry/chains/chains";
import type { Token, TokenId } from "../registry/tokens/types";
import { cn } from "../utils/cn";
import { getValidTokenLogo } from "../utils/tokenLogo";

const FALLBACK_LOGO_SRC = "/img/tokens/unknown.svg";

const TokenLogoDisplay: FC<{ token: Token | null; className?: string }> = ({
	token,
	className,
}) => {
	const [logoLoadError, setLogoLoadError] = useState(false);
	const chain = useMemo(
		() => (token ? getChainById(token.chainId) : null),
		[token],
	);
	const logo = useMemo(
		() => getValidTokenLogo(token?.logo) ?? FALLBACK_LOGO_SRC,
		[token?.logo],
	);
	const logoSrc = logoLoadError
		? FALLBACK_LOGO_SRC
		: (logo ?? FALLBACK_LOGO_SRC);

	return (
		<div className={cn("relative size-6 shrink-0", className)}>
			<img
				loading="lazy"
				src={logoSrc}
				alt={token?.symbol ?? ""}
				onError={(event) => {
					if (event.currentTarget.src.endsWith(FALLBACK_LOGO_SRC)) return;
					setLogoLoadError(true);
					event.currentTarget.src = FALLBACK_LOGO_SRC;
				}}
				onLoad={() => setLogoLoadError(false)}
				className={cn(
					"size-full",
					logo?.endsWith("?rounded") && "rounded-full",
					logo === FALLBACK_LOGO_SRC && "grayscale brightness-75",
				)}
			/>
			{chain && chain.logo !== token?.logo && (
				<img
					loading="lazy"
					src={chain.logo}
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
