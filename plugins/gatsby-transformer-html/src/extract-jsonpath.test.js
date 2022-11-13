const extractJsonpath = require("./extract-jsonpath.js");

describe("extractJsonpath", function () {
  const sampleInput = {
    "foo": {
      "baz": "string node",
      "bar": [
        "array node"
      ]
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
});
