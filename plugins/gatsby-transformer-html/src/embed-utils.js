const { replaceVariables } = require("./replace-variables");
const { error } = require("./reporter-utils");
const path = require("path");
const fs = require("fs");

exports.loadEmbeddedContent = (declaredEmbed, dir, variables, reporter) => {
  // Replace variables in the path. We don't care about the semantics
  // here, it's up to the caller to ensure the path makes sense and is safe.
  const embed = replaceVariables(declaredEmbed, name => {
    const value = variables[name] || "";
    if (value.endsWith("/" || value.endsWith("\\"))) {
      return value.substring(0, value.length - 1);
    } else {
      return value;
    }
  });

  const embedAbsolute = path.resolve(dir, embed);
  if (!fs.existsSync(embedAbsolute)) {
    error(
      `Failed to embed image: relative path ${embed}, resolved to ${embedAbsolute} does not exist.`,
      reporter
    );
    return undefined;
  }

  if (!fs.statSync(embedAbsolute).isFile()) {
    error(
      `Failed to embed image: path ${embed} must point to a file.`,
      reporter
    );
    return undefined;
  }

  return fs.readFileSync(embedAbsolute, "utf8");
};
