const { load } = require("cheerio");

const { notInPre } = require("../cheerio-utils");
const { loadEmbeddedContent } = require("../embed-utils");

/**
 * Inlines SVG images referenced in the HTML.
 */
exports.SvgInliner = function ({
  variables,
  reporter,
}) {
  this.transform = async ($, dir) => {
    $("img[src$='.svg']")
      .filter(notInPre($))
      .replaceWith((i, el) => {
        const src = el.attribs.src;

        const content = loadEmbeddedContent(src, dir, variables, reporter);
        if (!content) {
          return "";
        }

        const $svg = load(content);
        return $svg.html("svg");
      });

    return $;
  };
};
