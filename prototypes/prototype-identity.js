const variants = [
  {
    key: "A",
    name: "Indie Keyword Finder",
    tagline: "从一个种子词，发现正在上升的搜索机会。",
    thesis: "Keyword Finder 承担 SEO 搜索语言，Indie 提供区分度并指向独立站与独立创作者。",
    vocabulary: "indie · keyword · discover",
    risk: "保持聚焦于早期搜索机会发现，不扩张成全能 SEO 套件。",
    render: VariantA,
  },
  {
    key: "B",
    name: "Uptrace",
    tagline: "追踪查询上升的最早迹象。",
    thesis: "强调追踪、证据和进程，工具感更强，适合偏数据与 SEO 的用户。",
    vocabulary: "trace · rise · qualify",
    risk: "专业度最高，但名称偏技术，需要文案保持亲和。",
    render: VariantB,
  },
  {
    key: "C",
    name: "Queryloom",
    tagline: "从一个词，织出一张机会网络。",
    thesis: "把递归 Mining 表达成关系网络，最能体现产品原理，也最有独立记忆点。",
    vocabulary: "query · weave · branch",
    risk: "品牌感强，但初次看到名称时需要一句解释。",
    render: VariantC,
  },
  {
    key: "D",
    name: "Riselens",
    tagline: "放大正在上升、值得验证的搜索信号。",
    thesis: "把产品定位成研究镜头，克制、可信，最适合强调“发现之后仍需验证”。",
    vocabulary: "lens · signal · validate",
    risk: "研究气质稳定，但递归扩展的特征不如 Queryloom 鲜明。",
    render: VariantD,
  },
];

const results = [
  ["ai agent workflow", "+148%"],
  ["local ai assistant", "+92%"],
  ["agent memory patterns", "+64%"],
  ["browser automation ai", "+41%"],
];

function logo(kind) {
  if (kind === "wave") {
    return `
      <svg class="wave-mark" viewBox="0 0 28 28" aria-hidden="true">
        <path d="M3 17c3.2 0 3.2-7 6.4-7s3.2 10 6.4 10 3.2-12 9.2-12"/>
      </svg>`;
  }
  if (kind === "trace") {
    return `
      <svg class="trace-mark" viewBox="0 0 28 28" aria-hidden="true">
        <circle cx="6" cy="19" r="2.5"/><circle cx="14" cy="14" r="2.5"/><circle cx="22" cy="7" r="2.5"/>
        <path d="m8 18 4-2.5m4-3 4-3.5"/>
      </svg>`;
  }
  if (kind === "loom") {
    return `
      <svg class="loom-mark" viewBox="0 0 28 28" aria-hidden="true">
        <line x1="7" y1="8" x2="21" y2="8"/><line x1="7" y1="20" x2="21" y2="20"/>
        <line x1="8" y1="7" x2="8" y2="21"/><line x1="20" y1="7" x2="20" y2="21"/>
        <circle cx="14" cy="14" r="3"/>
      </svg>`;
  }
  return `
    <svg class="lens-mark" viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="12" cy="12" r="7"/><path d="m17 17 7 7"/>
    </svg>`;
}

function topbar(name, mark) {
  return `
    <header class="app-topbar">
      <div class="app-wordmark">${logo(mark)}<span>${name}</span></div>
      <button class="icon-button" type="button" aria-label="更多选项">•••</button>
    </header>`;
}

function resultRows(mode = "plain") {
  return results
    .map(([name, signal], index) => {
      if (mode === "ranked") {
        return `
          <li>
            <span class="rank">0${index + 1}</span>
            <div><div class="result-title">${name}</div><div class="result-meta">值得进一步验证</div></div>
            <span class="signal">${signal}</span>
          </li>`;
      }
      if (mode === "chart") {
        const bars = [8 + index * 2, 12 + index * 2, 15 + index * 2, 19 + index];
        return `
          <li>
            <div><div class="result-title">${name}</div><div class="result-meta">${signal} · 相对信号</div></div>
            <div class="mini-chart" aria-label="上升趋势示意">
              ${bars.map((height) => `<i style="height:${height}px"></i>`).join("")}
            </div>
          </li>`;
      }
      return `
        <li>
          <div><div class="result-title">${name}</div><div class="result-meta">搜索机会 · 待验证</div></div>
          <span class="signal">${signal}</span>
        </li>`;
    })
    .join("");
}

function VariantA() {
  return `
    <div class="app-shell variant-a">
      ${topbar("Indie Keyword Finder", "wave")}
      <section class="hero">
        <span class="eyebrow">Mining / Discover</span>
        <h2>从一个词，找到下一波信号。</h2>
        <p>沿着相关查询向外探索，尽早发现正在上升、值得验证的搜索机会。</p>
        <form class="seed-form">
          <input value="ai agents" aria-label="种子词" />
          <button type="button">开始发现</button>
        </form>
        <div class="progress-note"><i></i><span>已扩展 3 层 · 发现 24 个候选</span></div>
      </section>
      <section class="results">
        <div class="results-header"><strong>正在上升</strong><span class="eyebrow">4 signals</span></div>
        <ul class="result-list">${resultRows()}</ul>
      </section>
    </div>`;
}

function VariantB() {
  return `
    <div class="app-shell variant-b">
      ${topbar("Uptrace", "trace")}
      <div class="trace-workspace">
        <aside class="trace-rail"><strong>↑</strong><span>RELATIVE SIGNAL</span><span>03 / 04</span></aside>
        <section class="trace-main">
          <span class="eyebrow">New mining trace</span>
          <h2>追踪一个查询开始上升的时刻。</h2>
          <form class="seed-form">
            <input value="ai agents" aria-label="种子词" />
            <button type="button" aria-label="开始追踪">↗</button>
          </form>
          <div class="trace-status">
            <div><strong>03</strong><span>Depth</span></div>
            <div><strong>42</strong><span>Scanned</span></div>
            <div><strong>04</strong><span>Signals</span></div>
          </div>
          <ul class="result-list">${resultRows("ranked")}</ul>
        </section>
      </div>
    </div>`;
}

function VariantC() {
  return `
    <div class="app-shell variant-c">
      ${topbar("Queryloom", "loom")}
      <section class="map-area">
        <h2>从种子词，织出机会网络。</h2>
        <i class="map-line map-line--one"></i>
        <i class="map-line map-line--two"></i>
        <i class="map-line map-line--three"></i>
        <span class="node node--seed">ai agents</span>
        <span class="node node--one">agent workflow</span>
        <span class="node node--two">browser agents</span>
        <span class="node node--three">local assistant</span>
        <form class="seed-form">
          <input value="继续扩展当前种子…" aria-label="种子词" />
          <button type="button">向外探索</button>
        </form>
      </section>
      <section class="loom-results">
        <header><h3>值得验证的分支</h3><span class="eyebrow">Level 03</span></header>
        <ul class="result-list">${resultRows()}</ul>
      </section>
    </div>`;
}

function VariantD() {
  return `
    <div class="app-shell variant-d">
      ${topbar("Riselens", "lens")}
      <section class="editorial-intro">
        <span class="eyebrow">Search signal review</span>
        <h2>放大正在上升的搜索信号。</h2>
        <p>发现只是开始。把相对信号带进下一步内容与需求验证。</p>
      </section>
      <form class="seed-form">
        <input value="ai agents" aria-label="种子词" />
        <button type="button">开始 Mining →</button>
      </form>
      <section>
        <div class="review-heading"><h3>本轮发现</h3><span>2026 / 07 / 30</span></div>
        <ul class="result-list">${resultRows("chart")}</ul>
      </section>
    </div>`;
}

function currentIndex() {
  const requested = new URLSearchParams(window.location.search).get("variant")?.toUpperCase();
  const index = variants.findIndex((variant) => variant.key === requested);
  return index === -1 ? 0 : index;
}

function render() {
  const index = currentIndex();
  const variant = variants[index];
  document.documentElement.style.setProperty("--accent", getAccent(variant.key));
  document.querySelector("#prototype-root").innerHTML = variant.render();
  document.querySelector("#variant-label").textContent = `${variant.key} — ${variant.name}`;
  document.querySelector("#identity-notes").innerHTML = `
    <p class="identity-notes__index">Direction ${variant.key} / 04</p>
    <h1>${variant.name}</h1>
    <p class="identity-notes__tagline">${variant.tagline}</p>
    <dl>
      <div><dt>方向</dt><dd>${variant.thesis}</dd></div>
      <div><dt>词汇</dt><dd>${variant.vocabulary}</dd></div>
      <div><dt>风险</dt><dd>${variant.risk}</dd></div>
    </dl>
    <p class="identity-notes__caveat">原型候选，仅用于选择语义与气质。Chrome 商店、GitHub、域名和商标可用性尚未检查。</p>`;
  document.title = `PROTOTYPE — ${variant.name}`;
}

function getAccent(key) {
  return {
    A: "#4a82d8",
    B: "#2f66c5",
    C: "#527cc5",
    D: "#3974c9",
  }[key];
}

function switchBy(offset) {
  const index = currentIndex();
  const next = variants[(index + offset + variants.length) % variants.length];
  const url = new URL(window.location.href);
  url.searchParams.set("variant", next.key);
  window.history.replaceState({}, "", url);
  render();
}

document.querySelector("#previous-variant").addEventListener("click", () => switchBy(-1));
document.querySelector("#next-variant").addEventListener("click", () => switchBy(1));

window.addEventListener("keydown", (event) => {
  const target = event.target;
  const editing =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target?.isContentEditable;
  if (editing) return;
  if (event.key === "ArrowLeft") switchBy(-1);
  if (event.key === "ArrowRight") switchBy(1);
});

render();
