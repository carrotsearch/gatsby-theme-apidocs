import "normalize.css";
import "./styles/typebase.css";
import "./styles/theme.css";
import "./styles/apidocs.css";
import "./styles/hljs.css";
import "typeface-lato";
import "typeface-raleway";
import "highlight.js/styles/base16/eighties.css";

import { Lightbox } from "./components/carrotsearch/lightbox.js";
import "./components/carrotsearch/lightbox.css";

export const onInitialClientRender = () => {
  new Lightbox();
};

// Preserve main navigation scrolling position between article reloads.
let lastMainNavScrollTop = undefined;
export const onPreRouteUpdate = () => {
  const mainNav = document.querySelector("nav.main > ul");
  if (mainNav) {
    lastMainNavScrollTop = mainNav.scrollTop;
  }
};

export const onRouteUpdate = () => {
  if (lastMainNavScrollTop !== undefined) {
    const mainNav = document.querySelector("nav.main > ul");
    if (mainNav) {
      mainNav.scrollTo(0, lastMainNavScrollTop);
    }
  }
};
