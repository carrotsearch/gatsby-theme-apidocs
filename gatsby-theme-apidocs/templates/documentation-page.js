import React from "react";

import { graphql } from "gatsby";
import { DocumentationPage } from "./DocumentationPage.js";

export default ({ data, location }) => {
  return <DocumentationPage location={location} pageData={data} />;
};

export const query = graphql`
  query ($slug: String!) {
    site {
      siteMetadata {
        title
        description
        lang
        indexAlias
      }
    }
    html(fields: { slug: { eq: $slug } }) {
      frontmatter {
        id
        title
      }
      html
      tableOfContents
    }
  }
`;

export const Head = ({ location, data }) => {
  const article = data.html;
  const site = data.site;
  const metadata = site.siteMetadata;

  let canonical;
  if (location.pathname === "/") {
    canonical = <link rel="canonical" href={metadata.indexAlias} />;
  }

  return (
    <>
      <title>
        {article.frontmatter.title} - {metadata.title}
      </title>
      <meta name="description" content={metadata.description} />
      <html lang={metadata.lang} />
      <meta name="theme-color" content="#fff" />
      {canonical}
    </>
  );
}