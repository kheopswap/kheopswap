import type { PolkadotAccount } from "@kheopskit/core";
import { values } from "lodash-es";
import { type FC, forwardRef, useCallback, useMemo, useState } from "react";
import { useBalancesByTokenSummary } from "../hooks/useBalancesByTokenSummary";
import type { Token, TokenId } from "../registry/tokens/types";
import { useRelayChains } from "../state/relay";
import type { BalanceWithStableSummary } from "../types/balances";
import { cn } from "../utils/cn";
import { getTokenDescription } from "../utils/getTokenDescription";
import { isBigInt } from "../utils/isBigInt";
import { Drawer } from "./Drawer";
import { DrawerContainer } from "./DrawerContainer";
import { ActionRightIcon } from "./icons";
import { Pulse } from "./Pulse";
import { SearchInput } from "./SearchInput";
import { Shimmer } from "./Shimmer";
import { Styles } from "./styles";
import { TokenLogo } from "./TokenLogo";
import { Tokens } from "./Tokens";

const TokenButton = forwardRef<
	HTMLButtonElement,
	React.DetailedHTMLProps<
		React.ButtonHTMLAttributes<HTMLButtonElement>,
		HTMLButtonElement
	> & {
		token: Token;
		balances?: BalanceWithStableSummary;
		selected?: boolean;
		onClick: () => void;
	}
>(({ token, balances, selected, onClick }, ref) => {
	const { stableToken } = useRelayChains();
	const description = useMemo(() => getTokenDescription(token), [token]);

	return (
		<button
			ref={ref}
			type="button"
			onClick={onClick}
			className={cn(
				Styles.button,
				"flex h-16 w-full items-center gap-3 overflow-hidden rounded-md p-2 pl-4 pr-3",
				"text-left text-neutral-400 hover:text-neutral-200",
				selected && "ring-1 ring-neutral-500",
			)}
		>
			<TokenLogo className="size-10" token={token} />
			<div className="flex h-full grow flex-col items-start justify-center gap-0.5 overflow-hidden text-neutral-400">
				<div className="flex w-full items-center gap-2 overflow-hidden">
					<div className="font-bold text-neutral-50">{token.symbol}</div>
					<div className="inline-block truncate">{token.name ?? ""}</div>
				</div>
				<div className="w-full truncate text-xs font-light">{description}</div>
			</div>
			{balances ? (
				balances.isInitializing ? (
					<div className="flex h-full flex-col items-end justify-center gap-0.5">
						<Shimmer className="h-5 overflow-hidden">0.0001 TKN</Shimmer>
						<Shimmer className="h-4 overflow-hidden text-sm">0.00 USDC</Shimmer>
					</div>
				) : (
					<div className="flex h-full flex-col items-end justify-center">
						<div className="text-neutral-50">
							<Tokens
								token={token}
								plancks={balances.tokenPlancks ?? 0n}
								pulse={balances.isLoadingTokenPlancks}
							/>
						</div>
						<div className="text-sm">
							<Tokens
								token={stableToken}
								plancks={balances.stablePlancks ?? 0n}
								className={cn(
									!isBigInt(balances.stablePlancks) && "invisible",
									token.id === stableToken.id && "invisible",
								)}
								pulse={balances.isLoadingStablePlancks}
							/>
						</div>
					</div>
				)
			) : (
				<ActionRightIcon className="size-5 shrink-0 fill-current" />
			)}
		</button>
	);
});
TokenButton.displayName = "TokenButton";

const TokenButtonShimmer: FC<{ className?: string }> = ({ className }) => {
	return (
		<Pulse
			pulse
			className={cn(
				Styles.button,
				"flex h-16 w-full select-none items-center gap-4 overflow-hidden rounded-md bg-neutral-800 p-2  pl-4 pr-3 text-neutral-400",
				className,
			)}
		>
			<div className="size-10 rounded-full bg-neutral-700" />
			<div className="flex grow select-none flex-col items-start gap-0.5 text-neutral-400">
				<div className="flex grow items-center gap-2 overflow-hidden ">
					<div className="inline-block truncate rounded-md bg-neutral-700 text-neutral-700">
						Token Name
					</div>
				</div>
				<div className="truncate rounded-md bg-neutral-700 text-xs font-light text-neutral-700">
					Chain name and asset id
				</div>
			</div>
		</Pulse>
	);
};

const TokenSelectDrawerContent: FC<{
	tokenId?: TokenId | null;
	tokens?: Record<string, Token>;
	accounts?: PolkadotAccount[] | string[];
	isLoading?: boolean;
	onChange: (tokenId: TokenId) => void;
}> = ({ tokenId, tokens: tokensMap, accounts, isLoading, onChange }) => {
	const [search, setSearch] = useState("");

	const handleClick = useCallback(
		(id: TokenId) => () => {
			onChange(id);
		},
		[onChange],
	);

	const tokens = useMemo(() => values(tokensMap ?? {}), [tokensMap]);

	const { data: balances } = useBalancesByTokenSummary({
		tokens,
		accounts,
	});

	const sortedTokens = useMemo(
		() =>
			(tokens ?? []).sort((t1, t2) => {
				const [b1, b2] = [t1, t2].map((t) => balances?.[t.id]);
				if (!b1 || !b2) return 0;
				if (b1.stablePlancks || b2.stablePlancks) {
					if (b1.stablePlancks === b2.stablePlancks) return 0;
					if (b1.stablePlancks === null) return 1;
					if (b2.stablePlancks === null) return -1;
					return b1.stablePlancks > b2.stablePlancks ? -1 : 1;
				}
				if (b1.tokenPlancks || b2.tokenPlancks) {
					if (b1.tokenPlancks === b2.tokenPlancks) return 0;
					if (b1.tokenPlancks === null) return 1;
					if (b2.tokenPlancks === null) return -1;
					return b1.tokenPlancks > b2.tokenPlancks ? -1 : 1;
				}
				return 0;
			}),
		[tokens, balances],
	);

	const items = useMemo(() => {
		if (!sortedTokens) return [];
		if (!search) return sortedTokens;

		const ls = search.toLowerCase().trim();

		return sortedTokens.filter(
			(t) =>
				t.symbol.toLowerCase().includes(ls) ||
				t.name?.toLowerCase().includes(ls) ||
				(t.type === "asset" && t.assetId.toString() === ls),
		);
	}, [sortedTokens, search]);

	return (
		<div className="flex flex-col gap-2">
			<SearchInput className="mb-2" onChange={setSearch} placeholder="Search" />
			{items.map((t) => (
				<TokenButton
					key={t.id}
					token={t}
					balances={balances?.[t.id]}
					onClick={handleClick(t.id)}
					selected={t.id === tokenId}
				/>
			))}
			{isLoading && <TokenButtonShimmer />}
		</div>
	);
};

export const TokenSelectDrawer: FC<{
	isOpen?: boolean;
	tokenId?: TokenId | null;
	tokens?: Record<string, Token>;
	accounts?: PolkadotAccount[] | string[];
	isLoading?: boolean;
	title?: string;
	onChange: (tokenId: TokenId) => void;
	onDismiss: () => void;
}> = ({
	isOpen,
	tokenId,
	tokens,
	accounts,
	isLoading,
	title = "Select token",
	onChange,
	onDismiss,
}) => {
	return (
		<Drawer anchor="right" isOpen={isOpen} onDismiss={onDismiss}>
			<DrawerContainer title={title} onClose={onDismiss}>
				<TokenSelectDrawerContent
					tokenId={tokenId}
					tokens={tokens}
					accounts={accounts}
					isLoading={isLoading}
					onChange={onChange}
				/>
			</DrawerContainer>
		</Drawer>
	);
};
