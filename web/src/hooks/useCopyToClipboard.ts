import { useCallback, useState } from "react";

export const useCopyToClipboard = () => {
	const [copiedText, setCopiedText] = useState<string | null>(null);

	const copy = useCallback(async (text: string): Promise<boolean> => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedText(text);
			return true;
		} catch {
			setCopiedText(null);
			return false;
		}
	}, []);

	return [copiedText, copy] as const;
};
