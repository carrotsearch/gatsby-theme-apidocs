exports.error = (message, reporter) => {
  const dot = message.endsWith("." ? "" : ".");
  reporter.error(`${message}${dot}`);
};