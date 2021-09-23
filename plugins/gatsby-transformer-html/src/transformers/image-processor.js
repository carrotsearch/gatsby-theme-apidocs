const { fluid } = require("gatsby-plugin-sharp");
const { notInPre } = require("../cheerio-utils");

/**
 * Process images through "gatsby-plugin-sharp". This will copy and optimize
 * the image in multiple resolutions for different devices.
 */
exports.ImageProcessor = function ({
  getNodesByType,
  pathPrefix,
  imageQuality,
  reporter,
  cache
}) {
  this.transform = async $ => {
    const $img = $("img").filter(notInPre($));

    // Collect nodes for all files we process.
    const fileNodesByPath = getNodesByType("File").reduce((map, n) => {
      map.set(n.relativePath, n);
      return map;
    }, new Map());

    // Collect images whose relative paths point at existing files.
    const imageNodesToProcess = [];
    $img.each((i, img) => {
      const src = img.attribs.src;
      if (fileNodesByPath.has(src)) {
        imageNodesToProcess.push(fileNodesByPath.get(src));
      } else {
        reporter.warn(`Image file not found for img src ${src}.`);
      }
    });

    // Process the images through the sharp plugin.
    const processed = await Promise.all(
      imageNodesToProcess.map(n =>
        fluid({
          file: n,
          args: { maxWidth: 40 * 18, pathPrefix, quality: imageQuality },
          reporter,
          cache
        })
      )
    );
    const processedByRelativePath = processed.reduce((map, fluid, i) => {
      map.set(imageNodesToProcess[i].relativePath, fluid);
      return map;
    }, new Map());

    // Replace the images in the HTML.
    $img
      .filter((i, img) => processedByRelativePath.has(img.attribs.src))
      .replaceWith((i, img) => {
        const fluid = processedByRelativePath.get(img.attribs.src);
        const className = [img.attribs.class, "fluid"]
          .filter(e => !!e)
          .join(" ");
        const ratio = `${(1 / fluid.aspectRatio) * 100}%`;

        const previewTag = `<span style="padding-bottom: ${ratio}; background-image: url('${fluid.base64}')" 
              class="preview ${className}"> </span>`;

        const imgTag = `<img class="${className}"
             alt="${img.attribs.alt || ""}"
             title="${img.attribs.title || ""}"
             src="${fluid.src}"
             srcSet="${fluid.srcSet}"
             sizes="${fluid.sizes}" />`;

        return `<div style="position: relative">${previewTag}${imgTag}</div>`;
      });
    return $;
  };
};
