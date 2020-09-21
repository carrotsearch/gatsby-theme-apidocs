module.exports = {
  siteMetadata: {
    title: `APIdocs documentation`,
    description: `APIdocs is an opinionated Gatsby template for writing technical documentation. Clone, customize and start documenting.`,
    lang: `en`,
    indexAlias: `/getting-started/`
  },
  plugins: [ {
    resolve: `gatsby-theme-apidocs`, options: {
      navigation: `${__dirname}/src/navigation.json`,
      logo: `${__dirname}/src/logo.html`,
      footer: `${__dirname}/src/footer.html`,
      basePath: "src/content"
    }
  } ],
}
