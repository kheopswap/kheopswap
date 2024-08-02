import { toast } from "react-toastify";

export const notifyError = (error: unknown) => {
	console.error(error);
	toast(error instanceof Error ? error.message : JSON.stringify(error), {
		type: "error",
	});
};
