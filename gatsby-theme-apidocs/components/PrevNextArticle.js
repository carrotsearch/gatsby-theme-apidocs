import React from "react";
import { Link } from "gatsby";

export const PrevNextArticleBox = ({ which, url, title }) => {
  if (!url) {
    return <div className={which} />;
  }

  const dir =
    which === "prev" ? (
      <span>
        <u>p</u>revious
      </span>
    ) : (
      <span>
        <u>n</u>ext
      </span>
    );
  return (
    <div className={which}>
      {/* eslint-disable-next-line */}
      <Link to={url} accessKey={which.substring(0, 1)}>
        <small>{dir} article</small>
        <br />
        <span className="main">{title}</span>
      </Link>
    </div>
  );
};

export const PrevNextArticle = ({ articleId, navigation }) => {
  const flattenedArticles = navigation.chapters.reduce((array, chapter) => {
    chapter.articles.forEach(a => array.push(a));
    return array;
  }, []);
  const articleIndex = flattenedArticles.findIndex(a => a.id === articleId);
  if (articleIndex < 0) {
    return null;
  }

  let prevIndex = articleIndex;
  do {
    prevIndex--;
  } while (prevIndex >= 0 && flattenedArticles[prevIndex].id === articleId);
  const previousArticle = prevIndex >= 0 ? flattenedArticles[prevIndex] : null;

  let nextIndex = articleIndex;
  do {
    nextIndex++;
  } while (
    nextIndex < flattenedArticles.length &&
    flattenedArticles[nextIndex].id === articleId
  );
  const nextArticle =
    nextIndex < flattenedArticles.length ? flattenedArticles[nextIndex] : null;

  return (
    <div className="PrevNextArticle">
      <PrevNextArticleBox
        which="prev"
        url={previousArticle?.url}
        title={previousArticle?.title}
      />
      <PrevNextArticleBox
        which="next"
        url={nextArticle?.url}
        title={nextArticle?.title}
      />
    </div>
  );
};
