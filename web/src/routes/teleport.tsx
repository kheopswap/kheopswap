import { Layout, PageContent } from "src/components";
import { Teleport } from "src/features/teleport";

export const TeleportPage = () => (
	<Layout>
		<div className="p-2">
			<PageContent>
				<Teleport />
			</PageContent>
		</div>
	</Layout>
);
