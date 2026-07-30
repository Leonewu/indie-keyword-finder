(() => {
  const TOOLBAR_CLASS = "indie-keyword-finder-inline-tools";
  const ICONS = {
    copy: "M8 7V3h13v13h-4v5H3V7h5Zm2 0h7v7h2V5h-9v2Zm5 2H5v10h10V9Z",
    favorite:
      "m12 3 2.78 5.63 6.22.91-4.5 4.38 1.06 6.18L12 17.68 6.44 20.6l1.06-6.18L3 10.04l6.22-.91L12 3Z",
    search:
      "M10.5 4a6.5 6.5 0 1 0 3.98 11.64L20.84 22 22 20.84l-6.36-6.36A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z",
    difficulty: "M4 20V10h3v10H4Zm6 0V4h3v16h-3Zm6 0v-7h3v7h-3Z",
    domain:
      "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.92 6h-3.1a15.8 15.8 0 0 0-1.45-3.38A8.04 8.04 0 0 1 18.92 8ZM12 4c.83 1.01 1.5 2.36 1.83 4h-3.66C10.5 6.36 11.17 5.01 12 4ZM9.63 4.62A15.8 15.8 0 0 0 8.18 8h-3.1a8.04 8.04 0 0 1 4.55-3.38ZM4 12c0-.69.09-1.36.25-2h3.62a17.3 17.3 0 0 0 0 4H4.25A8.1 8.1 0 0 1 4 12Zm1.08 4h3.1c.3 1.24.79 2.39 1.45 3.38A8.04 8.04 0 0 1 5.08 16ZM12 20c-.83-1.01-1.5-2.36-1.83-4h3.66c-.33 1.64-1 2.99-1.83 4Zm2.17-6H9.83a15.2 15.2 0 0 1 0-4h4.34a15.2 15.2 0 0 1 0 4Zm.2 5.38A15.8 15.8 0 0 0 15.82 16h3.1a8.04 8.04 0 0 1-4.55 3.38ZM16.13 14a17.3 17.3 0 0 0 0-4h3.62a8.1 8.1 0 0 1 0 4h-3.62Z",
    trends:
      "M4 18a2 2 0 1 1 1.73-3l3.33-3.33a2 2 0 0 1 2.88 0l1.12 1.12 3.22-3.22A2 2 0 1 1 17.7 11l-3.22 3.22a2 2 0 0 1-2.88 0l-1.12-1.12-3.33 3.33A2 2 0 0 1 4 18Z",
    check: "m5 12 4 4L19 6",
  };

  const style = document.createElement("style");
  style.textContent = `
    .${TOOLBAR_CLASS} {
      align-items: center;
      background: rgba(248, 250, 255, .96);
      border: 1px solid rgba(28, 70, 133, .16);
      border-radius: 999px;
      box-shadow: 0 4px 18px rgba(36, 62, 99, .14);
      display: none;
      gap: 2px;
      padding: 2px;
      position: absolute;
      right: 8%;
      bottom: 2px;
      z-index: 30;
    }
    .search-term-wrapper:hover > .${TOOLBAR_CLASS},
    .progress-label-wrapper:hover > .${TOOLBAR_CLASS} { display: flex; }
    .${TOOLBAR_CLASS} button {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 50%;
      color: #31527d;
      cursor: pointer;
      display: inline-flex;
      height: 24px;
      justify-content: center;
      padding: 4px;
      width: 24px;
    }
    .${TOOLBAR_CLASS} button:hover {
      background: #e5eeff;
      color: #175ee8;
    }
    .${TOOLBAR_CLASS} svg { height: 14px; width: 14px; }
  `;
  document.documentElement.appendChild(style);

  const icon = (name) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", ICONS[name]);
    path.setAttribute("fill", name === "check" ? "none" : "currentColor");
    path.setAttribute("stroke", name === "check" ? "currentColor" : "none");
    path.setAttribute("stroke-width", "2");
    svg.appendChild(path);
    return svg;
  };

  const flashSuccess = (button, originalIcon) => {
    button.replaceChildren(icon("check"));
    button.style.color = "#14804a";
    setTimeout(() => {
      button.replaceChildren(icon(originalIcon));
      button.style.color = "";
    }, 900);
  };

  const button = (name, title, handler) => {
    const element = document.createElement("button");
    element.type = "button";
    element.title = title;
    element.setAttribute("aria-label", title);
    element.appendChild(icon(name));
    element.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        await handler(element);
      } catch (error) {
        console.warn(`[Indie Keyword Finder] ${title} failed`, error);
      }
    });
    return element;
  };

  const getSettings = async () => {
    const result = await chrome.storage.local.get("settings");
    return {
      country: "Global",
      timeRange: "Past 30 Days",
      comparisonKeyword: "empty",
      ...(result.settings ?? {}),
    };
  };

  const trendsUrl = async (keyword) => {
    const settings = await getSettings();
    const terms = settings.comparisonKeyword === "empty"
      ? [keyword]
      : [settings.comparisonKeyword, keyword];
    const response = await chrome.runtime.sendMessage({
      type: "BUILD_TRENDS_URL",
      keywords: terms,
      settings,
    });
    if (!response?.ok) {
      throw new Error(response?.error ?? "Unable to build a Trends URL.");
    }
    return response.url;
  };

  const searchToolbar = (readKeyword) => {
    const toolbar = document.createElement("div");
    toolbar.className = TOOLBAR_CLASS;
    toolbar.append(
      button("copy", "Copy keyword", async (element) => {
        await navigator.clipboard.writeText(readKeyword());
        flashSuccess(element, "copy");
      }),
      button("favorite", "Add to Indie Keyword Finder favorites", async (element) => {
        const keyword = readKeyword();
        if (!keyword) return;
        const result = await chrome.storage.local.get("commonKeywords");
        const favorites = Array.isArray(result.commonKeywords)
          ? result.commonKeywords
          : [];
        const updated = [
          keyword,
          ...favorites.filter(
            (item) =>
              String(item).toLocaleLowerCase() !== keyword.toLocaleLowerCase(),
          ),
        ];
        await chrome.storage.local.set({ commonKeywords: updated });
        chrome.runtime.sendMessage({
          type: "ADD_KEYWORD",
          library: "common",
          keyword,
        }).catch(() => {});
        flashSuccess(element, "favorite");
      }),
      button("search", "Search on Google", () => {
        window.open(
          `https://www.google.com/search?q=${encodeURIComponent(readKeyword())}`,
          "_blank",
        );
      }),
      button("difficulty", "Check keyword difficulty", () => {
        window.open(
          `https://ahrefs.com/keyword-difficulty/?country=us&input=${encodeURIComponent(readKeyword())}`,
          "_blank",
        );
      }),
      button("domain", "Search for a domain", () => {
        window.open(
          `https://namebeta.com/search/${encodeURIComponent(readKeyword())}`,
          "_blank",
        );
      }),
    );
    return toolbar;
  };

  const progressToolbar = (readKeyword) => {
    const toolbar = document.createElement("div");
    toolbar.className = TOOLBAR_CLASS;
    toolbar.style.left = "58%";
    toolbar.style.right = "auto";
    toolbar.style.bottom = "auto";
    toolbar.style.top = "28%";
    toolbar.append(
      button("copy", "Copy keyword", async (element) => {
        await navigator.clipboard.writeText(readKeyword());
        flashSuccess(element, "copy");
      }),
      button("trends", "Compare in Google Trends", async () => {
        window.open(await trendsUrl(readKeyword()), "_blank");
      }),
    );
    return toolbar;
  };

  const enhancePage = () => {
    document.querySelectorAll(".search-term-wrapper").forEach((wrapper) => {
      if (wrapper.querySelector(`:scope > .${TOOLBAR_CLASS}`)) return;
      const input = wrapper.querySelector("input");
      if (!input) return;
      wrapper.style.position = "relative";
      wrapper.appendChild(searchToolbar(() => input.value.trim()));
    });

    document.querySelectorAll(".progress-label-wrapper").forEach((wrapper) => {
      if (wrapper.querySelector(`:scope > .${TOOLBAR_CLASS}`)) return;
      const label = wrapper.querySelector(".label-text");
      if (!label) return;
      wrapper.style.position = "relative";
      wrapper.appendChild(
        progressToolbar(() => (label.textContent ?? "").trim()),
      );
    });
  };

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enhancePage();
    });
  });

  enhancePage();
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
