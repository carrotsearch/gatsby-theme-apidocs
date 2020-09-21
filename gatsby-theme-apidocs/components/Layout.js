import React from "react";
import { ThemeSwitch } from "./ThemeSwitch.js";
import { Search, SearchResultList } from "./Search.js";
import { Navigation } from "./Navigation.js";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons/faBars.js";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes.js";

export const MenuButton = ({ icon , onClick, className }) => {
  return (
    <button className={className} onClick={onClick}>
      <FontAwesomeIcon icon={icon} style={{width: "2rem", height: "2rem"}} />
    </button>
  );
};

export const Layout = ({ articleId, children, location, data, logo, footer }) => {
  return (
    <div className="layout">
      <div className="logo">
        {logo}
      </div>
      <div className="search">
        <Search headings={data.contentSearchHeadings} />
      </div>
      <div className="theme-switch" title="Switch dark mode">
        <ThemeSwitch />
        <MenuButton icon={faBars} className="menu open"
                    onClick={() => document.querySelector("div.layout").classList.add("menu-open")} />
        <MenuButton icon={faTimes} className="menu close"
                    onClick={() => document.querySelector("div.layout").classList.remove("menu-open")} />
      </div>

      <nav className="main">
        <Navigation navigation={data.navigation.navigation} pages={data.allHtml.edges}
                    articleId={articleId} />
      </nav>
      <SearchResultList location={location} />

      {children}

      {footer}
    </div>
  );
};