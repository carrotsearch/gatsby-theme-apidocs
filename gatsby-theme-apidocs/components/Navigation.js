import React from "react";
import { useState } from "react";

import { Link } from "gatsby";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown.js";

const Chapter = ({ chapter, active, activate, articleId }) => {
  return (
    <li className={active ? "active" : null}>
      <button className="link" onClick={() => activate(chapter)}>{chapter.title}</button>
      <FontAwesomeIcon icon={faChevronDown} />
      <ul>
        {
          chapter.articles.map(article => {
            const active = article.id === articleId;
            return (
              <li key={article.id} className={active ? "active" : null}>
                <Link to={article.slug}>{article.title}</Link>
              </li>
            );
          })
        }
      </ul>
    </li>
  );
};

export const Navigation = ({ navigation, pages, articleId }) => {
  const chapters = fuse(navigation, pages);
  let initialActiveChapterId;
  for (let chapter of chapters) {
    if (chapter.articles.map(a => a.id).includes(articleId)) {
      initialActiveChapterId = chapter.id;
      break;
    }
  }
  const [activeChapterId, setActiveChapterId] = useState(initialActiveChapterId);

  const listItems = chapters.map(chapter => (
    <Chapter chapter={chapter} active={chapter.id === activeChapterId}
             activate={(chapter) => setActiveChapterId(chapter.id)}
             articleId={articleId} key={chapter.title} />
  ));

  return <ul>{listItems}</ul>;

  function fuse(navigation, pages) {
    const pageById = pages.reduce((map, node) => {
      map.set(node.node.frontmatter.id, node.node);
      return map;
    }, new Map());

    return navigation.chapters.map(c => {
      return {
        id: c.title,
        title: c.title,
        articles: c.articles
          .filter(n => {
            if (!pageById.has(n)) {
              console.warn(`No article content for for navigation entry ${n}, skipping.`);
            }
            return pageById.has(n);
          })
          .map(n => {
            return ({
              id: n,
              slug: pageById.get(n).fields.slug,
              title: pageById.get(n).frontmatter.title
            });
          })
      }
    });
  }
};