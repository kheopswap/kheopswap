import WebFont from "webfontloader";

export const preloadFont = () => {
  WebFont.load({
    custom: { families: ["Lexend Deca Variable"] },
    classes: true, // body will be hidden until .wf-active is added to the html element
    events: false,
  });
};
