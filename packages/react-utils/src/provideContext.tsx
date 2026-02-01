import { createContext, type FC, type ReactNode, useContext } from "react";

/**
 * Utility to generate a React context provider from a hook.
 *
 * This creates feature-scoped state that is:
 * - Isolated to a component subtree
 * - Re-computed when the provider re-renders
 * - Accessible via the returned hook
 *
 * Use this for feature-level state (forms, transactions).
 * For global app state, use `@react-rxjs/core` `bind()` instead.
 *
 * @example
 * ```ts
 * const useSwapProvider = () => {
 *   const [amount, setAmount] = useState("");
 *   return { amount, setAmount };
 * };
 *
 * export const [SwapProvider, useSwap] = provideContext(useSwapProvider);
 * ```
 */
export const provideContext = <P, T>(useProviderContext: (props: P) => T) => {
	// automatic typing based on our hook's return type
	type ContextType = ReturnType<typeof useProviderContext>;
	type ProviderProps = P & { children?: ReactNode };
	type ProviderType = FC<ProviderProps>;

	const Context = createContext({} as ContextType);

	const Provider: ProviderType = ({ children, ...props }: ProviderProps) => {
		const ctx = useProviderContext(props as P);

		return <Context.Provider value={ctx}>{children}</Context.Provider>;
	};

	const useProvidedContext = () => useContext(Context);

	return [Provider, useProvidedContext] as [ProviderType, () => ContextType];
};
