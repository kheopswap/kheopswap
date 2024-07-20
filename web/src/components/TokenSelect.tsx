import { FC, useCallback } from "react";

import { ActionRightIcon } from "./icons";
import { TokenLogo } from "./TokenLogo";
import { TokenSelectDrawer } from "./TokenSelectDrawer";

import { Token, TokenId } from "src/config/tokens";
import { useOpenClose, useToken } from "src/hooks";
import { cn } from "src/util";

const TokenSelectButton: FC<{
  id?: string;
  tokenId?: TokenId;
  className?: string;
  onClick?: () => void;
}> = ({ id, tokenId, className, onClick }) => {
  const { data: token } = useToken({ tokenId });

  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full justify-between gap-4 overflow-hidden rounded-sm border border-neutral-500 bg-neutral-900 p-2 pl-3 hover:bg-neutral-800",
        token
          ? "text-neutral-300 hover:text-neutral-200"
          : "text-neutral-500 hover:text-neutral-400",
        className,
      )}
    >
      {token ? (
        <div
          className={cn(
            "flex grow items-center gap-2 overflow-hidden text-left",
            className,
          )}
        >
          <TokenLogo token={token} />
          <div className="flex grow items-center gap-2 overflow-hidden">
            <span>{token.symbol}</span>
            <span className="truncate opacity-50">{token.name}</span>
          </div>
        </div>
      ) : (
        <div>Select Token</div>
      )}
      <ActionRightIcon className="inline-block size-6 shrink-0  fill-current" />
    </button>
  );
};

export const TokenSelect: FC<{
  id?: string;
  tokenId: TokenId | undefined;
  tokens: Token[] | undefined;
  isLoading?: boolean;
  onChange: (tokenId: TokenId) => void;
}> = ({ id, tokenId, tokens, isLoading, onChange }) => {
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
      <TokenSelectButton id={id} tokenId={tokenId} onClick={open} />
      <TokenSelectDrawer
        isOpen={isOpen}
        tokenId={tokenId}
        tokens={tokens}
        isLoading={isLoading}
        onChange={handleChange}
        onDismiss={close}
      />
    </>
  );
};
