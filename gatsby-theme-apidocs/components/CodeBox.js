import React, { useState } from 'react';

import "./CodeBox.css";

export const CodeBox = ({ plainText, children }) => {
  const [ status, setStatus ] = useState("");

  const copy = () => {
    navigator.clipboard.writeText(plainText)
        .then(() => setStatus("ok"))
        .catch(() => setStatus("failed"))
        .finally(() => {
          window.setTimeout(() => {
            setStatus("");
          }, 1000);
        });
  };

  let title;
  switch (status) {
    case "":
      title = "Copy code to clipboard"
      break;

    case "ok":
      title = "Code copied to clipboard"
      break;

    case "failed":
      title = "Failed to copy code to clipboard"
      break;
  }

  return (
      <pre className="CodeBox">{children}<button className={"CopyToClipboard " + status} onClick={copy} title={title}></button></pre>
  );
};