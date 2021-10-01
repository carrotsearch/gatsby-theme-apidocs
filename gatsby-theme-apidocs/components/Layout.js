import React from "react";
import { ThemeSwitch } from "./ThemeSwitch.js";
import { Search, SearchResultList } from "./Search.js";
import { Navigation } from "./Navigation.js";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faTimes } from "@fortawesome/free-solid-svg-icons";

export const MenuButton = ({ icon, onClick, className }) => {
  return (
    <button className={className} onClick={onClick}>
      <FontAwesomeIcon icon={icon} style={{ width: "2rem", height: "2rem" }} />
    </button>
  );
};

export const Layout = ({
  url,
  children,
  location,
  searchIndex,
  navigation,
  logo,
  footer
}) => {
  return (
    <div className="layout">
      <div className="logo">{logo}</div>
      <div className="search">
        <Search headings={searchIndex} navigation={navigation} />
      </div>
      <div className="theme-switch" title="Switch dark mode">
        <ThemeSwitch />
        <MenuButton
          icon={faBars}
          className="menu open"
          onClick={() =>
            document.querySelector("div.layout").classList.add("menu-open")
          }
        />
        <MenuButton
          icon={faTimes}
          className="menu close"
          onClick={() =>
            document.querySelector("div.layout").classList.remove("menu-open")
          }
        />
      </div>

      <nav className="main">
        <Navigation
          navigation={navigation}
          url={url}
        />
      </nav>
      <SearchResultList location={location} />

      {children}

      {footer}
    </div>
  );
};
