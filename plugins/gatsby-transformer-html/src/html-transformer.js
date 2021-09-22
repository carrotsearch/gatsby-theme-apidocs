const { load } = require("cheerio");

exports.loadHtml = rawHtml => {
  return load(rawHtml, { decodeEntities: false, _useHtmlParser2: true });
};

exports.renderHtml = $ => {
  return $.html("article");
};