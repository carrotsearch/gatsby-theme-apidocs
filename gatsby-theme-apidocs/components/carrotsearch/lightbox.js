// - support for standalone img tags

const closest = (el, selector) => {
  let result = el;
  while (result && !result.matches(selector)) {
    result = result.parentElement;
  }
  return result;
};

export const Lightbox = function () {
  const transformTransitionTime = 350;

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
    if (e.code === "Escape") {
      unzoom();
    }
  });

  // Close on scroll
  let scrollWhenShown = undefined;
  document.addEventListener("scroll", function () {
    if (scrollWhenShown === undefined) {
      return;
    }

    if (Math.abs(window.scrollY - scrollWhenShown) > 40) {
      unzoom();
    }
  });

  // Update caption layout on resize and orientation change.
  window.addEventListener("resize", layoutCaptionIfNeeded);
  window.addEventListener("orientationchange", layoutCaptionIfNeeded);

  document.body.addEventListener("click", e => {
    if (e.target.matches("img, svg, svg *")) {
      // Look for a parent figure
      const figure = closest(e.target, "figure");
      if (!figure || figure.matches(".zoomed")) {
        return;
      }

      scrollWhenShown = window.scrollY;
      const inPageImg = closest(e.target, "img, svg");

      // We'll use the clone of the figure in the zoomed-in view
      const absoluteFigure = figure.cloneNode(true);
      absoluteFigure.classList.add("zoomed");
      absoluteFigure.style.opacity = 0;
      absoluteFigure.inPageImg = inPageImg; // we need a reference to the in-page img to perform the un-zoom animation

      // Remove preview image
      [ ...absoluteFigure.querySelectorAll(".preview")].forEach(p => {
        p.parentElement.removeChild(p);
      });

      overlay.appendChild(absoluteFigure);

      // Let the browser insert the zoomed-in figure to the page and compute styles.
      window.requestAnimationFrame(function () {
        layoutFigure(absoluteFigure);

        // Add a CSS transform that will scale/translate the zoomed-in figure to look like the in-page figure.
        // The zoomed-in figure has opacity 0, so it's not yet visible. We'll transition the transform to
        // the full screen view in a minute to create an animation that "zooms in" the in-page figure.
        transform(absoluteFigure);

        // Zoom in the figure
        window.requestAnimationFrame(function () {
          absoluteFigure.addEventListener("transitionend", function zoomed() {
            absoluteFigure.removeEventListener("transitionend", zoomed);
            absoluteFigure.boundingClientRect = undefined;
            const img = firstVisibleImg(absoluteFigure);
            img.boundingClientRect = undefined;

            if (img.tagName === "img") {
              const hiresImg = img.cloneNode(true);
              hiresImg.className = "hires";
              hiresImg.sizes = "100vw";
              absoluteFigure.appendChild(hiresImg);
            }
          });

          // Fade-in the figure, set transform to "none" to create the zoom-in effect.
          absoluteFigure.style.opacity = 1;
          absoluteFigure.style.transition = `transform ${transformTransitionTime}ms`;
          absoluteFigure.style.transform = "none";

          // Show overlay, enable event capture.
          background.style.opacity = 1;
          overlay.style.pointerEvents = "auto";
        });
      });
    }
  });

  function firstVisibleImg(absoluteFigure) {
    // Take the first visible img
    return [...absoluteFigure.querySelectorAll("img, svg")].find(n => {
      return window.getComputedStyle(n).getPropertyValue("display") !== "none";
    });
  }

  let layoutTimeout;

  function layoutCaptionIfNeeded() {
    window.clearTimeout(layoutTimeout);
    layoutTimeout = window.setTimeout(function () {
      Array.prototype.slice
        .call(overlay.querySelectorAll("figure.zoomed"))
        .forEach(function (figure) {
          layoutFigure(figure);
        });
    }, 100);
  }

  // Chooses the vertical vs horizontal layout for the zoomed-in figure.
  function layoutFigure(figure) {
    const img = firstVisibleImg(figure);

    // Dimensions
    const figureRect = figure.getBoundingClientRect();
    const inPageImgRect = figure.inPageImg.getBoundingClientRect();

    // Depending on the ratios, the image should fill the whole width or height.
    if (
      figureRect.width / figureRect.height <
      inPageImgRect.width / inPageImgRect.height
    ) {
      setStyles(img, "100%", "auto");
    } else {
      setStyles(img, "auto", "100%");
    }

    // Forced reflow, probably unavoidable
    const imgRect = img.getBoundingClientRect();
    if (figureRect.width - imgRect.width > 256) {
      figure.classList.add("horizontal");
    } else {
      figure.classList.remove("horizontal");
    }

    function setStyles(img, width, height) {
      img.style.width = width;
      img.style.height = height;
    }
  }

  function unzoom() {
    const unzoomStartTime = Date.now();

    Array.prototype.slice
      .call(overlay.querySelectorAll("figure.zoomed"))
      .forEach(unzoomImage);

    background.style.opacity = 0;
    overlay.style.pointerEvents = "none";

    function unzoomImage(absoluteFigure) {
      if (!absoluteFigure.removing) {
        // Update the transform when scroll position changes, so that the
        // animated zoomed image converges towards the new position of the
        // in-page image.
        let updateScheduled = false;
        const onScroll = () => {
          if (!updateScheduled) {
            updateScheduled = true;
            requestAnimationFrame(() => {
              transform(absoluteFigure);

              const transitionTime =
                transformTransitionTime - (Date.now() - unzoomStartTime);
              absoluteFigure.style.transition = `transform ${
                transitionTime >= 20 ? transitionTime : 0
              }ms ease-out, opacity 0.3s ease ${
                transformTransitionTime - 50
              }ms`;
              updateScheduled = false;
            });
          }
        };
        document.addEventListener("scroll", onScroll);

        absoluteFigure.removing = true;
        absoluteFigure.addEventListener("transitionend", function (e) {
          if (e.target === absoluteFigure && e.propertyName === "opacity") {
            overlay.removeChild(absoluteFigure);
            document.removeEventListener("scroll", onScroll);
          }
        });
        absoluteFigure.style.transition = `transform ${transformTransitionTime}ms, 
        opacity ${transformTransitionTime}ms ease ${
          transformTransitionTime - 50
        }ms`;
        absoluteFigure.style.opacity = 0;
        transform(absoluteFigure);

        const caption = absoluteFigure.querySelector("figcaption");
        if (caption) {
          caption.style.transition = `opacity ${transformTransitionTime}ms`;
          caption.style.opacity = 0;
        }

        scrollWhenShown = undefined;
      }
    }
  }

  function transform(absoluteFigure) {
    const absoluteImg = firstVisibleImg(absoluteFigure);

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
