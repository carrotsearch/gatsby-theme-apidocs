const path = require("path");

const { GraphQLJSON } = require(`gatsby/graphql`);

const {
  replaceVariables,
  validateVariables,
  createMapReplacer
} = require("./src/replace-variables.js");
const { loadEmbeddedContent } = require("./src/embed-utils");
const { rewriteInternalLinks } = require("./src/rewrite-internal-links.js");
const { generateElementId } = require("./src/generate-element-id.js");
const extractFragment = require("./src/extract-fragment.js");
const extractJsonpath = require("./src/extract-jsonpath.js");
const { CodeHighlighter } = require("./src/transformers/code-highlighter");
const { loadHtml, renderHtml } = require("./src/html-transformer");
const { encode } = require("html-entities");
const { notInPre } = require("./src/cheerio-utils");
const { ImageProcessor } = require("./src/transformers/image-processor");
const { SvgInliner } = require("./src/transformers/svg-inliner");
const { error } = require("./src/reporter-utils");

// The transformation functions should be converted to plugins, but
// for now we keep them integrated to avoid proliferation of boilerplate.

const indexingAllowed = $ => (i, el) => $(el).data("indexing") !== "disabled";

/**
 * Embeds code from a separate file. Relative file path provided in the
 * data-embed attribute is resolved against the path of the file in which
 * the embed tag appears.
 */
const embedCode = ($, dir, variables, reporter) => {
  $("pre[data-embed]")
    .filter(notInPre($))
    .replaceWith((i, el) => {
      const $el = $(el);
      const declaredEmbed = $el.data("embed");
      const fragment = $el.data("fragment");
      const jsonpath = $el.data("jsonpath");
      const declaredLanguage = $el.data("language");

      const rawContent = loadEmbeddedContent(
        declaredEmbed,
        dir,
        variables,
        reporter
      );

      if (rawContent === undefined) {
        return "";
      }

      const ext = path.extname(declaredEmbed).substring(1).toLowerCase();
      const language = declaredLanguage || ext;

      if (jsonpath && fragment) {
        throw `jsonpath and fragment are mutually exclusive.`;
      }

      let content;
      if (jsonpath) {
        try {
          const fragments = extractJsonpath(rawContent, jsonpath);
          // there can be more than one matching path... should we bail out if this is the case?
          // for now, let's just emit a pre for each path output.
          return fragments.map(ob => `<pre data-language=${language}>${encode(ob)}</pre>`).join("\n");
        } catch (e) {
          error(`Failed do embed jsonpath: ${e}.`, reporter);
          content = "";
        }
      } else if (fragment) {
        try {
          content = extractFragment(rawContent, fragment);
        } catch (e) {
          error(`Failed do embed content: ${e}.`, reporter);
          content = "";
        }
      } else {
        content = rawContent;
      }

      // Encode entities inside the embedded fragment.
      return `<pre data-language=${language}>${encode(content)}</pre>`;
    });
  return $;
};

const anchorSvg = `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16"><path fill-rule="evenodd" d="M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z" /></svg>`;

const addSectionAnchors = $ => {
  $("section[id] > :header")
    .filter((i, el) => el.name !== "h1")
    .filter((i, el) => $(el).parents("pre[data-language]").length === 0) // don't process HTML inside pre
    .replaceWith((i, el) => {
      const $el = $(el);
      return `<${el.name}>
        <a class="anchor" href="#${$el
        .parent()
        .attr("id")}" aria-hidden="true">${anchorSvg}</a>${$el.html()}
      </${el.name}>`;
    });
  return $;
};

const addIdsForIndexableFragments = $ => {
  const existing = new Set();

  forEachFullTextFragment($, $f => generateElementId($f, normalize, existing));
  $(".warning, .info").each((i, e) =>
    generateElementId($(e), normalize, existing)
  );
  return $;
};

/**
 * Builds a table of contents JSON based on section nesting and headings.
 */
const createToc = $ => {
  return $("article > section[id]")
    .filter(notInPre($))
    .map(function asToc(i, e) {
      const $section = $(e);
      const $subsections = $section.is("[data-toc='omit-children']")
        ? []
        : $section
          .children("section[id]")
          .filter((i, el) => !$(el).is("[data-toc='omit']"));
      return {
        heading: $section.children(":header").eq(0).text(),
        anchor: $section.attr("id"),
        ...($subsections.length > 0 && {
          sections: $subsections.map(asToc).get()
        })
      };
    })
    .get();
};

const removeEmpty = a => {
  return a.filter(e => !!e).join(" ");
};

const forEachFullTextFragment = ($, cb) => {
  const elements = ["p", "li"];
  const isIndexed = indexingAllowed($);

  elements.forEach(tag => {
    $(`${tag}`).each((i, e) => {
      const $e = $(e);
      // Don't index the first paragraph of figure
      // caption, it's indexed as a figure heading.
      if ($e.closest("figcaption").length > 0 && $e.is("p:first-child")) {
        return;
      }

      // Don't index if a child of an element with data-indexing="disabled".
      const withFlag = $e.closest("[data-indexing]");
      if (withFlag.length > 0 && !isIndexed(0, withFlag.get(0))) {
        return;
      }

      if (
        $e.parents("[data-marker]").length > 0 ||
        $e.find("[data-marker]").length > 0
      ) {
        return;
      }
      cb($e);
      $e.attr("data-marker", "");
    });
  });

  $("[data-marker]").removeAttr("data-marker");
};

const getFigureCaption = $e => {
  const $caption = $e.find("figcaption");
  if ($caption.children().length > 0) {
    return normalize($caption.children().eq(0).text());
  } else {
    return normalize($caption.text());
  }
};

const headingExtractors = [
  {
    selector: "article",
    type: "heading",
    class: () => "section",
    text: $e => $e.children(":header").text()
  },
  {
    selector: "section[id]",
    type: "heading",
    class: () => "section",
    text: $e => $e.children(":header").text()
  },
  {
    selector: "code[id]",
    type: "code",
    class: () => "api",
    text: $e => $e.text()
  },
  {
    selector: "figure[id]",
    type: "figure",
    class: $e => {
      if ($e.find("img, picture").length > 0) {
        return "image";
      }
      if ($e.find("pre").length > 0) {
        return "example";
      }
      return "figure";
    },
    text: getFigureCaption
  },
  {
    selector: ".warning, .info",
    type: "heading",
    class: () => null,
    text: $e => $e.find("strong").eq(0).text()
  },
  {
    selector: "dt[id]",
    type: "heading",
    class: () => null,
    text: $e => $e.text()
  }
];

const normalize = t => {
  return t.trim().replace(/(\s|\n)+/g, " ");
};

const collectIndexableFragments = $ => {
  const isIndexed = indexingAllowed($);
  const fragments = [];
  if (!isIndexed(0, $("article"))) {
    return fragments;
  }

  const extractParents = ($e, includeCaption) => {
    const headings = $e
      .parents("section, article, .warning, .info")
      .children(":header, strong")
      .map((i, heading) => normalize($(heading).text()))
      .get()
      .reverse();

    // For paragraphs inside figure caption,
    // add figure heading to the list of parents.
    const $f = $e.closest("figure");
    if (includeCaption && $f.length > 0) {
      headings.push(getFigureCaption($f));
    }

    return headings;
  };

  headingExtractors.forEach(extractor => {
    $(extractor.selector)
      .filter(isIndexed)
      .each((i, e) => {
        const $e = $(e);
        fragments.push({
          text: normalize(extractor.text($e)),
          type: extractor.type,
          id: $e.attr("id") || "",
          parents: extractParents($e, false),
          class: removeEmpty([extractor.class($e), $e.attr("class")])
        });
      });
  });

  forEachFullTextFragment($, $f => {
    fragments.push({
      text: normalize($f.text()),
      type: "paragraph",
      id: $f.attr("id"),
      parents: extractParents($f, true),
      class: removeEmpty([$f.attr("class")])
    });
  });

  return fragments;
};

// Gatsby API implementation
const onCreateNode = async ({
                              node,
                              actions,
                              loadNodeContent,
                              createNodeId,
                              createContentDigest
                            }) => {
  const { createNode, createParentChildLink } = actions;

  if (
    node.internal.mediaType !== `text/html` ||
    node.internal.type !== "File"
  ) {
    return;
  }

  const rawHtml = await loadNodeContent(node);
  let $ = loadHtml(rawHtml);

  const htmlNode = {
    rawHtml: rawHtml,
    frontmatter: {
      id: node.name,
      title: normalize($("h1").eq(0).text())
    },

    id: createNodeId(`${node.id} >>> HTML`),
    children: [],
    parent: node.id,
    dir: node.dir,
    internal: {
      contentDigest: createContentDigest(rawHtml),
      type: "Html"
    }
  };

  createNode(htmlNode);
  createParentChildLink({ parent: node, child: htmlNode });
};

const tryCache = async (cache, prefix, key, produceEntry) => {
  const k = `${prefix}:${key}`;
  const cached = await cache.get(k);
  if (cached) {
    return cached;
  } else {
    const entry = await produceEntry();

    // Let's be optimistic and not wait for writing to the cache?
    cache.set(k, entry);
    return entry;
  }
};

const setFieldsOnGraphQLNodeType = (
  { type, getNodesByType, reporter, cache, pathPrefix, createContentDigest },
  { variables, transformers, finalizers, imageQuality = 90 }
) => {
  if (type.name === "Html") {
    const runTransformers = (fns, $, dir) => {
      if (fns) {
        for (let i = 0; i < fns.length; i++) {
          $ = fns[i]($, {
            dir,
            variables,
            reporter,
            loadEmbeddedContent
          });
        }
      }
      return $;
    };

    const codeHighlighter = new CodeHighlighter();
    const imageProcessor = new ImageProcessor({
      getNodesByType, pathPrefix, imageQuality, reporter, cache
    });
    const svgInliner = new SvgInliner({ getNodesByType, variables, reporter});

    return {
      html: {
        type: "String",
        resolve: async node => {
          return tryCache(cache, "html", node.internal.contentDigest, async () => {
            // For correct highlighting of HTML code, we need to disable
            // entity resolution in cheerio and then patch this in the
            // serialized HTML, see fixClosingTagsInHighlightedCode() below.
            let $ = loadHtml(node.rawHtml);
            $ = runTransformers(transformers, $, node.dir);
            $ = await svgInliner.transform($, node.dir);
            $ = await imageProcessor.transform($, node.dir);
            $ = rewriteInternalLinks($);
            $ = addSectionAnchors($);
            $ = embedCode($, node.dir, variables, reporter);
            $ = codeHighlighter.transform($);
            $ = addIdsForIndexableFragments($);
            $ = runTransformers(finalizers, $, node.dir);

            let rendered = renderHtml($);
            rendered = replaceVariables(rendered, createMapReplacer(variables));
            return rendered;
          });
        }
      },
      tableOfContents: {
        type: GraphQLJSON,
        resolve: async node => {
          return tryCache(cache, "toc", node.internal.contentDigest, () => {
            return createToc(loadHtml(node.rawHtml));
          });
        }
      },
      indexableFragments: {
        type: GraphQLJSON,
        resolve: async node => {
          return tryCache(cache, "indexableFragments", node.internal.contentDigest, () => {
            let $ = loadHtml(node.rawHtml);
            $ = runTransformers($, node.dir);
            $ = addIdsForIndexableFragments($);
            return collectIndexableFragments($);
          });
        }
      }
    };
  }
};

const onPreBootstrap = ({ reporter }, { variables }) => {
  try {
    validateVariables(variables);
  } catch (e) {
    reporter.panic(e);
  }
};

exports.onPreBootstrap = onPreBootstrap;
exports.onCreateNode = onCreateNode;
exports.setFieldsOnGraphQLNodeType = setFieldsOnGraphQLNodeType;
