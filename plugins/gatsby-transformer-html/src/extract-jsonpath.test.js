const extractJsonpath = require("./extract-jsonpath.js");

describe("extractJsonpath", function () {
  const sampleInput = {
    "foo": {
      "baz": "string node",
      "bar": [
        "array node"
      ],
      "ban": {
        "bar": [
          "foo"
        ]
      }
    }
  };

  it("should work on basic paths", function () {
    extractJsonpath(JSON.stringify(sampleInput), "$.foo.bar").must.eql([
      [
        "array node"
      ]
    ]);

    extractJsonpath(JSON.stringify(sampleInput), "$.foo.baz").must.eql([
      "string node"
    ]);
  });

  it("should support key selector in curly brackets (fixed strings)", function () {
    // one property selector
    extractJsonpath(JSON.stringify(sampleInput), "$.foo{ 'baz' }").must.eql([{
      "baz": "string node"
    }]);
    // two fixed properties
    extractJsonpath(JSON.stringify(sampleInput), "$.foo{'baz', \"bar\"}").must.eql([{
      "baz": "string node",
      "bar": [
        "array node"
      ]
    }]);
  });

  it("should support key selector in curly brackets (regexp)", function () {
    // a regexp
    extractJsonpath(JSON.stringify(sampleInput), "$.foo{/^ba[zr]/}").must.eql([{
      "baz": "string node",
      "bar": [
        "array node"
      ]
    }]);
  });
});
