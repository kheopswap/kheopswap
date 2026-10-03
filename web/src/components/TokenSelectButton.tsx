import { type FC, useCallback, useMemo } from "react";
import type { PolkadotAccount } from "../common/kheopskit";
import { useChainName } from "../hooks/useChainName";
import { useOpenClose } from "../hooks/useOpenClose";
import type { Token, TokenId } from "../registry/tokens/types";
import { cn } from "../utils/cn";
import { Styles } from "./styles";
import { TokenLogo } from "./TokenLogo";
import { TokenSelectDrawer } from "./TokenSelectDrawer";

const TokenButton: FC<{
	tokenId: TokenId | null | undefined;
	tokens: Record<string, Token> | undefined;
	isLoading?: boolean;
	disabled?: boolean;
	className?: string;
	onClick: () => void;
}> = ({ tokenId, tokens, disabled, className, onClick }) => {
	const token = useMemo(
		() => (tokenId ? tokens?.[tokenId] : undefined),
		[tokenId, tokens],
	);
	const { shortName: chainName } = useChainName({ chainId: token?.chainId });

	return (
		<button
			type="button"
			className={cn(
				Styles.button,
				"flex h-10 max-w-[45%] items-center gap-2.5 rounded-full border border-surface-border bg-surface py-1.5 pr-3 pl-1.5",
				!token && "px-3.5 font-semibold",
				className,
			)}
			disabled={disabled}
			onClick={onClick}
			aria-label={
				token
					? `Selected token: ${token.symbol}${chainName ? ` on ${chainName}` : ""}. Change token`
					: "Select token"
			}
		>
			{token && <TokenLogo token={token} className="size-7" />}
			<div
				className={cn(
					"flex grow flex-col overflow-hidden text-left",
					!token && "text-center",
				)}
			>
				<div className="truncate leading-tight font-semibold">
					{token?.symbol ?? "Select Token"}
				</div>
				{!!chainName && (
					<div className="truncate text-[11px] leading-tight text-muted">
						{chainName}
					</div>
				)}
			</div>
		</button>
	);
};

export const TokenSelectButton: FC<{
	tokenId: TokenId | null | undefined;
	tokens: Record<string, Token> | undefined;
	accounts?: PolkadotAccount[] | string[];
	isLoading: boolean;
	onChange: (tokenId: TokenId) => void;
	className?: string;
	disabled?: boolean;
}> = ({
	tokenId,
	tokens,
	accounts,
	isLoading,
	className,
	disabled,
	onChange,
}) => {
	const { isOpen, open, close } = useOpenClose();

	const handleChange = useCallback(
		(tokenId: TokenId) => {
			onChange(tokenId);
			close();
		},
		[close, onChange],
	);

	return (
		<>
			<TokenButton
				tokenId={tokenId}
				tokens={tokens}
				isLoading={isLoading}
				disabled={disabled}
				className={className}
				onClick={open}
			/>
			<TokenSelectDrawer
				isOpen={isOpen}
				tokens={tokens}
				accounts={accounts}
				isLoading={isLoading}
				tokenId={tokenId}
				onChange={handleChange}
				onDismiss={close}
			/>
		</>
	);
};
