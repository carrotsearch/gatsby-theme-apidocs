const { createFilePath } = require(`gatsby-source-filesystem`);
const { GraphQLJSON } = require(`gatsby/graphql`);
const fs = require(`fs`);
const chokidar = require(`chokidar`);

const capitalize = s => {
  return s.length === 0
    ? s
    : s.substring(0, 1).toLocaleUpperCase() + s.substring(1);
};

exports.onCreateNode = ({ node, getNode, actions }, { basePath }) => {
  const { createNodeField } = actions;
  if (node.internal.type === `Html`) {
    const slug = createFilePath({ node, getNode, basePath });
    createNodeField({
      node,
      name: `slug`,
      value: slug
    });
  }
};

exports.createPages = ({ graphql, actions }) => {
  const { createPage, createRedirect } = actions;

  return graphql(`
    {
      allHtml {
        edges {
          node {
            fields {
              slug
            }
          }
        }
      }
      site {
        siteMetadata {
          indexAlias
        }
      }
    }
  `).then(async result => {
    result.data.allHtml.edges.forEach(({ node }) => {
      const create = (url, slug) => {
        createPage({
          path: url,
          component: require.resolve("./templates/documentation-page.js"),
          context: {
            // Data passed to context is available
            // in page queries as GraphQL variables.
            slug: slug
          }
        });
      };

      const slug = node.fields.slug;
      create(slug, slug);

      const indexAlias = result.data.site.siteMetadata.indexAlias;
      if (indexAlias && indexAlias === slug) {
        createRedirect({
          fromPath: '/',
          toPath: slug,
          force: true,
          redirectInBrowser: true
        });
      }
    });
  });
};

const files = {
  navigation: {
    what: "navigation JSON",
    typeName: "Navigation",
    fieldName: "navigation",
    contentType: GraphQLJSON,
    mediaType: "text/json",
    parser: (raw, what, reporter) => {
      try {
        return JSON.parse(raw);
      } catch (e) {
        reporter.panic(`Could not parse ${what}: ${e}.`);
      }
    }
  },
  footer: {
    what: "footer HTML",
    typeName: "Footer",
    fieldName: "footer",
    contentType: "String",
    mediaType: "text/html",
    parser: raw => raw
  },
  logo: {
    what: "logo HTML",
    typeName: "Logo",
    fieldName: "logo",
    contentType: "String",
    mediaType: "text/html",
    parser: raw => raw
  }
};


exports.sourceNodes = (
  { actions, reporter, createNodeId, createContentDigest, schema },
  { navigation, logo, footer }
) => {
  const { createNode } = actions;

  [
    {
      path: navigation,
      spec: files.navigation
    },
    {
      path: logo,
      spec: files.logo
    },
    {
      path: footer,
      spec: files.footer
    }
  ].forEach(f => {
    process(f);

    if (f.path) {
      const watcher = chokidar.watch(f.path);
      watcher.on("change", () => {
        reporter.info(capitalize(`${f.spec.what} changed.`));
        process(f);
      });
    }
  });

  function process(file) {
    const filename = file.path;
    const spec = file.spec;
    const what = spec.what;

    let raw = "";
    if (filename) {
      try {
        raw = fs.readFileSync(filename, "utf8");
      } catch (e) {
        reporter.panic(`Could not load ${what} from ${filename}.`);
        return;
      }
    }

    const node = {
      id: createNodeId(what),
      parent: null,
      children: [],
      internal: {
        type: spec.typeName,
        mediaType: spec.mediaType,
        content: raw,
        contentDigest: createContentDigest(raw)
      },
      [spec.fieldName]: spec.parser(raw, what, reporter)
    };

    createNode(node);
  }
};

exports.createSchemaCustomization = (
  { actions,  schema }
) => {
  const { createTypes } = actions;

  Object.keys(files).forEach(key => {
    const file = files[key];
    addType(file.typeName, file.contentType, file.fieldName);
  });

  function addType(name, contentType, fieldName) {
    createTypes([
      schema.buildObjectType({
        name: name,
        fields: {
          [fieldName]: contentType
        },
        interfaces: [`Node`]
      })
    ]);
  }
};