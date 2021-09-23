import "normalize.css";
import "./styles/typebase.css";
import "./styles/theme.css";
import "./styles/apidocs.css";
import "./styles/hljs.css";
import "typeface-lato";
import "typeface-raleway";
import "highlight.js/styles/base16/eighties.css"

import { Lightbox } from "./components/carrotsearch/lightbox.js";
import "./components/carrotsearch/lightbox.css";

export const onRouteUpdate = () => {
  new Lightbox();
};