const { createFilePath } = require(`gatsby-source-filesystem`);
const { GraphQLJSON } = require(`gatsby/graphql`);
const path = require(`path`);
const fs = require(`fs`);
const chokidar = require(`chokidar`);

const capitalize = s => {
  return s.length === 0 ? s : s.substring(0, 1).toLocaleUpperCase() + s.substring(1);
};

exports.onCreateNode = ({ node, getNode, actions }, { basePath }) => {
  const { createNodeField } = actions;
  if (node.internal.type === `Html`) {
    const slug = createFilePath({ node, getNode, basePath });
    createNodeField({
      node,
      name: `slug`,
      value: slug,
    });
  }
};

exports.createPages = ({ graphql, actions }) => {
  const { createPage } = actions;
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
          component: path.resolve(__dirname, `templates/documentation-page.js`),
          context: {
            // Data passed to context is available
            // in page queries as GraphQL variables.
            slug: slug
          }
        })
      };

      const slug = node.fields.slug;
      create(slug, slug);

      const indexAlias = result.data.site.siteMetadata.indexAlias;
      if (indexAlias && indexAlias === slug) {
        create("/", slug);
      }
    });
  })
};

exports.sourceNodes = ({ actions, reporter, createNodeId, createContentDigest, schema },
                       { navigation, logo, footer }) => {
  const { createNode, createTypes } = actions;

  const files = [
    {
      path: navigation,
      what: "navigation JSON",
      typeName: "Navigation",
      fieldName: "navigation",
      contentType: GraphQLJSON,
      mediaType: "text/json",
      parser: (raw, what) => {
        try {
          return JSON.parse(raw);
        } catch (e) {
          reporter.panic(`Could not parse ${what}.`);
        }
      }
    },
    {
      path: footer,
      what: "footer HTML",
      typeName: "Footer",
      fieldName: "footer",
      contentType: "String",
      mediaType: "text/html",
      parser: raw => raw
    },
    {
      path: logo,
      what: "logo HTML",
      typeName: "Logo",
      fieldName: "logo",
      contentType: "String",
      mediaType: "text/html",
      parser: raw => raw
    }
  ];

  files.forEach(f => {
    addType(f.typeName, f.contentType, f.fieldName);
    process(f);

    if (f.path) {
      const watcher = chokidar.watch(f.path);
      watcher.on("change", () => {
        reporter.info(capitalize(`${f.what} changed.`));
        process(f);
      });
    }
  });

  function addType(name, contentType, fieldName) {
    createTypes([
      schema.buildObjectType({
        name: name,
        fields: {
          [fieldName]: contentType
        },
        interfaces: [`Node`]
      }),
    ]);
  }

  function process(file) {
    const filename = file.path;
    const what = file.what;

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
        type: file.typeName,
        mediaType: file.mediaType,
        content: raw,
        contentDigest: createContentDigest(raw)
      },
      [file.fieldName]: file.parser(raw, what)
    };

    createNode(node);
  }
};