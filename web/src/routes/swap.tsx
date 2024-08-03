import { Layout, PageContent } from "src/components";
import { Swap } from "src/features/swap";

export const SwapPage = () => (
	<Layout>
		<div className="p-2">
			<PageContent>
				<Swap />
			</PageContent>
		</div>
	</Layout>
);
