// Inspired by gatsby-plugin-local-search. Slimmed-down for use with the
// @carrotsearch/gatsby-plugin-apidocs and @carrotsearch/gatsby-transformer-html.
const _ = require("lodash");
const camelCase = require("lodash.camelcase");
const lowerFirst = require("lodash.lowerfirst");
const fuzzysort = require("fuzzysort");

const { GraphQLJSON } = require(`gatsby/graphql`);

const TYPE_PREFIX = "ContentSearch";
const TYPE_INDEX = "Index";

// Generates a node ID from a given type and node ID.
const generateNodeId = (type, id) => `${TYPE_PREFIX}__${type}__${id}`;

// Generates a node type name from a given type.
const generateTypeName = type => camelCase(`${TYPE_PREFIX} ${type}`);

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
const DEFAULT_SEARCHABLE_FIELDS = ["searchable"];
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

  // Save to cache to use later in GraphQL resolver.
  const fuzzySortIndex = buildFuzzySortIndex(documents, searchableFields);
  const size = JSON.stringify(fuzzySortIndex).length;
  reporter.info(
    `Search index uncompressed size: ${(size / 1024.0).toFixed(1)} kB.`
  );

  await cache.set(generateNodeId(TYPE_INDEX, name), fuzzySortIndex);
};

// Set the GraphQL type for LocalSearchIndex.
const createSchemaCustomization = (
  { actions: { createTypes }, schema },
  { name = DEFAULT_NAME }
) => {
  createTypes([
    schema.buildObjectType({
      name: generateTypeName(`${TYPE_INDEX} ${name}`),
      fields: {
        id: "ID",
        engine: "String",
        searchableFields: GraphQLJSON,
        index: GraphQLJSON
      }
    })
  ]);
};

const createResolvers = async (
  { actions: { createTypes }, createResolvers, cache, schema },
  { name = DEFAULT_NAME, searchableFields = DEFAULT_SEARCHABLE_FIELDS }
) => {
  createResolvers({
    Query: {
      [lowerFirst(generateTypeName(name))]: {
        type: generateTypeName(`${TYPE_INDEX} ${name}`),
        resolve: async () => {
          const index = await cache.get(generateNodeId(TYPE_INDEX, name));

          return {
            id: name,
            searchableFields,
            index: index
          };
        }
      }
    }
  });
};

exports.createPages = createPages;
exports.createSchemaCustomization = createSchemaCustomization;
exports.createResolvers = createResolvers;
