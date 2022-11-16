
const jsonPath = require("jsonpath");
const commentJson = require("comment-json")

module.exports = (content, path) => {
  if (!content) {
    throw `Can't extract json path from empty content.`;
  }

  let output;
  let keySelector = undefined;
  let trimCurlyBrackets = false;
  try {
    let removeComments = false;

    path = path.trim()
    if (path.endsWith('}')) {
      // assume key selector is present.
      const lastBracket = path.lastIndexOf('{')
      let options = path.substring(lastBracket + 1, path.length - 1).trim().split(/\s*,\s*/)
      path = path.substring(0, lastBracket)

      // collect selector expressions
      let selectors = []

      options.forEach(opt => {
        if (opt.match(/'.+'/) || opt.match(/".+"/)) {
          // 'propertyName' or "propertyName".
          const keyName = opt.substring(1, opt.length - 1);
          selectors.push((v => v === keyName));
        } else if (opt.match(/\/.+\//)) {
          // /regexp/
          const re = new RegExp(opt.substring(1, opt.length - 1));
          selectors.push((v => v.match(re)));
        } else if (opt.toLowerCase() === "trim-brackets") {
          trimCurlyBrackets = true;
        } else if (opt.toLowerCase() === "remove-comments") {
          removeComments = true;
        } else {
          throw "Unknown option or selector type: " + opt;
        }
      });

      keySelector = (selectors.length === 0)
        ? (() => true)
        : (key => {
        for (const fn of selectors) {
          if (fn(key)) {
            return true;
          }
        }
        return false;
      });
    }

    const parsed = commentJson.parse(content, null, removeComments);
    output = jsonPath.query(parsed, path);
  } catch (ex) {
    throw `Can't apply json path expression ${path} because: ${ex}`
  }

  if (output.length === 0) {
    throw "Can't apply json path expression ${path} because: no paths are matching";
  }

  if (keySelector) {
    output = output.map(ob => {
      const allowedKeys = Object.keys(ob)
        .filter((key) => {
          return keySelector(key);
        });
      return commentJson.assign({}, ob, allowedKeys);
    });
  }

  // stringify with comments.
  output = output.map(ob => {
    if (typeof ob == 'number' || typeof ob == 'string') {
      return ob;
    }

    ob = commentJson.stringify(ob, null, "  ");
    if (trimCurlyBrackets) {
      ob = ob.replaceAll(/(^\s*\{([ \t]*[\r\n]?))|([ \t]*\}\s*$)/g, "")
    }
    return ob;
  });

  return output;
};
