const hljs = require("highlight.js");
const { removeCommonIndent } = require("../remove-common-indent");

// Map language name from Prism to HighlightJS codes.
const mapLanguage = lang => (lang === "markup" ? "xml" : lang);

exports.CodeHighlighter = function () {
  this.transform = $ => {
    $("pre[data-language]").replaceWith((i, el) => {
      const $el = $(el);
      const preserveIndent = $el.data("preserve-common-indent");

      let html = $el.html();
      if (!preserveIndent) {
        html = removeCommonIndent(html);
      }
      let hl = hljs.highlight(html, { language: mapLanguage($el.data("language")) });
      return `<pre><code data-language="${hl.language}">${hl.value}</code></pre>`;
    });
    return $;
  };
};