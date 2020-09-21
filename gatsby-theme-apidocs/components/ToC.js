import React from 'react';

export const ToC = ({ toc }) => {
  if (toc.length === 0) {
    return null;
  }

  return (
    <ul>
      {
        toc.map(e => (
          <li key={e.anchor} className={e.sections ? "children" : ""}>
            <a href={`#${e.anchor}`} title={e.heading}>{e.heading}</a>
            {
              e.sections ? <ToC toc={e.sections} /> : null
            }
          </li>
        ))
      }
    </ul>
  );
};