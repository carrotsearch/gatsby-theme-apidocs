import React from "react";

import Link from "gatsby-link";
import { graphql, useStaticQuery } from "gatsby";

import { Layout } from "../components/Layout.js";
import { ToC } from "../components/ToC.js";
import { PrevNextArticle } from "../components/PrevNextArticle.js";
import { Helmet } from "react-helmet";

import parse, { domToReact } from "html-react-parser";

const resolveNavigation = (navigation, pages) => {
  const pageById = pages.reduce((map, node) => {
    map.set(node.node.frontmatter.id, node.node);
    return map;
  }, new Map());

  const resolvedChapters = navigation.chapters
    .filter(c => {
      if (!c.expand || pageById.has(c.expand)) {
        return true;
      } else {
        console.warn(
          `No article content for for navigation entry ${c.expand}, skipping.`
        );
      }
    })
    .map(c => {
      if (c.expand) {
        const page = pageById.get(c.expand);

        return {
          id: c.title,
          title: c.title,
          section: c.section,
          articles: page.tableOfContents.map(tc => {
            return {
              id: c.expand,
              slug: page.fields.slug,
              url: page.fields.slug + "#" + tc.anchor,
              title: tc.heading
            }
          })
        };
      } else {
        return {
          id: c.title,
          title: c.title,
          section: c.section,
          articles: c.articles
            .filter(n => {
              if (!pageById.has(n)) {
                console.warn(
                  `No article content for for navigation entry ${n}, skipping.`
                );
              }
              return pageById.has(n);
            })
            .map(n => {
              return {
                id: n,
                slug: pageById.get(n).fields.slug,
                url: pageById.get(n).fields.slug,
                title: pageById.get(n).frontmatter.title
              };
            })
        };
      }
    });

  return {
    chapters: resolvedChapters
  };
};

export const DocumentationPage = ({ pageData, location }) => {
  const q = graphql`
    query {
      site {
        buildTime
        siteMetadata {
          title
          description
          lang
          indexAlias
        }
      }
      contentSearchHeadings {
        index
        searchableFields
      }
      navigation {
        navigation
      }
      footer {
        footer
      }
      logo {
        logo
      }
      allHtml {
        edges {
          node {
            frontmatter {
              title
              id
            }
            fields {
              slug
            }
            tableOfContents
          }
        }
      }
    }
  `;
  const data = useStaticQuery(q);

  const url = `${location.pathname}${location.hash}`;
  const article = pageData.html;
  const articleId = article.frontmatter.id;
  const site = data.site;
  const metadata = site.siteMetadata;
  const navigation = resolveNavigation(data.navigation.navigation, data.allHtml.edges);
  const footer = data.footer.footer;
  const logo = data.logo.logo;

  let canonical;
  if (location.pathname === "/") {
    canonical = <link rel="canonical" href={metadata.indexAlias} />;
  }

  const parserOptions = {
    replace: ({ name, attribs, children }) => {
      // Replace regular links with Gatsby links for proper handling
      // of prefix path and performance improvements (prefetching).
      if (name === "a" && attribs.href && attribs.href.startsWith("/")) {
        return (
          <Link to={attribs.href} className={attribs.class || ""}>
            {domToReact(children, parserOptions)}
          </Link>
        );
      }

      // Build time
      if (
        name === "span" &&
        attribs.class &&
        attribs.class.includes("current-year")
      ) {
        return <span>{site.buildTime.substring(0, 4)}</span>;
      }

      // Add previous/next article navigation at the bottom of the article.
      if (name === "article") {
        return (
          <article className={attribs.class || ""}>
            {domToReact(children, parserOptions)}
            <PrevNextArticle
              articleId={articleId}
              navigation={navigation}
            />
          </article>
        );
      }
    }
  };
  const articleElement = parse(article.html, parserOptions);
  const footerElement =
    footer && footer.length > 0 ? parse(footer, parserOptions) : null;
  const logoElement =
    logo && logo.length > 0 ? parse(logo, parserOptions) : null;

  return (
    <Layout
      url={url}
      location={location}
      searchIndex={data.contentSearchHeadings}
      navigation={navigation}
      navigationRaw={data.navigation.navigation}
      footer={footerElement}
      logo={logoElement}
    >
      <Helmet>
        <title>
          {article.frontmatter.title} - {metadata.title}
        </title>
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
