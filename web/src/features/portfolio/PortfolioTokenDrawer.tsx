import { type FC, memo, useMemo, useRef } from "react";
import { Drawer } from "../../components/Drawer";
import { DrawerContainer } from "../../components/DrawerContainer";
import { TokenLogo } from "../../components/TokenLogo";
import type { Token, TokenId } from "../../registry/tokens/types";
import { TokenDetails } from "./PortfolioTokenDetails";
import type { PortfolioRowData } from "./types";

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
}> = memo(function PortfolioTokenDrawer({ tokenId, rows, onDismiss }) {
	// Derive the row synchronously to avoid double-render on open
	const currentRow = useMemo(
		() => (tokenId ? rows.find((row) => row.token.id === tokenId) : undefined),
		[rows, tokenId],
	);

	// Keep the last valid row for the close animation
	const lastRowRef = useRef<PortfolioRowData | undefined>(undefined);
	if (currentRow) lastRowRef.current = currentRow;

	const displayRow = currentRow ?? lastRowRef.current;

	return (
		<Drawer anchor="right" isOpen={!!tokenId} onDismiss={onDismiss}>
			<DrawerContainer
				contentClassName="p-0"
				title={"Token Details"}
				onClose={onDismiss}
			>
				{displayRow && <DrawerContent tokenRow={displayRow} />}
			</DrawerContainer>
		</Drawer>
	);
});
