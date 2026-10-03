import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
	type FC,
	useCallback,
	useDeferredValue,
	useEffect,
	useRef,
	useState,
} from "react";
import { cn } from "../utils/cn";
import { Styles } from "./styles";

export const SearchInput: FC<{
	className?: string;
	placeholder?: string;
	onChange?: (val: string) => void;
	autoFocus?: boolean;
}> = ({ className, placeholder, autoFocus, onChange }) => {
	const refInput = useRef<HTMLInputElement>(null);
	const [search, setSearch] = useState("");
	const defSearch = useDeferredValue(search);

	useEffect(() => {
		if (autoFocus) refInput.current?.focus();
	}, [autoFocus]);

	useEffect(() => {
		onChange?.(defSearch);
	}, [defSearch, onChange]);

	const handleResetClick = useCallback(() => {
		const input = refInput.current;
		if (!input) return;

		onChange?.(""); // workaround deferred value
		setSearch("");
		input.value = "";
		input.blur();
	}, [onChange]);

	return (
		<div
			className={cn(
				Styles.field,
				"flex h-11.5 items-center gap-2.5 px-3.5",
				className,
			)}
		>
			<MagnifyingGlassIcon className="size-4 shrink-0 text-muted" />
			<input
				ref={refInput}
				type="text"
				placeholder={placeholder}
				aria-label={placeholder ?? "Search"}
				className={
					"min-w-0 grow bg-transparent outline-hidden placeholder:text-muted"
				}
				onChange={(e) => setSearch(e.target.value)}
			/>
			<button
				type="button"
				className={cn("rounded-xs", !search && "invisible")}
				onClick={handleResetClick}
				aria-label="Clear search"
			>
				<XMarkIcon className="size-4.5 text-muted hover:text-text" />
			</button>
		</div>
	);
};
