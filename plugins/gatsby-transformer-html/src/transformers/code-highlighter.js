const hljs = require("highlight.js");
const { removeCommonIndent } = require("../remove-common-indent");
const { removeLeadingAndTrailingNewlines } = require("../remove-leading-and-trailing-newlines.js");

// Map language name from Prism to HighlightJS codes.
const mapLanguage = lang => (lang === "markup" ? "xml" : lang);

// Matches a single line highlighting or removal directive
const dirRe = /(highlight|hide)-(line|next-line|range{(\d+)-(\d+)})/;

// Matches directives in typical comments
const dirCommentRegs = [
  new RegExp(`(//|#)\\s*(${dirRe.source})\\s*$`),
  new RegExp(`(/\\*\\*?)\\s*(${dirRe.source})\\s*\\*/`)
];

// Directives in comments as one regexp.
const dirCommentRe = new RegExp(
  dirCommentRegs.map(r => `(\\s*${r.source})`).join("|")
);

/**
 * Extracts a preprocessing directive from a single line.
 * Returns the action and the line range to which to apply the action, relative
 * to the current line.
 *
 * @param line
 * @returns {{start: number, action, end: number, type}|null}
 */
const extractDirective = line => {
  for (const re of dirCommentRegs) {
    const matches = line.match(re);
    if (matches) {
      let start, end;
      const scope = matches[4];
      let type = scope;
      switch (scope) {
        case "line":
          start = 0;
          end = 1;
          break;

        case "next-line":
          start = 1;
          end = 2;
          break;

        default:
          if (scope.startsWith("range{")) {
            start = parseInt(matches[5]);
            end = parseInt(matches[6]) + 1;
            type = "range";
            break;
          }
          throw "Unknown directive scope: " + scope;
      }

      if (end < start) {
        return null;
      }

      return {
        action: matches[3],
        type: type,
        start: start,
        end: end
      };
    }
  }

  return null;
};
exports.extractDirective = extractDirective;

/**
 * @returns {null|{start: number, action, end: number, type}}
 */
const collectAffectedLineNumbers = (line, offset, test, set) => {
  const dir = extractDirective(line);
  if (dir !== null && test(dir)) {
    for (let l = dir.start; l < dir.end; l++) {
      set.add(offset(dir) + l);
    }
    return dir;
  } else {
    return null;
  }
};

/**
 * Removes lines according to line hiding directives.
 *
 * @param content
 * @returns {string}
 */
const applyLineRemoval = content => {
  const input = content.split("\n");
  const output = [];

  const toRemove = new Set();

  for (let i = 0; i < input.length; i++) {
    if (toRemove.has(i)) {
      continue;
    }

    const line = input[i];

    if (
      collectAffectedLineNumbers(
        line,
        () => i,
        dir => dir.action === "hide",
        toRemove
      ) === null
    ) {
      // Keep line if not matched
      output.push(line);
    }
  }

  return output.join("\n");
};
exports.applyLineRemoval = applyLineRemoval;

/**
 * Collects the numbers of lines to highlight and produces the aligned
 * content (with directives removed) to pass to the highlighter.
 *
 * @returns {{linesToHighlight: Set<any>, content: string}}
 */
const collectHighlightedLineNumbers = content => {
  const input = content.split("\n");
  const output = [];
  const linesToHighlight = new Set();

  let offset = 0;
  for (let i = 0; i < input.length; i++) {
    const line = input[i];

    const dir = collectAffectedLineNumbers(
      line,
      // The -next-line and -range directives remove the line containing
      // the directive, so we need to correct the highlighted line number
      // by -1 and offset to account for this.
      dir => (dir.type === "line" ? i - offset : i - 1 - offset),
      dir => dir.action === "highlight",
      linesToHighlight
    );
    if (dir !== null && dir.type !== "line") {
      // We remove the line with the directive, offset line numbers.
      offset++;
    }

    if (dir === null) {
      output.push(line);
    } else if (dir.type === "line") {
      output.push(line.replace(dirCommentRe, ""));
    }
  }

  return { content: output.join("\n"), linesToHighlight };
};
exports.collectHighlightedLineNumbers = collectHighlightedLineNumbers;

const highlightCode = (html, preserveIndent, preserveNewlines, language) => {
  if (!preserveIndent) {
    html = removeCommonIndent(html);
  }
  if (!preserveNewlines) {
    html = removeLeadingAndTrailingNewlines(html);
  }
  html = applyLineRemoval(html);

  const { content, linesToHighlight } = collectHighlightedLineNumbers(html);

  const hl = hljs.highlight(content, {
    language: mapLanguage(language)
  });

  const highlighted = hl.value
    .split("\n")
    .map((l, i) => {
      if (linesToHighlight.has(i)) {
        return `<mark>${l}</mark>`;
      } else {
        return l;
      }
    })
    .join("\n");
  return `<pre><code data-language="${hl.language}">${highlighted}</code></pre>`;
};
exports.highlightCode = highlightCode;

exports.CodeHighlighter = function () {
  this.transform = $ => {
    $("pre[data-language]").replaceWith((i, el) => {
      const $el = $(el);

      // refactor this into common-indent=preserve
      const preserveIndent = $el.data("preserve-common-indent");
      const preserveNewlines = $el.data(
        "preserve-leading-and-trailing-newlines"
      );
      const language = $el.data("language");
      const html = $el.html();
      return highlightCode(html, preserveIndent, preserveNewlines, language);
    });
    return $;
  };
};
