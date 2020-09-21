import fuzzysort from "fuzzysort";

const rightBoundary = " ,".split("").reduce((set, s) => {
  set.add(s.codePointAt(0));
  return set;
}, new Set());

const correctBoundaries = (chunks, text) => {
  const maxPos = text.length;
  chunks.forEach(chunk => {
    while (chunk[0] > 0 && text.codePointAt(chunk[0] - 1) !== 32) {
      chunk[0]--;
    }
    while (chunk[1] < maxPos && !rightBoundary.has(text.codePointAt(chunk[1]))) {
      chunk[1]++;
    }
  });
  return chunks;
};

const mergeChunks = chunks => {
  if (chunks.length === 0) {
    return chunks;
  }
  const merged = [];
  let current = chunks[0];
  merged.push(current);
  for (let i = 1; i < chunks.length; i++) {
    const next = chunks[i];
    if (next[0] <= current[1]) {
      current[1] = next[1];
    } else {
      current = next;
      merged.push(current);
    }
  }

  return merged;
};

const truncateHighlights = (hl, maxCharsPerContext = 100) => {
  if (hl.length <= maxCharsPerContext) {
    return hl;
  }

  const separator = /([^\s<,.?!]*<b>.+?<\/b>[^\s<,.?!]*)/g;
  const fullSplit = hl.split(separator);

  // No highlight
  if (fullSplit.length < 2) {
    return hl;
  }

  let chunks = [];

  // Start with a match, not with the "before" string.
  let i = separator.test(fullSplit[0]) ? 0 : 1;
  let pos = 0;
  for (; i < fullSplit.length; i += 2) {
    const before = i - 1 >= 0 ? fullSplit[i - 1] : "";
    const match = fullSplit[i];
    const after = i + 1 < fullSplit.length ? fullSplit[i + 1] : "";

    const chunk = [ pos + before.length, pos + before.length + match.length ];

    if (i <= 1 && match.length + before.length <= maxCharsPerContext) {
      // Prefer a longer prefix for the first match.
      chunk[0] -= Math.min(maxCharsPerContext - match.length, before.length);
      chunk[1] += Math.min(maxCharsPerContext - (chunk[1] - chunk[0]), after.length);
    } else {
      const halfContext = (maxCharsPerContext - match.length) >> 1;
      chunk[0] -= Math.min(halfContext, before.length);
      chunk[1] += Math.min(halfContext, after.length);
    }

    chunks.push(chunk);
    pos += before.length + match.length;
  }

  const finalChunks = mergeChunks(correctBoundaries(chunks, hl));
  return finalChunks.map((chunk, i) => {
    // If content was truncated at the beginning or end, add ellipsis.
    return (i === 0 && chunk[0] > 0 ? "... " : "") +
      hl.substring(chunk[0], chunk[1]) +
      (i === finalChunks.length - 1 && chunk[1] < hl.length ? "\u00a0..." : "")
  }).join(" ... ");
};

export const runFuzzySort = (query, data, maxParagraphResults = 10, maxParagraphsPerHeading = 2) => {
  const index = data.index;
  const searchableFields = data.searchableFields;

  if (!query || !index) {
    return [];
  }

  const queryWords = query.split(/\s+/).length;

  const options = {
    keys: searchableFields,
    limit: 60,
    threshold: -1000
  };

  // Remove spaces for the actual search. This will remove space highlights,
  // results are the same otherwise.
  const queryForSearch = query.replace(/\s+/g, "");

  const results = fuzzysort.go(queryForSearch, index, options)
    .filter((() => {
      const paragraphsPerHeading = new Map();
      let paragraphResults = 0;
      return r => {
        if (r.obj.type === "paragraph") {
          if (++paragraphResults >= maxParagraphResults) {
            return false;
          }
          const heading = r.obj.parents[r.obj.parents.length - 1];
          if (paragraphsPerHeading.has(heading)) {
            paragraphsPerHeading.set(heading, paragraphsPerHeading.get(heading) + 1);
          } else {
            paragraphsPerHeading.set(heading, 1);
          }
          return paragraphsPerHeading.get(heading) <= maxParagraphsPerHeading;
        }
        return true;
      };
    })())
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      } else {
        const textA = a[0], textB = b[0];
        const urlA = a.obj.url, urlB = b.obj.url;
        return textA < textB ? -1 : textA > textB ? 1 :
          urlA < urlB ? -1 : urlA > urlB ? 1 : 0;
      }
    });

  return results.reduce((res, r) => {
    const highlighted = searchableFields.map((field, index) => {
      return fuzzysort.highlight(r[index]);
    });

    let accepted;
    if (r.obj.type === "paragraph") {
      // Test only the first field for now.
      const hl = highlighted[0];
      const hlSplit = hl.match(/<b>.+?<\/b>/g);

      // If query is 3 characters or less, we only accept matches
      // with one highlighted region (fuzzy sort does not highlight
      // repeated matches, only the first one). For longer queries,
      // we allow one more region than the number of words.
      if (query.length <= 3) {
        accepted = hlSplit.length <= queryWords;
      } else {
        accepted = hlSplit.length <= queryWords + 1;
      }

      // Truncate the output
      if (accepted) {
        for (let i = 0; i < highlighted.length; i++) {
          highlighted[i] = truncateHighlights(highlighted[i]);
        }
      }
    } else {
      accepted = true;
    }

    if (accepted) {
      res.push({
        ...r.obj,
        highlighted: highlighted,
        score: r.score
      });
    }
    return res;
  }, []);
};

const getHeadingForIndex = r => r.type === "heading" || r.type === "figure" ?
  r.searchable + r.url : r.parents[r.parents.length - 1];

const reorderResultsByHeading = resultsByPage => {
  const byHeading = resultsByPage.map(r => ({ heading: getHeadingForIndex(r), results: [] }));
  const headingIndex = byHeading.reduce((map, h) => {
    map.set(h.heading, h);
    return map;
  }, new Map());


  resultsByPage.forEach(r => {
    const forHeading = headingIndex.get(getHeadingForIndex(r));
    r.headless = !r.class.includes("image") && !r.class.includes("example") &&
      forHeading.results.length > 0;
    forHeading.results.push(r);
  });

  return byHeading.reduce((reordered, h) => {
    h.results.forEach(r => reordered.push(r));
    return reordered;
  }, []);
};

export const resultsByPage = (results, reorderByHeading) => {
  const byPage = [];
  const pageIndex = new Map();

  results.forEach(r => {
    const page = r.parents[0] || r.searchable;
    let pageResults;

    if (pageIndex.has(page)) {
      pageResults = pageIndex.get(page);
    } else {
      pageResults = { title: page, results: [] };
      pageIndex.set(page, pageResults);
      byPage.push(pageResults);
    }

    pageResults.results.push(r);
  });

  const byPageFlattened = byPage.reduce((flattened, p) => {
    p.results.forEach(r => flattened.push(r));
    return flattened;
  }, []);

  if (reorderByHeading) {
    byPage.forEach(r => reorderResultsByHeading(r.results));
  }

  return [ byPage, byPageFlattened ];
};

