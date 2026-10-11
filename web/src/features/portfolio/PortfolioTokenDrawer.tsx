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
		<div className="flex flex-col items-center gap-3 px-5 pt-5 pb-4">
			<TokenLogo className="size-16" token={token} />
			<div className="flex max-w-full items-center gap-2 overflow-hidden text-lg">
				<div className="font-semibold text-text">{token.symbol}</div>
				<div className="grow truncate text-muted">{token.name}</div>
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

			<div className="border-t border-line px-5 pt-4 pb-6">
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
