const demand = require("must/register");

const { load } = require("cheerio");
const { SvgInliner } = require("./svg-inliner");

describe("SvgInliner", function () {
  it("must inline SVG with XML header", async function () {
    const warnings = [];
    const inliner = new SvgInliner({
      variables: {},
      reporter: {
        warn: msg => warnings.push(msg)
      }
    });

    const html = `<article><img src="test/svg-with-xml-declaration.svg" /></article>`;
    const $ = load(html);

    const $result = await inliner.transform($, __dirname);
    const resultHtml = $result.html("article");

    demand(resultHtml).be
      .eql(`<article><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
  <path d="M 0 0 L 10 5 L 0 10 z"></path>
</svg></article>`);
  });
});
