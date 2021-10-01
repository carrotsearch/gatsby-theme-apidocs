import React from "react";
import { useEffect, useRef, useState, useMemo } from "react";

import { faSearch } from "@fortawesome/free-solid-svg-icons/faSearch.js";
import { faCode } from "@fortawesome/free-solid-svg-icons/faCode.js";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons/faExclamationTriangle.js";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons/faInfoCircle.js";
import { faImage } from "@fortawesome/free-regular-svg-icons/faImage.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Link, navigate, withPrefix } from "gatsby";
import ReactDOM from "react-dom";
import { useDebounce } from "./useDebounce.js";
import {
  runFuzzySort,
  resultsByPage,
  navigationArticleToChapter
} from "./fuzzysearch.js";

// Simple data stores for exchanging state data between the main search component
// and search results which are in different hierarchies (so that results can
// be overlaid on top of the regular content).

// Search results
const Searcher = function () {
  let listeners = [];
  let query = "";

  this.search = (q, index, articleToChapter) => {
    if (q === query) {
      return;
    }
    query = q;
    const result = runFuzzySort(q, index, articleToChapter);
    listeners.forEach(l => l(q, result));
  };

  this.addListener = listener => listeners.push(listener);
  this.removeListener = listener =>
    (listeners = listeners.filter(l => l !== listener));
};
const searcher = new Searcher();

// Interactions coming from the search box
const Interactions = function () {
  let listeners = [];

  this.trigger = e => listeners.forEach(l => l(e));

  this.addListener = listener => listeners.push(listener);
  this.removeListener = listener =>
    (listeners = listeners.filter(l => l !== listener));
};
const interactions = new Interactions();

// Visibility of the search result
const Visibility = function () {
  let listeners = [];
  let visible = false;

  this.setVisible = v => {
    visible = v;
    listeners.forEach(l => l(visible));
  };
  this.isVisible = () => visible;

  this.addListener = listener => listeners.push(listener);
  this.removeListener = listener =>
    (listeners = listeners.filter(l => l !== listener));
};
const visibility = new Visibility();

/**
 * Query box.
 */
const SearchInput = ({ onQueryChange }) => {
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  useDebounce(
    () => {
      visibility.setVisible(true);

      // Normalize spaces
      return onQueryChange(query.trim().split(/\s+/).join(" "));
    },
    20,
    [query]
  );

  const focusSearch = () => {
    const input = inputRef.current;
    if (input) {
      input.setSelectionRange(0, input.value.length);
      input.focus();
      window.scrollTo(0, 0);
    }
  };

  const handleKeyDown = e => {
    // If search is not in view, pressing / should not
    // type the extra character to the box, only bring it to view.
    if (e.keyCode === 191) {
      if (!isElementInViewport(inputRef.current)) {
        e.preventDefault();
        focusSearch();
      } else if (!visibility.isVisible()) {
        e.preventDefault();
        visibility.setVisible(true);
      }
    }
  };

  useEffect(() => {
    const listener = e => {
      if (
        e.target.classList &&
        e.target.classList.contains("SearchInputInput")
      ) {
        return;
      }
      if (e.keyCode === 191 && inputRef.current) {
        focusSearch();
      }
    };
    document.body.addEventListener("keyup", listener, false);
    return () => document.body.removeEventListener("keyup", listener);
  }, []);

  return (
    <div className="SearchInput">
      <FontAwesomeIcon
        icon={faSearch}
        style={{ width: "1em" }}
        onClick={focusSearch}
      />
      <input
        type="text"
        className="SearchInputInput"
        placeholder="Option, method, keyword"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => visibility.setVisible(true)}
        ref={inputRef}
        aria-label="Search this site"
      />
      <kbd title="Press / to focus" onClick={focusSearch}>
        /
      </kbd>
    </div>
  );
};

function isInternalNavigation(result, location) {
  return withPrefix(result.url).startsWith(location.pathname);
}

// When the search result loads new content, the whole component
// hierarchy unmounts, which causes the search box to disappear.
// However, when navigating to an in-page anchor, we need to
// hide the search results manually using the function below.
const hideResultsOnInternalNavigation = (result, location) => {
  if (isInternalNavigation(result, location)) {
    visibility.setVisible(false);
  }
};

const isElementInViewport = element => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
};

// Browsers won't apply the :target CSS pseudo class on location.pushState,
// so we have to implement this manually, sigh.
const highlightTargetOnInternalNavigation = (result, location) => {
  if (!isInternalNavigation(result, location)) {
    return;
  }
  const previousTarget = document.querySelector(".target");
  if (previousTarget) {
    previousTarget.classList.remove("target");
  }
  const hashIndex = result.url.indexOf("#");
  if (hashIndex >= 0) {
    const id = result.url.substring(hashIndex + 1);
    const newTarget = document.getElementById(id);
    if (newTarget) {
      newTarget.classList.add("target");
    }
  }
};

const classToImage = {
  warning: { icon: faExclamationTriangle, title: "Warning" },
  info: { icon: faInfoCircle, title: "Information" },
  example: { icon: faCode, title: "Code example" },
  image: { icon: faImage, title: "Image" }
};

const SearchResultHeading = ({ result }) => {
  if (result.headless) {
    return null;
  }

  // Icons for special kinds of matches
  const iconImageName = Object.keys(classToImage).find(
    c => result.class.indexOf(c) >= 0
  );
  const iconImage = iconImageName ? classToImage[iconImageName].icon : null;
  const icon = iconImage ? (
    <FontAwesomeIcon
      icon={iconImage}
      style={{ width: "1em" }}
      title={classToImage[iconImageName].title}
    />
  ) : null;

  const parents = result.parents;
  if (result.type === "paragraph") {
    const parent =
      parents.length > 1 ? <small>{parents[parents.length - 2]}</small> : null;
    return (
      <div className="SearchResultHeading">
        {icon}
        {parents[parents.length - 1]}
        {parent}
      </div>
    );
  } else {
    const parent =
      parents.length > 1 ? <small>{parents[parents.length - 1]}</small> : null;
    return (
      <div className="SearchResultHeading">
        {icon}
        <span dangerouslySetInnerHTML={{ __html: result.highlighted[0] }} />
        {parent}
      </div>
    );
  }
};

const SearchResultSnippet = ({ result }) => {
  if (result.type === "paragraph") {
    return (
      <small
        className="snippet"
        dangerouslySetInnerHTML={{ __html: result.highlighted[0] }}
      />
    );
  } else {
    return null;
  }
};

/**
 * An individual search result.
 */
const SearchResult = ({ result, active, location }) => {
  const elementRef = useRef(null);
  const element = elementRef.current;
  useEffect(() => {
    if (active && element && !isElementInViewport(element)) {
      // Try scrolling to top first, so that we get the search input back in view
      window.scrollTo(0, 0);
      if (!isElementInViewport(element)) {
        element.scrollIntoView();
      }
    }
  });

  return useMemo(
    () => (
      <li
        className={result.class + (active ? " active" : "")}
        ref={elementRef}
        onClick={() => hideResultsOnInternalNavigation(result, location)}
      >
        <Link
          to={result.url}
          onClick={() => highlightTargetOnInternalNavigation(result, location)}
        >
          <SearchResultHeading result={result} />
          <SearchResultSnippet result={result} />
        </Link>
      </li>
    ),
    [result, active, location]
  );
};

/**
 * The list of search results. Also handles interaction coming from
 * the input bux (cursors, Esc). This component is placed on top of
 * the regular content.
 */
export const SearchResultList = ({ location }) => {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [apiResults, setApiResults] = useState([]);
  const [apiResultsByPage, setApiResultsByPage] = useState([]);
  const [contentResults, setContentResults] = useState([]);
  const [contentResultsByPage, setContentResultsByPage] = useState([]);

  const [activeResultIndex, setActiveResultIndex] = useState(0);

  // React on interactions from document body
  useEffect(() => {
    const listener = e => {
      interactions.trigger(e);
    };
    document.body.addEventListener("keydown", listener, false);
    return () => document.body.removeEventListener("keydown", listener);
  }, []);

  // Hide on click outside of the search box
  useEffect(() => {
    const listener = e => {
      let node = e.target;
      while (node) {
        if (
          node.classList &&
          (node.classList.contains("SearchResultList") ||
            node.classList.contains("SearchInputInput"))
        ) {
          return;
        }
        node = node.parentNode;
      }
      visibility.setVisible(false);
    };
    document.body.addEventListener("click", listener, false);
    return () => document.body.removeEventListener("click", listener);
  }, []);

  // Listen to visibility changes
  useEffect(() => {
    const listener = v => setVisible(v);
    visibility.addListener(listener);
    return () => visibility.removeListener(listener);
  }, []);

  // Listen to new search results
  useEffect(() => {
    const listener = (query, result) => {
      // React won't batch these updates for us
      ReactDOM.unstable_batchedUpdates(() => {
        setQuery(query);
        if (result === undefined) {
          setApiResults([]);
          setApiResultsByPage([]);
          setContentResults([]);
          setContentResultsByPage([]);
          setActiveResultIndex(0);
          return;
        }
        const [apiByPage, apiFlattened] = resultsByPage(
          result.filter(r => r.class.indexOf("api") >= 0),
          false
        );
        const [contentByPage, contentFlattened] = resultsByPage(
          result.filter(r => r.class.indexOf("api") < 0),
          true
        );

        setApiResults(apiFlattened);
        setApiResultsByPage(apiByPage);
        setContentResults(contentFlattened);
        setContentResultsByPage(contentByPage);
        setActiveResultIndex(0);
      });
    };
    searcher.addListener(listener);
    return () => searcher.removeListener(listener);
  }, []);

  const resultsShowing = visible && query.length > 0;

  // Listen to interaction events
  useEffect(() => {
    const totalLength = Math.max(1, apiResults.length + contentResults.length);

    const activateFirstApiResult = () => setActiveResultIndex(0);
    const activateFirstContentResult = () => {
      setActiveResultIndex(Math.min(totalLength - 1, apiResults.length));
    };
    const activateSibling = delta =>
      setActiveResultIndex(
        (activeResultIndex + delta + totalLength) % totalLength
      );

    const listener = e => {
      if (!resultsShowing) {
        return;
      }

      switch (e.keyCode) {
        case 13:
          // Enter, load the page
          let result;
          if (activeResultIndex < apiResults.length) {
            result = apiResults[activeResultIndex];
          } else {
            result = contentResults[activeResultIndex - apiResults.length];
          }

          if (result) {
            hideResultsOnInternalNavigation(result, location);
            highlightTargetOnInternalNavigation(result, location);
            navigate(result.url);
            e.preventDefault();
            e.stopPropagation();
          }
          break;

        case 40:
          // Cursor down
          activateSibling(1);
          e.preventDefault();
          break;

        case 38:
          // Cursor up
          activateSibling(-1);
          e.preventDefault();
          break;

        case 9:
          // Tab, switch between result columns
          if (activeResultIndex < apiResults.length) {
            activateFirstContentResult();
          } else {
            setActiveResultIndex(0);
          }
          e.preventDefault();
          break;

        case 83:
          // Alt + s, activate sections column
          if (e.altKey) {
            activateFirstContentResult();
          }
          break;

        case 65:
          // Alt + s, activate API column
          if (e.altKey) {
            activateFirstApiResult();
          }
          break;

        case 27:
          visibility.setVisible(false);
          break;

        default:
          break;
      }
    };
    interactions.addListener(listener);
    return () => interactions.removeListener(listener);
  }, [apiResults, contentResults, activeResultIndex, resultsShowing, location]);

  const style = resultsShowing ? null : { display: "none" };

  // Use two active result references (one per section) to be able
  // to memoize the rendering of the panel without active result.
  const activeApiResult =
    activeResultIndex < apiResults.length
      ? apiResults[activeResultIndex]
      : null;
  const activeContentResult =
    activeResultIndex >= apiResults.length
      ? contentResults[activeResultIndex - apiResults.length]
      : null;

  return (
    <div className="SearchResultList" style={style}>
      <div className="container">
        <section className="api">
          <h1>
            <u>A</u>PI elements
          </h1>

          <SearchResultListSection
            results={apiResults}
            resultsByPage={apiResultsByPage}
            activeResult={activeApiResult}
            location={location}
          />
        </section>

        <div className="divider" />

        <section className="content">
          <h1>
            <u>S</u>ections and content
          </h1>

          <SearchResultListSection
            results={contentResults}
            resultsByPage={contentResultsByPage}
            activeResult={activeContentResult}
            location={location}
          />
        </section>
      </div>
      <SearchResultListHints />
    </div>
  );
};

const SearchResultListHints = () => {
  return (
    <ul className="hints">
      <li>
        <kbd>Enter</kbd> to go to the highlighted result.
      </li>
      <li>
        <kbd>&#8593;</kbd> and <kbd>&#8595;</kbd> to change highlight.
      </li>
      <li>
        <kbd>Tab</kbd> to switch between result lists.
      </li>
      <li>
        <kbd>Esc</kbd> to hide the results.
      </li>
    </ul>
  );
};

const SearchResultListSection = ({
  results,
  resultsByPage,
  activeResult,
  location
}) => {
  return useMemo(() => {
    if (results.length === 0) {
      return <div className="NoResults">No matching results</div>;
    }

    return (
      <table>
        <tbody>
          {resultsByPage.map(page => (
            <tr key={page.title}>
              <td className="page">
                <ul>
                  <li>{page.title}</li>
                </ul>
              </td>
              <td className="results">
                <ul>
                  {page.results.map(r => (
                    <SearchResult
                      key={`${page.title}-${r.url}`}
                      result={r}
                      location={location}
                      active={r === activeResult}
                    />
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }, [results, resultsByPage, activeResult, location]);
};

export const Search = ({ headings, navigation }) => {
  const articleToChapter = navigationArticleToChapter(navigation);

  return (
    <div className="Search">
      <SearchInput
        onQueryChange={query =>
          searcher.search(query, headings, articleToChapter)
        }
      />
    </div>
  );
};
