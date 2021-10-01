import React from "react";
import { useState } from "react";

import { Link } from "gatsby";

const Section = ({ section }) => {
  if (!section) {
    return null;
  }
  return (
    <div className="Section">
      <span>{section}</span>
    </div>
  );
};

const Chapter = ({ chapter, url }) => {
  return (
    <li>
      <Section section={chapter.section} />
      {chapter.title}
      <ul>
        {chapter.articles.map(article => {
          const active = url.startsWith(article.url);
          return (
            <li key={article.url} className={active ? "active" : null}>
              <Link to={article.url}>{article.title}</Link>
            </li>
          );
        })}
      </ul>
    </li>
  );
};

export const Navigation = ({ navigation, url }) => {
  const chapters = navigation.chapters;

  const listItems = chapters.map(chapter => (
    <Chapter
      chapter={chapter}
      url={url}
      key={chapter.title}
    />
  ));

  return <ul>{listItems}</ul>;
};
