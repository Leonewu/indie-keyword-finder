// Three Mining-first interface variants on the existing preview route, switchable via ?variant=.

const variants = [
  { key: "A", name: "Centered Focus", render: VariantCenteredFocus },
  { key: "B", name: "Right Rail", render: VariantRightRail },
  { key: "C", name: "Result Notebook", render: VariantResultNotebook },
];

const results = [
  {
    keyword: "ai agent workflow",
    signal: "+148%",
    context: "连续 3 个时间窗口上升",
    bars: [18, 23, 31, 42, 55, 72],
  },
  {
    keyword: "browser automation ai",
    signal: "+93%",
    context: "相关查询快速增长",
    bars: [14, 17, 22, 28, 39, 56],
  },
  {
    keyword: "local ai assistant",
    signal: "+71%",
    context: "早期信号 · 建议验证",
    bars: [12, 14, 18, 26, 34, 48],
  },
  {
    keyword: "agent memory patterns",
    signal: "+48%",
    context: "新出现的相关查询",
    bars: [7, 9, 12, 15, 24, 37],
  },
];

function mark() {
  return `
    <svg class="brand-mark" viewBox="0 0 28 28" aria-hidden="true">
      <path d="M3 17c3.2 0 3.2-7 6.4-7s3.2 10 6.4 10 3.2-12 9.2-12"/>
    </svg>`;
}

function icon(name) {
  const paths = {
    mining: "M4 18 9 12l4 3 7-9m-4 0h4v4",
    library: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
    batch: "M5 6h14M5 12h14M5 18h9",
    settings:
      "M12 15.3a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6Zm7-3.3 2-1.4-2-3.4-2.3.9a7 7 0 0 0-1.7-1L14.6 4h-4.1l-.4 3.1a7 7 0 0 0-1.7 1L6.1 7.2l-2 3.4 2 1.4v2l-2 1.4 2 3.4 2.3-.9a7 7 0 0 0 1.7 1l.4 3.1h4.1l.4-3.1a7 7 0 0 0 1.7-1l2.3.9 2-3.4-2-1.4v-2Z",
    arrow: "m8 5 7 7-7 7",
    more: "M6 12h.01M12 12h.01M18 12h.01",
    star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z",
  };
  return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
}

function sparkline(bars) {
  return `
    <span class="sparkline" aria-label="上升信号示意">
      ${bars.map((height) => `<i style="height:${height}%"></i>`).join("")}
    </span>`;
}

function resultRows(className = "") {
  return results
    .map(
      (result, index) => `
        <article class="result-row ${className}">
          <span class="result-index">0${index + 1}</span>
          <div class="result-copy">
            <strong>${result.keyword}</strong>
            <small>${result.context}</small>
          </div>
          ${sparkline(result.bars)}
          <b class="result-signal">${result.signal}</b>
          <button type="button" class="result-action" aria-label="收藏 ${result.keyword}">${icon("star")}</button>
        </article>`,
    )
    .join("");
}

function brand() {
  return `<div class="wordmark">${mark()}<span>Indie Keyword Finder</span></div>`;
}

function seedComposer(label = "开始发现") {
  return `
    <div class="seed-composer">
      <div>
        <span>Seed keyword</span>
        <input value="ai agents" aria-label="种子关键词" />
      </div>
      <button type="button">${label}${icon("arrow")}</button>
    </div>`;
}

function modelChips() {
  return `
    <div class="model-chips">
      <button type="button"><span>地区</span><b>美国</b></button>
      <button type="button"><span>范围</span><b>过去 30 天</b></button>
      <button type="button"><span>信号阈值</span><b>20%</b></button>
    </div>`;
}

function topNavigation() {
  return `
    <nav class="top-navigation" aria-label="主要导航">
      <button class="is-active" type="button">${icon("mining")}<span>Mining</span></button>
      <button type="button">${icon("library")}<span>词库</span></button>
      <button type="button">${icon("batch")}<span>批量</span></button>
      <button type="button" aria-label="设置">${icon("settings")}</button>
    </nav>`;
}

function VariantCenteredFocus() {
  return `
    <section class="prototype-app variant-centered">
      <header class="centered-header">
        ${brand()}
        ${topNavigation()}
      </header>
      <main class="centered-main">
        <section class="centered-hero">
          <span class="prototype-kicker">Mining · Ready</span>
          <h1>从一个种子词，<br />发现正在上升的机会。</h1>
          <p>递归探索相关查询，用相对趋势信号筛出值得进一步验证的关键词。</p>
          ${seedComposer()}
          ${modelChips()}
        </section>
        <section class="centered-results">
          <header>
            <div><span>本轮发现</span><strong>4 个上升信号</strong></div>
            <small>34 related · depth 03</small>
          </header>
          <div class="result-list">${resultRows()}</div>
        </section>
      </main>
    </section>`;
}

function VariantRightRail() {
  return `
    <section class="prototype-app variant-rail">
      <main class="rail-main">
        <header class="rail-heading">
          <span class="prototype-kicker">Mining session / 07</span>
          <button type="button" class="quiet-icon" aria-label="更多">${icon("more")}</button>
        </header>
        <h1>发现正在上升的<br />关键词信号。</h1>
        ${seedComposer("挖掘")}
        <div class="rail-status">
          <span><i></i> 分析完成</span>
          <b>34</b><small>相关查询</small>
          <b>04</b><small>上升信号</small>
          <b>03</b><small>递归深度</small>
        </div>
        <section class="rail-results">
          <header><strong>值得验证</strong><span>按相对增幅排序</span></header>
          <div class="result-list">${resultRows("result-row--compact")}</div>
        </section>
      </main>
      <aside class="right-rail">
        <div class="rail-brand">${mark()}<span>IKF</span></div>
        <nav aria-label="主要导航">
          <button class="is-active" type="button" data-label="Mining">${icon("mining")}</button>
          <button type="button" data-label="词库">${icon("library")}</button>
          <button type="button" data-label="批量">${icon("batch")}</button>
          <button type="button" data-label="设置">${icon("settings")}</button>
        </nav>
        <span class="rail-version">v0.1</span>
      </aside>
    </section>`;
}

function VariantResultNotebook() {
  const featured = results[0];
  return `
    <section class="prototype-app variant-notebook">
      <header class="notebook-header">
        ${brand()}
        <button type="button" class="session-chip"><i></i> 本地研究台</button>
      </header>
      <main class="notebook-main">
        <section class="notebook-title">
          <span class="prototype-kicker">Mining result · ai agents</span>
          <h1>4 个信号值得继续验证</h1>
          <p>过去 30 天 · 美国 · 对比词 gpts · 阈值 20%</p>
        </section>
        <article class="featured-result">
          <div>
            <span>Strongest signal</span>
            <h2>${featured.keyword}</h2>
            <p>${featured.context}</p>
          </div>
          <strong>${featured.signal}</strong>
          <div class="featured-chart">
            ${featured.bars.map((height) => `<i style="height:${height}%"></i>`).join("")}
          </div>
        </article>
        <section class="notebook-list">
          <header><strong>其他候选</strong><button type="button">复制全部</button></header>
          ${resultRows("result-row--notebook")}
        </section>
      </main>
      <footer class="notebook-dock">
        ${seedComposer("重新 Mining")}
        <nav aria-label="次要导航">
          <button type="button">${icon("library")}<span>词库</span></button>
          <button type="button">${icon("batch")}<span>批量</span></button>
          <button type="button">${icon("settings")}<span>设置</span></button>
        </nav>
      </footer>
    </section>`;
}

function activeVariantIndex() {
  const key = new URLSearchParams(window.location.search).get("variant")?.toUpperCase();
  const index = variants.findIndex((variant) => variant.key === key);
  return index < 0 ? 0 : index;
}

function render() {
  const variant = variants[activeVariantIndex()];
  document.querySelector("#app").innerHTML = variant.render();
  document.querySelector("#prototype-variant-label").textContent =
    `${variant.key} — ${variant.name}`;
  document.title = `PROTOTYPE — ${variant.name}`;
}

function switchVariant(offset) {
  const next =
    variants[(activeVariantIndex() + offset + variants.length) % variants.length];
  const url = new URL(window.location.href);
  url.searchParams.set("prototype", "interface");
  url.searchParams.set("variant", next.key);
  window.history.replaceState({}, "", url);
  render();
}

const switcher = document.createElement("nav");
switcher.className = "interface-switcher";
switcher.setAttribute("aria-label", "界面原型切换");
switcher.innerHTML = `
  <button type="button" data-prototype-previous aria-label="上一个方向">←</button>
  <span id="prototype-variant-label"></span>
  <button type="button" data-prototype-next aria-label="下一个方向">→</button>`;
document.body.append(switcher);

switcher
  .querySelector("[data-prototype-previous]")
  .addEventListener("click", () => switchVariant(-1));
switcher
  .querySelector("[data-prototype-next]")
  .addEventListener("click", () => switchVariant(1));

window.addEventListener("keydown", (event) => {
  const target = event.target;
  const editing =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target?.isContentEditable;
  if (editing) return;
  if (event.key === "ArrowLeft") switchVariant(-1);
  if (event.key === "ArrowRight") switchVariant(1);
});

render();
