import React from "react";

import { graphql } from "gatsby";
import { DocumentationPage } from "./DocumentationPage.js";

export default ({ data, location }) => {
  return (
    <DocumentationPage location={location} pageData={data} />
  );
}

export const query = graphql`
  query($slug: String!) {
    html(fields: { slug: { eq: $slug } }) {
      frontmatter {
        id
        title
      },
      html,
      tableOfContents
    }
  }
`;