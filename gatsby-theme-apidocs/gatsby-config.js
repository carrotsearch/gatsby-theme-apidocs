module.exports = options => ({
  pathPrefix: "__RELATIVIZE_PREFIX__",
  plugins: [
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "content",
        path: "./src/content"
      }
    },
    {
      resolve: "gatsby-plugin-nprogress",
      options: {
        color: "#ffaa00",
        showSpinner: false
      }
    },
    "gatsby-plugin-sharp",
    "gatsby-plugin-dark-mode",
    {
      resolve: "@carrotsearch/gatsby-transformer-html",
      options: {
        variables: options.variables,
        transformers: options.transformers,
        finalizers: options.finalizers
      }
    },
    "@carrotsearch/gatsby-plugin-content-search",
    "gatsby-plugin-offline",
    "gatsby-plugin-catch-links",
    "gatsby-plugin-meta-redirect",
    "@carrotsearch/gatsby-plugin-relativize"
  ]
});
