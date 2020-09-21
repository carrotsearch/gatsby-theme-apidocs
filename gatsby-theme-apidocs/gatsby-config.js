module.exports = options => ({
  pathPrefix: '__RELATIVIZE_PREFIX__',
  plugins: [
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `content`,
        path: `./src/content`,
      },
    },
    {
      resolve: `gatsby-plugin-nprogress`,
      options: {
        color: `#ffaa00`,
        showSpinner: false
      }
    },
    `gatsby-plugin-sharp`,
    `gatsby-plugin-react-helmet`,
    `gatsby-plugin-dark-mode`,
    `@carrotsearch/gatsby-transformer-html`,
    '@carrotsearch/gatsby-plugin-content-search',
    `gatsby-plugin-offline`,
    `gatsby-plugin-catch-links`,
    `@carrotsearch/gatsby-plugin-relativize`
  ]
});