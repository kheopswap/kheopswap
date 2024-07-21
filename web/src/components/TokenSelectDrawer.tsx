import { FC, forwardRef, useCallback, useMemo, useState } from "react";

import { Drawer } from "./Drawer";
import { DrawerContainer } from "./DrawerContainer";
import { TokenLogo } from "./TokenLogo";
import { ActionRightIcon } from "./icons";
import { Styles } from "./styles";
import { SearchInput } from "./SearchInput";

import { Token, TokenId } from "src/config/tokens";
import { useChainName } from "src/hooks";
import { cn } from "src/util";

const TokenButton = forwardRef<
  HTMLButtonElement,
  React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > & {
    token: Token;
    selected?: boolean;
    onClick: () => void;
  }
>(({ token, selected, onClick }, ref) => {
  const { name: chainName } = useChainName({ chainId: token.chainId });

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
      <div className="flex grow flex-col items-start gap-0.5 overflow-hidden text-neutral-400">
        <div className="flex w-full grow items-center gap-2">
          <div className="font-bold text-neutral-50">{token.symbol}</div>
          <div className="inline-block truncate">{token.name ?? ""}</div>
        </div>
        <div className="w-full truncate text-xs font-light">
          {chainName}
          {token.type === "asset" ? ` - ${token.assetId}` : null}
        </div>
      </div>

      <ActionRightIcon className="size-5 shrink-0 fill-current" />
    </button>
  );
});
TokenButton.displayName = "TokenButton";

const TokenButtonShimmer: FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        Styles.button,
        "flex h-16 w-full animate-pulse select-none items-center gap-4 overflow-hidden rounded-md bg-neutral-800 p-2  pl-4 pr-3 text-neutral-400",
        className,
      )}
    >
      <div className="size-10 rounded-full bg-neutral-700"></div>
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
    </div>
  );
};

const TokenSelectDrawerContent: FC<{
  tokenId?: TokenId | null;
  tokens?: Token[];
  isLoading?: boolean;
  onChange: (tokenId: TokenId) => void;
}> = ({ tokenId, tokens, isLoading, onChange }) => {
  const [search, setSearch] = useState("");

  const handleClick = useCallback(
    (id: TokenId) => () => {
      onChange(id);
    },
    [onChange],
  );

  const items = useMemo(() => {
    if (!tokens) return [];
    if (!search) return tokens;

    const ls = search.toLowerCase();

    return tokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(ls) ||
        t.name?.toLowerCase().includes(ls) ||
        (t.type === "asset" && t.assetId.toString() === ls),
    );
  }, [tokens, search]);

  return (
    <div className="flex flex-col gap-2">
      <SearchInput className="mb-2" onChange={setSearch} placeholder="Search" />
      {items.map((t) => (
        <TokenButton
          key={t.id}
          token={t}
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
  tokens?: Token[];
  isLoading?: boolean;
  title?: string;
  onChange: (tokenId: TokenId) => void;
  onDismiss: () => void;
}> = ({
  isOpen,
  tokenId,
  tokens,
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
          isLoading={isLoading}
          onChange={onChange}
        />
      </DrawerContainer>
    </Drawer>
  );
};
