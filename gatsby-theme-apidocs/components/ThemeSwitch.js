import React from "react";
import { ThemeToggler } from "gatsby-plugin-dark-mode";
import { LightDarkSwitch } from "./carrotsearch/LightDarkSwitch.js";

export const ThemeSwitch = () => {
  return (
    <ThemeToggler>
      {({ theme, toggleTheme }) => {
        if (!theme) {
          return null;
        }
        const changeTheme = e => {
          toggleTheme(e.target.checked ? 'dark' : 'light');
          setTimeout(() => {
            const meta = document.querySelector("meta[name='theme-color']");
            if (meta) {
              meta.setAttribute("content",
                window.getComputedStyle(document.body)
                  .getPropertyValue("background-color"));
            }
          }, 10);
        };
        return (
          <LightDarkSwitch dark={theme === 'dark'} onChange={changeTheme} />
        );
      }}
    </ThemeToggler>
  );
};