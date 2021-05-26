import React from "react";
import PropTypes from "prop-types";

export function LightDarkSwitch(props) {
  return (
    <span className="LightDarkSwitch">
      <input
        className="tgl tgl-ios"
        id="apidocs-theme-switch-input"
        type="checkbox"
        tabIndex="0"
        checked={props.dark}
        onChange={props.onChange}
      />
      <label
        className="tgl-btn"
        htmlFor="apidocs-theme-switch-input"
        title={`Switch to ${props.dark ? "light" : "dark"} theme`}
      />
    </span>
  );
}

LightDarkSwitch.propTypes = {
  dark: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired
};
