import React from "react";

import "./LogTable.css";

const renderMessage = entry => {
  const details = entry.details;
  switch (entry.code) {
    case "E002":
      const position = details.line >= 0 ? (
        <p className="LogMessageDetails">line: {details.line}, column: {details.column}</p>
      ) : null;

      return (
        <>
          <p>{entry.message}</p>
          <p className="LogMessageDetails">
            {details.description}
          </p>
          {position}
        </>
      );

    case "E042":
      return (
        <>
          <p>{entry.message}</p>
          <p>Query: <code>{details.query}</code></p>
          <p className="LogMessageDetails">
            {details.error}
          </p>
        </>
      );

    default:
      return <>{entry.message}</>;
  }
};
