// Inspired by gatsby-plugin-local-search. Slimmed-down for use with the
// @carrotsearch/gatsby-plugin-apidocs and @carrotsearch/gatsby-transformer-html.
const fuzzysort = require("fuzzysort");

const fs = require("fs");

const buildFuzzySortIndex = (documents, fields) => {
  documents.forEach(d => {
    fields.forEach(f => {
      d[f + "Prepared"] = fuzzysort.prepare(d[f]);
    });
  });
  return documents;
};

const DEFAULT_NAME = "headings";
const DEFAULT_QUERY = `
{
  allHtml {
    nodes {
      frontmatter {
        id
      }
      indexableFragments
    }
  }
}`;
const DEFAULT_SEARCHABLE_FIELDS = [ "searchable" ];
const DEFAULT_NORMALIZER = ({ data }) => {
  return data.allHtml.nodes.reduce((docs, node) => {
    const pageId = node.frontmatter.id;
    node.indexableFragments.forEach(f => {
      docs.push({
        searchable: f.text,
        type: f.type,
        parents: f.parents,
        url: `/${pageId}${f.id.length > 0 ? "/#" : "/"}${f.id}`,
        class: f.class
      });
    });
    return docs;
  }, []);
};

// Create index and store during createPages and save to cache. The cached
// values will be used in createResolvers.
const createPages = async (
    { graphql, cache, reporter },
    {
      name = DEFAULT_NAME,
      query = DEFAULT_QUERY,
      searchableFields = DEFAULT_SEARCHABLE_FIELDS,
      normalizer = DEFAULT_NORMALIZER
    }
) => {
  const result = await graphql(query);
  if (result.errors) {
    throw result.errors[0];
  }

  const documents = await Promise.resolve(normalizer(result));

  if (documents.length === 0) {
    reporter.warn(
        `The gatsby-plugin-content-search query for index "${name}" returned no nodes. The index and store will be empty.`
    );
  }

  const fuzzySortIndex = buildIndexObject(name, searchableFields,
      buildFuzzySortIndex(documents, searchableFields));
  const json = JSON.stringify(fuzzySortIndex);
  reporter.info(
      `Search index uncompressed size: ${(json.length / 1024.0).toFixed(1)} kB.`
  );

  // Save directly to the output folder so that the client-side code can lazy-load the index.
  await fs.promises.mkdir('./public/page-data', { recursive: true });
  await fs.promises.writeFile("./public/page-data/search-index.json", json);
};

const buildIndexObject = (name, searchableFields, index) => ({
  id: name,
  searchableFields,
  index: index
});

exports.createPages = createPages;