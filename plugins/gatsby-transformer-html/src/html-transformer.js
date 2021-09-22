const { load } = require("cheerio");

exports.loadHtml = rawHtml => {
  return load(rawHtml);
};

exports.renderHtml = $ => {
  return $.html("article");
};