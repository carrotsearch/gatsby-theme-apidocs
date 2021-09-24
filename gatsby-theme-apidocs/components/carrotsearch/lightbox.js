// - support for standalone img tags
// - support for light/dark images

export const Lightbox = function () {
  // Build background overlay
  const overlay = document.createElement("div");
  const background = document.createElement("div");
  background.className = "background";
  overlay.className = "overlay";
  overlay.appendChild(background);
  document.body.appendChild(overlay);

  // Close on click and Esc
  overlay.addEventListener("click", unzoom);
  window.addEventListener("keydown", function (e) {
    if (e.keyCode === 27) {
      unzoom();
    }
  });

  // Update caption layout on resize and orientation change.
  window.addEventListener("resize", layoutCaptionIfNeeded);
  window.addEventListener("orientationchange", layoutCaptionIfNeeded);

  document.body.addEventListener("click", e => {
    if (e.target.matches("img")) {
      // Look for a parent figure
      let figure = e.target;
      while (figure && !figure.matches("figure.zoomable")) {
        figure = figure.parentElement;
      }
      if (!figure || figure.matches(".zoomed")) {
        return;
      }

      const inPageImg = e.target;

      // We'll use the clone of the figure in the zoomed-in view
      const absoluteFigure = figure.cloneNode(true);
      absoluteFigure.classList.add("zoomed");
      absoluteFigure.style.opacity = 0;
      absoluteFigure.inPageImg = inPageImg; // we need a reference to the in-page img to perform the un-zoom animation

      overlay.appendChild(absoluteFigure);

      // Let the browser insert the zoomed-in figure to the page and compute styles.
      window.requestAnimationFrame(function () {
        layoutFigure(absoluteFigure);

        // Lay out the caption
        layoutCaption(absoluteFigure, true);

        // Add a CSS transform that will scale/translate the zoomed-in figure to look like the in-page figure.
        // The zoomed-in figure has opacity 0, so it's not yet visible. We'll transition the transform to
        // the full screen view in a minute to create an animation that "zooms in" the in-page figure.
        transform(absoluteFigure);

        // Zoom in the figure
        window.requestAnimationFrame(function () {
          absoluteFigure.addEventListener("transitionend", function zoomed() {
            absoluteFigure.removeEventListener("transitionend", zoomed);
            absoluteFigure.boundingClientRect = undefined;
            absoluteFigure.querySelector("img").boundingClientRect = undefined;

            const hiresImg = absoluteFigure.querySelector("img").cloneNode(true);
            hiresImg.className = "hires";
            hiresImg.sizes = "100vw";
            absoluteFigure.appendChild(hiresImg);
          });

          // Fade-in the figure, set transform to "none" to create the zoom-in effect.
          absoluteFigure.style.opacity = 1;
          absoluteFigure.style.transition = "transform 0.45s";
          absoluteFigure.style.transform = "none";

          // Show overlay, enable event capture.
          background.style.opacity = 1;
          overlay.style.pointerEvents = "auto";
        });
      });
    }
  });

  let layoutTimeout;

  function layoutCaptionIfNeeded() {
    window.clearTimeout(layoutTimeout);
    layoutTimeout = window.setTimeout(function () {
      Array.prototype.slice
        .call(overlay.querySelectorAll("figure.zoomed"))
        .forEach(function (figure) {
          layoutFigure(figure);
          layoutCaption(figure);
        });
    }, 100);
  }

  // Chooses the vertical vs horizontal layout for the zoomed-in figure.
  function layoutFigure(figure) {
    const imgs = figure.querySelectorAll("img, .img");

    // Dimensions
    const figureRect = figure.getBoundingClientRect();
    const inPageImgRect = figure.inPageImg.getBoundingClientRect();

    // Depending on the ratios, the image should fill the whole width or height.
    if (
      figureRect.width / figureRect.height <
      inPageImgRect.width / inPageImgRect.height
    ) {
      setStyles(imgs, "100%", "auto");
    } else {
      setStyles(imgs, "auto", "100%");
    }

    // Forced reflow, probably unavoidable
    const imgRect = imgs[0].getBoundingClientRect();
    if (figureRect.width - imgRect.width > 256) {
      figure.classList.add("horizontal");
    } else {
      figure.classList.remove("horizontal");
    }

    function setStyles(nodeList, width, height) {
      for (let i = 0; i < nodeList.length; i++) {
        nodeList[i].style.width = width;
        nodeList[i].style.height = height;
      }
    }
  }

  // Lays out the caption for the figure.
  function layoutCaption(figure, initial) {
    const caption = figure.querySelector("figcaption");
    if (caption) {
      const img = figure.querySelector("img");

      // Dimensions
      const overlayRect = overlay.getBoundingClientRect();
      const figureRect = figure.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      const padding = overlayRect.height - figureRect.bottom;

      caption.className = "";

      let captionRect;
      if (/horizontal/.test(figure.className)) {
        // For horizontal layout, set the caption width to fill the remaining space on the right
        caption.style.width = figureRect.width - imgRect.width + "px";
        caption.style.height = "auto";

        // On initial layout, add a slide-in animation
        if (initial) {
          captionRect = caption.getBoundingClientRect();
          caption.style.transform =
            "translateX(" + captionRect.width / 2 + "px)";
        }
      } else {
        // For vertical layout, we'll put the caption below or over the image.
        // We'll set the caption width to the width of the image.
        caption.style.width = imgRect.width + "px";
        caption.folded = false;

        // If there's not enough space below the image, overlay the caption on the image.
        captionRect = caption.getBoundingClientRect();
        if (captionRect.bottom > figureRect.bottom) {
          caption.className = "over";
        } else {
          caption.style.height = figureRect.height - imgRect.height + "px";
        }

        // On initial layout, add a slide-in animation
        if (initial) {
          caption.style.transform = "translateY(" + captionRect.height + "px)";

          // On click, hide the caption so that it doesn't obscure the image.
          caption.addEventListener("click", function (e) {
            if (caption.className === "over") {
              e.stopPropagation();
              if (caption.folded) {
                caption.folded = false;
                caption.style.transform = "none";
              } else {
                const captionRect = caption.getBoundingClientRect();
                caption.folded = true;
                caption.style.transform =
                  "scaleY(" +
                  (padding * 2) / captionRect.height +
                  ") " +
                  "scaleX(" +
                  (padding * 2) / captionRect.height +
                  ") " +
                  "translateY(" +
                  captionRect.height +
                  "px)";
              }
            }
          });
        }
      }

      // Run the slide-in animation
      if (initial) {
        caption.style.opacity = 0;
        window.setTimeout(function () {
          caption.style.transition = "transform 0.5s ease, opacity 0.5s";
          caption.style.transform = "none";
          caption.style.opacity = 1;
        }, 250);
      }
    }
  }

  function unzoom() {
    Array.prototype.slice
      .call(overlay.querySelectorAll("figure.zoomed"))
      .forEach(unzoomImage);

    background.style.opacity = 0;
    overlay.style.pointerEvents = "none";

    function unzoomImage(absoluteFigure) {
      if (!absoluteFigure.removing) {
        absoluteFigure.removing = true;
        absoluteFigure.addEventListener("transitionend", function (e) {
          if (e.target === absoluteFigure && e.propertyName === "opacity") {
            overlay.removeChild(absoluteFigure);
          }
        });
        absoluteFigure.style.transition =
          "transform 0.45s, opacity 0.45s ease 0.4s";
        absoluteFigure.style.opacity = 0;
        transform(absoluteFigure);

        const caption = absoluteFigure.querySelector("figcaption");
        if (caption) {
          caption.style.transition = "opacity 0.45s";
          caption.style.opacity = 0;
        }
      }
    }
  }

  function transform(absoluteFigure) {
    const absoluteImg = absoluteFigure.querySelector("img");

    const imgRect = absoluteFigure.inPageImg.getBoundingClientRect();
    const absoluteImgRect = cachedRect(absoluteImg);
    const containerRect = cachedRect(absoluteFigure);

    const factor = imgRect.width / absoluteImgRect.width;
    const xOffset = imgRect.left - absoluteImgRect.left;
    const yOffset = imgRect.top - absoluteImgRect.top;
    absoluteFigure.style.transform =
      "translateX(" +
      xOffset.toFixed(2) +
      "px) translateY(" +
      yOffset.toFixed(2) +
      "px) scale(" +
      factor.toFixed(4) +
      ")";
    absoluteFigure.style.transformOrigin =
      absoluteImgRect.left -
      containerRect.left +
      "px " +
      (absoluteImgRect.top - containerRect.top) +
      "px";

    // Store the first read bounding rect. If the user cancels zoom before
    // the animation completes, getBoundingClientRect() will return the rect
    // with the in-progress transformation applied, which will cause things
    // to go off. In that case, we'll use the cached no-transform rect.
    function cachedRect(element) {
      if (!element.boundingClientRect) {
        element.boundingClientRect = element.getBoundingClientRect();
      }
      return element.boundingClientRect;
    }
  }
};