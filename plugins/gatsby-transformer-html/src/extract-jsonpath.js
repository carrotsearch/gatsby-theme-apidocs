
const jsonPath = require("jsonpath");

module.exports = (content, path) => {
  if (!content) {
    throw `Can't extract json path from empty content.`;
  }

  let output;
  try {
    const parsed = JSON.parse(content);

    path = path.trim()
    if (path.endsWith('}')) {
      // assume key selector is present.
      const lastBracket = path.lastIndexOf('{')
      let selectors = path.substring(lastBracket + 1, path.length - 1).trim()
      path = path.substring(0, lastBracket)

      // collect selector expressions
      selectors = selectors.split(/\s*,\s*/).map(selector => {
        // 'propertyName' or "propertyName".
        if (selector.match(/'.+'/) || selector.match(/".+"/)) {
          return (v => v === selector.substring(1, selector.length - 1));
        }
        // /regexp/
        if (selector.match(/\/.+\//)) {
          const re = new RegExp(selector.substring(1, selector.length - 1));
          return (v => v.match(re))
        }
        throw "Unknown selector type: " + selector;
      })

      const keySelector = (selectors.length === 0)
        ? (() => true)
        : (key => {
        for (const fn of selectors) {
          if (fn(key)) {
            return true;
          }
        }
        return false;
      });

      return jsonPath.query(parsed, path)
        .map(ob => {
          return Object.keys(ob)
            .filter((key) => {
              return keySelector(key);
            })
            .reduce((cur, key) => { return Object.assign(cur, { [key]: ob[key] })}, {});
        });
    } else {
      output = jsonPath.query(parsed, path);
    }
  } catch (ex) {
    throw `Can't apply json path expression ${path} because: ${ex}`
  }

  if (output.length !== 0) {
    return output;
  } else {
    throw "No matching paths.";
  }
};
