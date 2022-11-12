const demand = require("must/register");
const {
  extractDirective,
  applyLineRemoval,
  collectHighlightedLineNumbers
} = require("./code-highlighter");

describe("extractDirective", function () {
  it("must extract directives correctly", function () {
    const comments = {
      "/* highlight-range{1-2} */": { action: "highlight", start: 1, end: 3, type: "range" },
      "// highlight-line": { action: "highlight", start: 0, end: 1, type: "line" },
      "// highlight-next-line": { action: "highlight", start: 1, end: 2, type: "next-line" },
      "/* hide-range{23-40} */": { action: "hide", start: 23, end: 41, type: "range" },
      "// hide-line": { action: "hide", start: 0, end: 1, type: "line" },
      "// hide-next-line": { action: "hide", start: 1, end: 2, type: "next-line" },
      "//hide-line": { action: "hide", start: 0, end: 1, type: "line" },
      "//    hide-line": { action: "hide", start: 0, end: 1, type: "line" },
      "/**hide-line*/": { action: "hide", start: 0, end: 1, type: "line" },
      "/**  hide-line  */": { action: "hide", start: 0, end: 1, type: "line" },
      "#hide-line": { action: "hide", start: 0, end: 1, type: "line" },
      "'hide-line": null,
      "// hide-line extra": null,
      "// extra hide-line": null,
      "/* hide-line": null,
      "/* extra hide-line */": null,
      "/* hide-line extra */": null
    };

    Object.keys(comments).forEach(comment => {
      demand(extractDirective(comment), "Directive from " + comment).eql(
        comments[comment]
      );
    });
  });
});

describe("applyLineRemoval", function () {
  it("must apply hide-line correctly", function () {
    const hidden = applyLineRemoval(`Line0
Line1 // hide-line
Line2`);

    demand(hidden).equal(`Line0
Line2`);
  });

  it("must apply hide-next-line correctly", function () {
    const hidden = applyLineRemoval(`Line0
/** hide-next-line */
Line1
Line2`);

    demand(hidden).equal(`Line0
Line2`);
  });

  it("must apply simple hide-range correctly", function () {
    const hidden = applyLineRemoval(`Line0
/** hide-range{2-4} */
Line1
Line2
Line3
Line4
Line5`);

    demand(hidden).equal(`Line0
Line1
Line5`);
  });
});

describe("collectHighlightedLineNumbers", function () {
  it("must work for highlight-line", function () {
    const { content, linesToHighlight } = collectHighlightedLineNumbers(`Line0
Line 1 // highlight-line`);

    demand(Array.from(linesToHighlight)).eql([1]);
    demand(content).equal(`Line0
Line 1`);
  });

  it("must work for highlight-next-line", function () {
    const { content, linesToHighlight } = collectHighlightedLineNumbers(`Line0
// highlight-next-line
Line 1`);

    demand(Array.from(linesToHighlight)).eql([ 1 ]);
    demand(content).equal(`Line0
Line 1`);
  });

  it("must work for highlight-range", function () {
    const { content, linesToHighlight } = collectHighlightedLineNumbers(`Line0
// highlight-range{2-4}
Line 1
Line 2
Line 3
Line 4`);

    demand(Array.from(linesToHighlight)).eql([ 2, 3, 4 ]);
    demand(content).equal(`Line0
Line 1
Line 2
Line 3
Line 4`);
  });

  it("must work for multiple highlights", function () {
    const { content, linesToHighlight } = collectHighlightedLineNumbers(`Line0
// highlight-range{1-2}
Line 1
Line 2
Line 3
// highlight-next-line
Line 4
// highlight-next-line
Line 5
Line 6
Line 7 // highlight-line`);

    demand(Array.from(linesToHighlight)).eql([ 1, 2, 4, 5, 7 ]);
    demand(content).equal(`Line0
Line 1
Line 2
Line 3
Line 4
Line 5
Line 6
Line 7`);
  });
});
