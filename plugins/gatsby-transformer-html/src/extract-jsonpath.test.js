
const extractJsonpath = require("./extract-jsonpath.js");
const commentJson = require("comment-json")

describe("extractJsonpath", function () {
  const sampleInput = `{
    "foo": {
      "baz": "string node",
      "bar": [
        // comment.
        "array node"
      ],
      "ban": {
        "bar": [
          "foo"
        ]
      }
    }
  }`;

  const assertReturnsExpected = function(input, path, expected) {
    const actual = extractJsonpath(input, path);
    actual.must.eql(expected);
  }

  it("should work on basic paths", function () {
    assertReturnsExpected(sampleInput, "$.foo.bar", [
`[
  // comment.
  "array node"
]`
    ]);

    assertReturnsExpected(sampleInput, "$.foo.baz", [
      "string node"
    ]);
  });

  it("should support key selector in curly brackets (fixed strings)", function () {
    // one property selector
    assertReturnsExpected(sampleInput, "$.foo{ 'baz' }", [
      `{
  "baz": "string node"
}`
    ]);

    // two fixed properties
    assertReturnsExpected(sampleInput, "$.foo{'baz', \"bar\"}", [
`{
  "baz": "string node",
  "bar": [
    // comment.
    "array node"
  ]
}`
    ]);
  });

  it("should support key selector in curly brackets (regexp)", function () {
    // a regexp
    assertReturnsExpected(sampleInput, "$.foo{/^ba[zr]/}", [
      `{
  "baz": "string node",
  "bar": [
    // comment.
    "array node"
  ]
}`
    ]);
  });

  it("should support json with comments", function() {
    const input = `{
      // json with comments.
      "foo": {
        // baz node
        "baz": "this is baz",
        // bar node
        "bar": "this is bar"
      }
    }`;

    // extract with a regexp
    assertReturnsExpected(input, "$.foo", [
`{
  // baz node
  "baz": "this is baz",
  // bar node
  "bar": "this is bar"
}`
    ]);
  });

  it("should support bracket trimming", function() {
    const input = `{
      "foo": {
        // baz node
        "baz": "this is baz",
        // bar node
        "bar": "this is bar",
        // ban node
        "ban": "this is ban"
      }
    }`;

    assertReturnsExpected(input, "$.foo{'baz','bar', trim-brackets}", [
`  // baz node
  "baz": "this is baz",
  // bar node
  "bar": "this is bar"
`
    ]);
  });

  it("should support comment removal", function() {
    const input = `{
      "foo": {
        // baz node
        "baz": "this is baz",
        // bar node
        "bar": "this is bar",
        // ban node
        "ban": "this is ban"
      }
    }`;

    assertReturnsExpected(input, "$.foo{'baz','bar', trim-brackets, remove-comments}", [
`  "baz": "this is baz",
  "bar": "this is bar"
`
    ]);
  });
});
