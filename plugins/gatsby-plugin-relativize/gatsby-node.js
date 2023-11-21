"use strict";

const fs = require("fs");
const util = require("util");
const pMap = require("p-map");
const globby = require("globby");
const isTextPath = require("is-text-path");
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

const TRANSFORM_CONCURRENCY = 10;

const escapeRegExp = string => string.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");

const getRelativePrefix = path => {
  // page-data.json is loaded at runtime and taken relatively to the
  // originating HTML, so we need to decrease depth in this case.
  const depth =
    path.split("/").length - 2 - (path.endsWith("page-data.json") ? 1 : 0);
  const relativePrefix = depth > 0 ? "../".repeat(depth) : "./";

  return relativePrefix;
};

const relativizeHtmlFiles = async () => {
  // Replaces all /__RELATIVIZE_PREFIX__/ strings with the correct relative paths
  // based on the depth of the file within the `public/` folder
  const paths = await globby(["public/**/*.html"]);

  await pMap(
    paths,
    async path => {
      const buffer = await readFileAsync(path);
      let contents = buffer.toString();

      // Skip if there's nothing to do
      if (!contents.includes("__RELATIVIZE_PREFIX__")) {
        return;
      }

      const relativePrefix = getRelativePrefix(path);

      contents = contents.replace(
        /\/__RELATIVIZE_PREFIX__\//g,
        () => relativePrefix
      );

      await writeFileAsync(path, contents);
    },
    { concurrency: TRANSFORM_CONCURRENCY }
  );
};

const relativizeJsFiles = async () => {
  // Replaces all "/__RELATIVIZE_PREFIX__" strings __RELATIVIZE_PREFIX__
  // Replaces all "/__RELATIVIZE_PREFIX__/" strings with __RELATIVIZE_PREFIX__ + "/"
  // Replaces all "/__RELATIVIZE_PREFIX__/xxxx" strings with __RELATIVIZE_PREFIX__ + "/xxxx"
  // Also ensures that `__RELATIVIZE_PREFIX__` is defined in case this JS file is outside the document context, e.g.: in a worker
  const paths = await globby(["public/**/*.js"]);

  await pMap(
    paths,
    async path => {
      const buffer = await readFileAsync(path);
      let contents = buffer.toString();

      // Skip if there's nothing to do
      if (!contents.includes("__RELATIVIZE_PREFIX__")) {
        return;
      }

      // Redirect plugin references the __RELATIVIZE_PREFIX__ token inside JSON string
      // passed with JSON.parse('...'). We need to make a special substitution for
      // this case.
      contents = contents.replace(
        /(JSON\.parse\('[^']*)\/__RELATIVIZE_PREFIX__([^']*'\))/,
        (matches, p, s) => {
          return `${p}' + "/__RELATIVIZE_PREFIX__" + '${s}`;
        });

      // DO NOT remove the extra spaces, otherwise the code will be invalid when minified,
      // e.g.: return"__RELATIVIZE_PREFIX__/static/..." -> return __GATSBY_IPFS_PATH_PREFIX + "/static/..."
      let replacer = (matches, s, q2) => {
        return ` __RELATIVIZE_PREFIX__+${q2}/${s}${q2}`;
      };
      contents = contents
        .replace(
          /["'`]\/__RELATIVIZE_PREFIX__["'`]/g,
          () => " __RELATIVIZE_PREFIX__ "
        )
        .replace(/"\/__RELATIVIZE_PREFIX__\/([^"]*?)(")/g, replacer)
        .replace(/'\/__RELATIVIZE_PREFIX__\/([^']*?)(')/g, replacer)
        .replace(/`\/__RELATIVIZE_PREFIX__\/([^`]*?)(`)/g, replacer);

      contents = `if(typeof __RELATIVIZE_PREFIX__ === 'undefined'){__RELATIVIZE_PREFIX__=''}${contents}`;

      await writeFileAsync(path, contents);
    },
    { concurrency: TRANSFORM_CONCURRENCY }
  );
};

const relativizeMiscAssetFiles = async () => {
  // Replaces all /__RELATIVIZE_PREFIX__/ strings to standard relative paths
  const paths = await globby([
    "public/**/*",
    "!public/**/*.html",
    "!public/**/*.js"
  ]);

  await pMap(
    paths,
    async path => {
      // Skip if this is not a text file
      if (!isTextPath(path)) {
        return;
      }

      const buffer = await readFileAsync(path);
      let contents = buffer.toString();

      // Skip if there's nothing to do
      if (!contents.includes("__RELATIVIZE_PREFIX__")) {
        return;
      }

      const relativePrefix = getRelativePrefix(path);

      contents = contents.replace(
        /\/__RELATIVIZE_PREFIX__\//g,
        () => relativePrefix
      );

      await writeFileAsync(path, contents);
    },
    { concurrency: TRANSFORM_CONCURRENCY }
  );
};

const injectScriptInHtmlFiles = async () => {
  // Injects a script into the <head> of all HTML files that defines the
  // __RELATIVIZE_PREFIX__ variable
  const paths = await globby(["public/**/*.html"]);
  const urls = paths.map(p => {
    return escapeRegExp(p.replace("public/", "").replace("/index.html", ""));
  });

  const scriptContents = `var re=/\\/(${urls.join("|")})?(\\/[^\/]*)?$/g;
var i = window.location.pathname.replace(re, "");
window.__RELATIVIZE_PREFIX__ = i;`;

  await pMap(
    paths,
    async path => {
      let contents = await readFileAsync(path);

      contents = contents
        .toString()
        .replace(/<head>/, () => `<head><script>${scriptContents}</script>`);

      await writeFileAsync(path, contents);
    },
    { concurrency: TRANSFORM_CONCURRENCY }
  );
};

exports.onPreBootstrap = ({ store, reporter }) => {
  const { config, program } = store.getState();

  if (!/\/?__RELATIVIZE_PREFIX__/.test(config.pathPrefix)) {
    reporter.panic(
      "The pathPrefix must be set to __RELATIVIZE_PREFIX__ in your gatsby-config.js file"
    );
  }

  if (program._[0] === "build" && !program.prefixPaths) {
    reporter.panic("The build command must be run with --prefix-paths");
  }
};

exports.onPostBuild = async () => {
  // Relativize all occurrences of __RELATIVIZE_PREFIX__ within the built files
  await relativizeHtmlFiles();
  await relativizeJsFiles();
  await relativizeMiscAssetFiles();

  // Inject the runtime script into the <head> of all HTML files
  await injectScriptInHtmlFiles();
};
