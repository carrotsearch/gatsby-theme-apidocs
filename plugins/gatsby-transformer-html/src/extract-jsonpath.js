
const jsonPath = require("jsonpath");

module.exports = (content, path) => {
  if (!content) {
    throw `Can't extract json path from empty content.`;
  }

  let output;
  try {
    const parsed = JSON.parse(content);
    output = jsonPath.query(parsed, path);
  } catch (ex) {
    throw `Can't apply json path expression ${path} because: ${ex}`
  }

  if (output.length !== 0) {
    return output;
  } else {
    throw "No matching paths.";
  }
};
