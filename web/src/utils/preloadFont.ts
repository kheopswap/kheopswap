import WebFont from "webfontloader";

export const preloadFont = () => {
	WebFont.load({
		custom: { families: ["DM Sans Variable", "JetBrains Mono Variable"] },
		classes: true, // body will be hidden until .wf-active is added to the html element
		events: false,
	});
};
