import React from 'react';

import Link from "gatsby-link";
import { graphql, useStaticQuery } from "gatsby";

import { Layout } from "../components/Layout.js";
import { ToC } from "../components/ToC.js";
import { PrevNextArticle } from "../components/PrevNextArticle.js";
import { Helmet } from "react-helmet";

import parse, { domToReact } from 'html-react-parser';

export const DocumentationPage = ({pageData, location}) => {
  const q = graphql`query  {
    site {
      buildTime
      siteMetadata {
        title,
        description,
        lang,
        indexAlias
      }
    }
    contentSearchHeadings {
      index,
      searchableFields
    }
    navigation { navigation }
    footer { footer }
    logo { logo }
    allHtml {
      edges {
        node {
          frontmatter {
            title,
            id
          }
          fields {
            slug
          }
        }
      }
    }
  }`;
  const data = useStaticQuery(q);

  const article = pageData.html;
  const articleId = article.frontmatter.id;
  const site = data.site;
  const metadata = site.siteMetadata;
  const navigation = data.navigation.navigation;
  const footer = data.footer.footer;
  const logo   = data.logo.logo;


  let canonical;
  if (location.pathname === "/") {
    canonical = <link rel="canonical" href={metadata.indexAlias} />;
  }

  const parserOptions = {
    replace: ({ name, attribs, children}) => {
      // Replace regular links with Gatsby links for proper handling
      // of prefix path and performance improvements (prefetching).
      if (name === "a" && attribs.href && attribs.href.startsWith("/")) {
        return <Link to={attribs.href} className={attribs.class || ""}>{domToReact(children, parserOptions)}</Link>;
      }

      // Build time
      if (name === "span" && attribs.class && attribs.class.includes("current-year")) {
        return <span>{site.buildTime.substring(0, 4)}</span>;
      }

      // Add previous/next article navigation at the bottom of the article.
      if (name === "article") {
        return (
          <article className={attribs.class || ""}>
            {domToReact(children, parserOptions)}
            <PrevNextArticle articleId={articleId} pages={data.allHtml} navigation={navigation} />
          </article>
        )
      }
    }
  };
  const articleElement = parse(article.html, parserOptions);
  const footerElement = footer && footer.length > 0 ? parse(footer, parserOptions) : null;
  const logoElement = logo && logo.length > 0 ? parse(logo, parserOptions) : null;


  return (
    <Layout articleId={articleId} location={location} data={data}
            footer={footerElement} logo={logoElement}>
      <Helmet>
        <title>{article.frontmatter.title} - {metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <html lang={metadata.lang} />
        <meta name="theme-color" content="#fff" />
        {canonical}
      </Helmet>

      <nav className="toc">
        <ToC toc={article.tableOfContents} />
      </nav>
      {articleElement}
    </Layout>
  );
};