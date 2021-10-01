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

const Chapter = ({ chapter, articleId }) => {
  return (
    <li>
      <Section section={chapter.section} />
      {chapter.title}
      <ul>
        {chapter.articles.map(article => {
          const active = article.id === articleId;
          return (
            <li key={article.id} className={active ? "active" : null}>
              <Link to={article.url}>{article.title}</Link>
            </li>
          );
        })}
      </ul>
    </li>
  );
};

export const Navigation = ({ navigation, articleId }) => {
  const chapters = navigation.chapters;
  let initialActiveChapterId;
  for (let chapter of chapters) {
    if (chapter.articles.map(a => a.id).includes(articleId)) {
      initialActiveChapterId = chapter.id;
      break;
    }
  }
  const [activeChapterId, setActiveChapterId] = useState(
    initialActiveChapterId
  );

  const listItems = chapters.map(chapter => (
    <Chapter
      chapter={chapter}
      active={chapter.id === activeChapterId}
      activate={chapter => setActiveChapterId(chapter.id)}
      articleId={articleId}
      key={chapter.title}
    />
  ));

  return <ul>{listItems}</ul>;
};
