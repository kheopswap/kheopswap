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
				"flex items-center gap-2 px-3 py-2 focus-within:border-neutral-300",
				!!search && "border-neutral-400",
				className,
			)}
		>
			<MagnifyingGlassIcon className="size-5 stroke-neutral-500" />
			<input
				ref={refInput}
				type="text"
				placeholder={placeholder}
				className={
					"grow bg-transparent outline-hidden placeholder:text-neutral-600"
				}
				onChange={(e) => setSearch(e.target.value)}
			/>
			<button
				type="button"
				className={cn("rounded-xs", !search && "invisible")}
				onClick={handleResetClick}
			>
				<XMarkIcon className="size-5 stroke-white" />
			</button>
		</div>
	);
};
