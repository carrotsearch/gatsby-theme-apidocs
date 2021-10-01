import React from "react";
import { Link } from "gatsby";

export const PrevNextArticleBox = ({ which, articleId, articleTitle }) => {
  if (!articleId) {
    return <div className={which} />;
  }

  const url = `/${articleId}/`;
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
        <span className="main">{articleTitle}</span>
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
        articleId={previousArticle?.id}
        articleTitle={previousArticle?.title}
      />
      <PrevNextArticleBox
        which="next"
        articleId={nextArticle?.id}
        articleTitle={nextArticle?.title}
      />
    </div>
  );
};
