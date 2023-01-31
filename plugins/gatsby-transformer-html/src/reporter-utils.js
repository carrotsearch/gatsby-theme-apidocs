exports.error = (message, reporter) => {
  const dot = message.endsWith("." ? "" : ".");
  reporter.panicOnBuild(`${message}${dot}`);
};