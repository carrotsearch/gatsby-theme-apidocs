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
  const previousArticle =
    articleIndex > 0 ? flattenedArticles[articleIndex - 1] : null;
  const nextArticle =
    articleIndex < flattenedArticles.length - 1
      ? flattenedArticles[articleIndex + 1]
      : null;

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
