(() => {
  "use strict";

  /* ---------- hulpjes ---------- */
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const euro = (n) => n.toLocaleString("nl-NL", { style: "currency", currency: "EUR" });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem("stoep:" + key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("stoep:" + key, JSON.stringify(value)); } catch (e) { /* opslag niet beschikbaar */ }
    },
  };

  const BY_ID = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  const CAT_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
  const FREE_SHIPPING = 50;
  const SHIPPING = { standaard: 4.95, avond: 6.95, afhaal: 0 };
  const MAX_PRICE = Math.ceil(Math.max(...PRODUCTS.map((p) => p.price)) / 10) * 10;

  const SIZE_SETS = {
    kleding: ["XS", "S", "M", "L", "XL", "XXL"],
    sneakers: ["39", "40", "41", "42", "43", "44", "45", "46"],
    one: ["One size"],
  };
  const SIZE_ORDER = [...SIZE_SETS.kleding, ...SIZE_SETS.sneakers, ...SIZE_SETS.one];
  const sizesOf = (p) => (p.cat === "sneakers" ? SIZE_SETS.sneakers : p.cat === "accessoires" ? SIZE_SETS.one : SIZE_SETS.kleding);

  function hash(str) {
    let h = 2166136261;
    for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function stockOf(p, size) {
    const n = hash(p.id + size) % 9;
    if (sizesOf(p).length === 1) return 4 + (n % 5);
    return n < 2 ? 0 : n - 1;
  }

  /* ---------- staat ---------- */
  const state = {
    cart: store.get("cart", []),
    wish: store.get("wish", []),
    reminder: store.get("reminder", false),
    lastOrder: store.get("lastOrder", null),
    query: "",
    shopKey: null,
    filters: emptyFilters(),
    sort: "populair",
    pdp: null,
  };
  function emptyFilters() { return { brands: [], sizes: [], colors: [], max: MAX_PRICE, sale: false }; }
  const saveCart = () => { store.set("cart", state.cart); updateCounters(); };

  /* ---------- weergavestukjes ---------- */
  const ICON_HEART = '<svg aria-hidden="true" viewBox="0 0 24 24" class="ico"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z"/></svg>';
  const ICON_TRUCK = '<svg aria-hidden="true" viewBox="0 0 24 24" class="ico"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>';
  const ICON_RETURN = '<svg aria-hidden="true" viewBox="0 0 24 24" class="ico"><path d="M9 7 4 12l5 5"/><path d="M4 12h11a5 5 0 0 1 0 10h-3"/></svg>';
  const ICON_CARD = '<svg aria-hidden="true" viewBox="0 0 24 24" class="ico"><rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M3 10h18"/></svg>';

  const flatFor = (p, colorKey, withLabel) =>
    flatSVG(p.flat, COLORS[colorKey].hex, p.opts || {}, withLabel ? `${p.name} van ${p.brand} in ${COLORS[colorKey].name.toLowerCase()}` : "");

  function priceHTML(p) {
    return p.was
      ? `<span class="prijs sale"><span class="sr">Nu </span><span class="nu">${euro(p.price)}</span><span class="sr">, was </span><span class="oud">${euro(p.was)}</span></span>`
      : `<span class="prijs">${euro(p.price)}</span>`;
  }
  const discount = (p) => Math.round((1 - p.price / p.was) * 100);
  const inWish = (id) => state.wish.includes(id);

  function cardHTML(p) {
    const badge = p.was ? `<span class="label korting">-${discount(p)}%</span>` : p.isNew ? `<span class="label">Nieuw</span>` : "";
    return `
      <article class="kaart">
        <a class="kaart-link" href="#p-${p.id}">
          <div class="studio">${flatFor(p, p.colors[0], true)}</div>
          <div class="kaart-tekst">
            <span class="merk">${p.brand}</span>
            <h3 class="naam">${p.name}</h3>
            ${priceHTML(p)}
            <span class="kleuren" aria-label="${p.colors.length} ${p.colors.length === 1 ? "kleur" : "kleuren"}">${p.colors.map((c) => `<i style="--c:${COLORS[c].hex}"></i>`).join("")}</span>
          </div>
        </a>
        ${badge}
        <button class="hart" type="button" data-wish="${p.id}" aria-pressed="${inWish(p.id)}" aria-label="${p.name} van ${p.brand} bewaren in favorieten">${ICON_HEART}</button>
      </article>`;
  }

  /* ---------- drop-aftelklok ---------- */
  function nextDrop() {
    const now = new Date();
    const t = new Date(now);
    t.setHours(18, 0, 0, 0);
    t.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7));
    if (t <= now) t.setDate(t.getDate() + 7);
    return t;
  }
  function countdownHTML() {
    let s = Math.max(0, Math.floor((nextDrop() - new Date()) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    const p2 = (n) => String(n).padStart(2, "0");
    return `<span><b>${d}</b>${d === 1 ? "dag" : "dagen"}</span><span><b>${p2(h)}</b>uur</span><span><b>${p2(m)}</b>min</span><span><b>${p2(s)}</b>sec</span>`;
  }
  setInterval(() => { const el = $("#aftel"); if (el) el.innerHTML = countdownHTML(); }, 1000);

  function deliveryDay() {
    const now = new Date();
    const t = new Date(now);
    t.setDate(now.getDate() + (now.getHours() < 22 ? 1 : 2));
    if (t.getDay() === 0) t.setDate(t.getDate() + 1);
    return t.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  }

  /* ---------- pagina's ---------- */
  const main = $("#main");

  function renderHome() {
    const nieuw = PRODUCTS.filter((p) => p.isNew).slice(0, 4);
    const sale = PRODUCTS.filter((p) => p.was).slice(0, 4);
    const brandStyles = [[62, 900], [125, 800], [75, 600], [112.5, 900], [87.5, 700], [100, 400], [62, 800], [125, 700]];
    const remind = state.reminder;
    return `
      <section class="muur" aria-labelledby="drop-titel">
        <div class="wrap muur-binnen">
          <div class="poster-oud" aria-hidden="true"><span>STOEP</span></div>
          <div class="poster-plek">
            <span class="tape links" aria-hidden="true"></span>
            <div class="poster">
              <div>
                <p class="poster-label">Volgende drop, vrijdag 18:00</p>
                <h1 class="poster-titel" id="drop-titel">Kade ×<br>Asfalt<br>Club</h1>
                <p class="poster-tekst">${DROP.text}</p>
                <div class="aftel" id="aftel" aria-hidden="true">${countdownHTML()}</div>
                <div class="poster-knoppen">
                  <button class="knop" type="button" id="herinner" aria-pressed="${remind}">${remind ? "Herinnering staat aan" : "Zet herinnering"}</button>
                  <a class="knop leeg" href="#drop">Bekijk de merken</a>
                </div>
              </div>
              <div class="poster-flat">${flatSVG("hoodie", COLORS.ecru.hex, { print: "K×AC" }, "Hoodie uit de Kade × Asfalt Club capsule")}</div>
            </div>
            <span class="tape rechts" aria-hidden="true"></span>
            <span class="sticker" aria-hidden="true">Max. 1 per maat</span>
          </div>
        </div>
      </section>

      <section class="sectie">
        <div class="wrap">
          <div class="sectie-kop"><h2 class="sectie-titel">Net binnen</h2><a class="sectie-link" href="#nieuw">Alles wat nieuw is</a></div>
          <div class="raster vier">${nieuw.map(cardHTML).join("")}</div>
        </div>
      </section>

      <section class="sectie">
        <div class="wrap">
          <div class="sectie-kop"><h2 class="sectie-titel">Shop per categorie</h2></div>
          <div class="cat-raster">
            ${CATEGORIES.map((c) => `
              <a class="cat-tegel" href="#shop-${c.id}">
                <div class="studio">${flatSVG(c.flat, COLORS[c.color].hex, c.opts || {})}</div>
                <span>${c.name}</span>
              </a>`).join("")}
          </div>
        </div>
      </section>

      <section class="sectie">
        <div class="wrap">
          <div class="sectie-kop"><h2 class="sectie-titel">Merken</h2></div>
          <ul class="merken">
            ${BRANDS.map((b, i) => `<li><a href="#merk-${slug(b)}" style="font-stretch:${brandStyles[i][0]}%;font-weight:${brandStyles[i][1]}">${b}</a></li>`).join("")}
          </ul>
        </div>
      </section>

      <section class="sectie">
        <div class="wrap">
          <div class="sectie-kop"><h2 class="sectie-titel">Sale</h2><a class="sectie-link" href="#sale">Alles in de sale</a></div>
          <div class="raster vier">${sale.map(cardHTML).join("")}</div>
        </div>
      </section>

      <section class="sectie">
        <div class="wrap service">
          <div><h3>Morgen in huis</h3><p>Bestel je voor 22:00, dan bezorgen we ${deliveryDay()}.</p></div>
          <div><h3>30 dagen retour</h3><p>Past het niet? Stuur het gratis terug via een PostNL- of DHL-punt.</p></div>
          <div><h3>Betaal zoals je wil</h3><p>iDEAL, creditcard of achteraf betalen binnen 30 dagen.</p></div>
        </div>
      </section>`;
  }

  /* ----- shop / overzicht ----- */
  function shopContext(key) {
    if (key === "shop") return { key, title: "Alles", list: PRODUCTS };
    if (key === "nieuw") return { key, title: "Nieuw binnen", list: PRODUCTS.filter((p) => p.isNew) };
    if (key === "sale") return { key, title: "Sale", list: PRODUCTS.filter((p) => p.was) };
    if (key === "drop") return { key, title: DROP.title, list: PRODUCTS.filter((p) => DROP.brands.includes(p.brand)), intro: "De capsule komt vrijdag om 18:00 online. Dit zijn de vaste collecties van beide merken." };
    if (key === "zoeken") {
      const q = state.query.trim().toLowerCase();
      const list = q ? PRODUCTS.filter((p) => searchText(p).includes(q)) : PRODUCTS;
      return { key: key + ":" + q, title: q ? "Zoeken" : "Alles", searched: state.query.trim(), list };
    }
    if (key.startsWith("shop-") && CAT_BY_ID[key.slice(5)]) {
      const c = CAT_BY_ID[key.slice(5)];
      return { key, title: c.name, cat: c, list: PRODUCTS.filter((p) => p.cat === c.id) };
    }
    if (key.startsWith("merk-")) {
      const b = BRANDS.find((x) => slug(x) === key.slice(5));
      if (b) return { key, title: b, brand: b, list: PRODUCTS.filter((p) => p.brand === b) };
    }
    return null;
  }
  function searchText(p) {
    return [p.name, p.brand, CAT_BY_ID[p.cat].name, p.fit, ...p.colors.map((c) => COLORS[c].name)].join(" ").toLowerCase();
  }

  function applyFilters(list) {
    const f = state.filters;
    let out = list.filter((p) =>
      (!f.brands.length || f.brands.includes(p.brand)) &&
      (!f.sizes.length || sizesOf(p).some((s) => f.sizes.includes(s) && stockOf(p, s) > 0)) &&
      (!f.colors.length || p.colors.some((c) => f.colors.includes(c))) &&
      p.price <= f.max &&
      (!f.sale || p.was));
    const order = PRODUCTS.indexOf.bind(PRODUCTS);
    const sorters = {
      populair: (a, b) => order(a) - order(b),
      nieuw: (a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || order(a) - order(b),
      laag: (a, b) => a.price - b.price,
      hoog: (a, b) => b.price - a.price,
    };
    return out.sort(sorters[state.sort]);
  }
  const activeFilterCount = () => {
    const f = state.filters;
    return f.brands.length + f.sizes.length + f.colors.length + (f.max < MAX_PRICE ? 1 : 0) + (f.sale ? 1 : 0);
  };

  function renderShop(ctx) {
    if (state.shopKey !== ctx.key) { state.filters = emptyFilters(); state.shopKey = ctx.key; }
    const f = state.filters;
    const brands = BRANDS.filter((b) => ctx.list.some((p) => p.brand === b));
    const sizes = SIZE_ORDER.filter((s) => ctx.list.some((p) => sizesOf(p).includes(s)));
    const colors = Object.keys(COLORS).filter((c) => ctx.list.some((p) => p.colors.includes(c)));
    const wide = matchMedia("(min-width: 901px)").matches;
    const crumb = ctx.cat || ctx.brand
      ? `<p class="kruimel"><a href="#home">Home</a> / <a href="#shop">Alles</a> / ${ctx.title}</p>`
      : `<p class="kruimel"><a href="#home">Home</a> / ${ctx.title}</p>`;
    const showBrandFilter = !ctx.brand && brands.length > 1;

    return `
      <div class="wrap">
        <div class="shop-kop">
          ${crumb}
          <h1 class="shop-titel">${ctx.searched ? `“${esc(ctx.searched)}”` : esc(ctx.title)}</h1>
          ${ctx.intro ? `<p class="pdp-tekst" style="margin-top:12px">${ctx.intro}</p>` : ""}
        </div>
        <div class="shop">
          <details class="filterpaneel" ${wide ? "open" : ""}>
            <summary>Filters <span id="filter-aantal">${activeFilterCount() ? `(${activeFilterCount()})` : ""}</span></summary>
            <div class="filter-inhoud">
              ${showBrandFilter ? `<fieldset><legend>Merk</legend>
                ${brands.map((b) => `<label class="check"><input type="checkbox" data-f="brand" value="${b}" ${f.brands.includes(b) ? "checked" : ""}> ${b}</label>`).join("")}
              </fieldset>` : ""}
              ${sizes.length > 1 ? `<fieldset><legend>Maat op voorraad</legend><div class="maten klein">
                ${sizes.map((s) => `<button type="button" class="maat" data-fsize="${s}" aria-pressed="${f.sizes.includes(s)}">${s}</button>`).join("")}
              </div></fieldset>` : ""}
              <fieldset><legend>Kleur</legend><div class="swatches">
                ${colors.map((c) => `<button type="button" class="swatch" data-fcolor="${c}" aria-pressed="${f.colors.includes(c)}" aria-label="${COLORS[c].name}" title="${COLORS[c].name}" style="--c:${COLORS[c].hex}"></button>`).join("")}
              </div></fieldset>
              <fieldset><legend><label for="f-prijs">Maximale prijs</label></legend>
                <input type="range" id="f-prijs" min="20" max="${MAX_PRICE}" step="5" value="${f.max}">
                <output class="prijs-uit" for="f-prijs" id="prijs-uit">${f.max >= MAX_PRICE ? "Geen maximum" : "Tot " + euro(f.max)}</output>
              </fieldset>
              <div class="filter-onder">
                <label class="check"><input type="checkbox" id="f-sale" ${f.sale ? "checked" : ""}> Alleen sale</label>
                <button type="button" class="tekstknop" data-wis>Wis filters</button>
              </div>
            </div>
          </details>
          <div>
            <div class="balk">
              <p class="aantal" id="aantal" aria-live="polite"></p>
              <div class="sorteer">
                <label for="sorteer">Sorteer op</label>
                <select id="sorteer">
                  <option value="populair" ${state.sort === "populair" ? "selected" : ""}>Populair</option>
                  <option value="nieuw" ${state.sort === "nieuw" ? "selected" : ""}>Nieuwste eerst</option>
                  <option value="laag" ${state.sort === "laag" ? "selected" : ""}>Prijs laag naar hoog</option>
                  <option value="hoog" ${state.sort === "hoog" ? "selected" : ""}>Prijs hoog naar laag</option>
                </select>
              </div>
            </div>
            <div id="resultaten"></div>
          </div>
        </div>
      </div>`;
  }

  function updateResults() {
    const ctx = shopContext(currentRoute());
    const box = $("#resultaten");
    if (!ctx || !box) return;
    const list = applyFilters(ctx.list);
    $("#aantal").textContent = `${list.length} ${list.length === 1 ? "artikel" : "artikelen"}`;
    const n = activeFilterCount();
    $("#filter-aantal").textContent = n ? `(${n})` : "";
    if (list.length) {
      box.innerHTML = `<div class="raster">${list.map(cardHTML).join("")}</div>`;
    } else if (ctx.searched && !ctx.list.length) {
      box.innerHTML = `<div class="leegte"><h2>Niets gevonden voor “${esc(ctx.searched)}”</h2><p>Zoek op een merk zoals Kade, een item zoals cargo of een kleur zoals olijf.</p><a class="knop" href="#shop">Bekijk alles</a></div>`;
    } else {
      box.innerHTML = `<div class="leegte"><h2>Geen artikelen met deze filters</h2><p>Haal een filter weg of begin opnieuw.</p><button class="knop" type="button" data-wis>Wis filters</button></div>`;
    }
  }

  /* ----- productpagina ----- */
  function sizeChartHTML(p) {
    if (p.cat === "accessoires") return "";
    if (p.cat === "sneakers") {
      const cm = { 39: 24.5, 40: 25.2, 41: 26, 42: 26.6, 43: 27.4, 44: 28, 45: 28.8, 46: 29.5 };
      return `<details class="maattabel"><summary>Maattabel</summary><div class="tabel-scroll"><table>
        <thead><tr><th scope="col">EU</th>${SIZE_SETS.sneakers.map((s) => `<th scope="col">${s}</th>`).join("")}</tr></thead>
        <tbody><tr><th scope="row">Voetlengte</th>${SIZE_SETS.sneakers.map((s) => `<td>${String(cm[s]).replace(".", ",")} cm</td>`).join("")}</tr></tbody>
      </table></div></details>`;
    }
    const isPants = p.cat === "broeken";
    const a = isPants ? [72, 76, 80, 84, 90, 96] : [54, 57, 60, 63, 66, 69];
    const b = isPants ? (p.flat === "shorts" ? [50, 51, 52, 53, 54, 55] : [100, 102, 104, 106, 108, 110]) : [68, 70, 72, 74, 76, 78];
    const extra = p.fit === "Oversized" || p.fit === "Boxy" ? `<p class="demo-noot" style="margin-top:8px">Valt ruim. Wil je hem minder wijd, neem dan een maat kleiner.</p>` : "";
    return `<details class="maattabel"><summary>Maattabel</summary><div class="tabel-scroll"><table>
      <thead><tr><th scope="col">Maat</th>${SIZE_SETS.kleding.map((s) => `<th scope="col">${s}</th>`).join("")}</tr></thead>
      <tbody>
        <tr><th scope="row">${isPants ? "Taille" : "Borstbreedte"}</th>${a.map((v) => `<td>${v} cm</td>`).join("")}</tr>
        <tr><th scope="row">${isPants ? "Lengte" : "Lengte rug"}</th>${b.map((v) => `<td>${v} cm</td>`).join("")}</tr>
      </tbody></table></div>${extra}</details>`;
  }

  function renderPDP(id) {
    const p = BY_ID[id];
    if (!p) return renderNotFound();
    if (!state.pdp || state.pdp.id !== id) {
      const sizes = sizesOf(p);
      state.pdp = { id, color: p.colors[0], size: sizes.length === 1 ? sizes[0] : null, error: "" };
    }
    const v = state.pdp;
    const cat = CAT_BY_ID[p.cat];
    const sizes = sizesOf(p);
    const stock = v.size ? stockOf(p, v.size) : null;
    const related = PRODUCTS.filter((x) => x.id !== p.id && (x.brand === p.brand || x.cat === p.cat))
      .sort((a, b) => (b.brand === p.brand) - (a.brand === p.brand)).slice(0, 4);

    return `
      <div class="wrap">
        <p class="kruimel" style="padding-top:24px"><a href="#home">Home</a> / <a href="#shop-${cat.id}">${cat.name}</a> / ${p.name}</p>
        <div class="pdp">
          <div class="galerij">
            <div class="studio" id="pdp-beeld">${flatFor(p, v.color, true)}</div>
            ${p.colors.length > 1 ? `<div class="duimen" role="group" aria-label="Kleur kiezen">
              ${p.colors.map((c) => `<button type="button" class="duim" data-kleur="${c}" aria-pressed="${c === v.color}" aria-label="${COLORS[c].name}">${flatFor(p, c, false)}</button>`).join("")}
            </div>` : ""}
          </div>

          <div class="pdp-info">
            <div>
              <a class="pdp-merk" href="#merk-${slug(p.brand)}">${p.brand}</a>
              <h1 class="pdp-naam">${p.name}</h1>
            </div>
            <div class="pdp-prijs">${priceHTML(p)} ${p.was ? `<span class="label korting" style="position:static;margin-left:8px">-${discount(p)}%</span>` : ""}</div>

            <div>
              <div class="pdp-regel"><span>Kleur: <strong>${COLORS[v.color].name}</strong></span></div>
              <div class="swatches" role="group" aria-label="Kleur">
                ${p.colors.map((c) => `<button type="button" class="swatch" data-kleur="${c}" aria-pressed="${c === v.color}" aria-label="${COLORS[c].name}" title="${COLORS[c].name}" style="--c:${COLORS[c].hex}"></button>`).join("")}
              </div>
            </div>

            <div>
              <div class="pdp-regel"><span>Maat${v.size ? `: <strong>${v.size}</strong>` : ""}</span><span class="demo-noot">${p.fit}</span></div>
              <div class="maten" role="group" aria-label="Maat" id="maten">
                ${sizes.map((s) => {
                  const st = stockOf(p, s);
                  return `<button type="button" class="maat" data-maat="${s}" aria-pressed="${s === v.size}" ${st === 0 ? "disabled" : ""} aria-label="${s}${st === 0 ? ", uitverkocht" : ""}">${s}</button>`;
                }).join("")}
              </div>
              ${v.error ? `<p class="fout" id="maat-fout" role="alert">${v.error}</p>` : ""}
              <p class="voorraad">${stock !== null && stock <= 2 ? `Nog ${stock} op voorraad in ${v.size}` : ""}</p>
              ${sizeChartHTML(p)}
            </div>

            <div class="koop">
              <button class="knop rood" type="button" data-add="${p.id}">In winkelwagen</button>
              <button class="hart hart-groot" type="button" data-wish="${p.id}" aria-pressed="${inWish(p.id)}" aria-label="Bewaren in favorieten">${ICON_HEART}</button>
            </div>

            <ul class="feiten">
              <li>${ICON_TRUCK}<span>Voor 22:00 besteld, ${deliveryDay()} bezorgd. Gratis vanaf ${euro(FREE_SHIPPING)}.</span></li>
              <li>${ICON_RETURN}<span>30 dagen om te retourneren, gratis.</span></li>
              <li>${ICON_CARD}<span>Betaal met iDEAL, creditcard of achteraf.</span></li>
            </ul>

            <p class="pdp-tekst">${p.desc}</p>
            <dl class="specs">
              <dt>Pasvorm</dt><dd>${p.fit}</dd>
              <dt>Materiaal</dt><dd>${p.material}</dd>
              <dt>${p.cat === "accessoires" ? "Inhoud" : "Gewicht"}</dt><dd>${p.weight}</dd>
              <dt>Artikelnummer</dt><dd>ST-${String(hash(p.id) % 100000).padStart(5, "0")}</dd>
            </dl>
          </div>
        </div>
      </div>
      <section class="sectie">
        <div class="wrap">
          <div class="sectie-kop"><h2 class="sectie-titel">Meer van ${p.brand} en ${cat.name.toLowerCase()}</h2></div>
          <div class="raster vier">${related.map(cardHTML).join("")}</div>
        </div>
      </section>`;
  }

  function rerenderPDP(focusSelector) {
    main.innerHTML = renderPDP(state.pdp.id);
    if (focusSelector) { const el = $(focusSelector, main); if (el) el.focus(); }
  }

  /* ----- favorieten ----- */
  function renderWish() {
    const items = state.wish.map((id) => BY_ID[id]).filter(Boolean);
    return `
      <div class="wrap">
        <div class="shop-kop"><p class="kruimel"><a href="#home">Home</a> / Favorieten</p><h1 class="shop-titel">Favorieten</h1></div>
        <div class="sectie" style="padding-top:20px">
          ${items.length
            ? `<p class="aantal" style="margin-bottom:20px">${items.length} ${items.length === 1 ? "artikel" : "artikelen"} bewaard</p><div class="raster">${items.map(cardHTML).join("")}</div>`
            : `<div class="leegte"><h2>Nog niets bewaard</h2><p>Tik op het hartje bij een item om het hier terug te vinden.</p><a class="knop" href="#nieuw">Bekijk wat nieuw is</a></div>`}
        </div>
      </div>`;
  }

  /* ----- afrekenen ----- */
  const cartLines = () => state.cart.map((l) => ({ ...l, p: BY_ID[l.id] })).filter((l) => l.p);
  const subtotal = () => cartLines().reduce((s, l) => s + l.p.price * l.qty, 0);
  const itemCount = () => state.cart.reduce((s, l) => s + l.qty, 0);
  function shippingCost(method) {
    if (method === "afhaal") return 0;
    if (method === "avond") return SHIPPING.avond;
    return subtotal() >= FREE_SHIPPING ? 0 : SHIPPING.standaard;
  }

  function renderCheckout() {
    const lines = cartLines();
    if (!lines.length) {
      return `<div class="wrap"><div class="leegte" style="padding-block:64px"><h2>Je winkelwagen is leeg</h2><p>Voeg eerst iets toe, dan kun je hier afrekenen.</p><a class="knop" href="#nieuw">Bekijk wat nieuw is</a></div></div>`;
    }
    const std = subtotal() >= FREE_SHIPPING ? "Gratis" : euro(SHIPPING.standaard);
    return `
      <div class="wrap">
        <div class="shop-kop"><p class="kruimel"><a href="#home">Home</a> / Afrekenen</p><h1 class="shop-titel">Afrekenen</h1></div>
        <div class="afreken">
          <form class="formulier" id="afreken-form" novalidate>
            <fieldset>
              <legend>Je gegevens</legend>
              <div class="velden">
                ${field("email", "E-mailadres", "email", "heel", 'autocomplete="email" inputmode="email"')}
                ${field("voornaam", "Voornaam", "text", "", 'autocomplete="given-name"')}
                ${field("achternaam", "Achternaam", "text", "", 'autocomplete="family-name"')}
              </div>
            </fieldset>
            <fieldset>
              <legend>Bezorgadres</legend>
              <div class="velden">
                ${field("postcode", "Postcode", "text", "", 'autocomplete="postal-code" placeholder="1234 AB"')}
                ${field("huisnummer", "Huisnummer", "text", "", 'inputmode="numeric" placeholder="12"')}
                ${field("straat", "Straat", "text", "", 'autocomplete="address-line1"')}
                ${field("plaats", "Plaats", "text", "", 'autocomplete="address-level2"')}
              </div>
            </fieldset>
            <fieldset>
              <legend>Bezorging</legend>
              <div class="opties">
                ${option("bezorging", "standaard", "Standaard", `${deliveryDay()} tussen 9:00 en 18:00`, std, true)}
                ${option("bezorging", "avond", "Avondlevering", `${deliveryDay()} tussen 18:00 en 22:00`, euro(SHIPPING.avond))}
                ${option("bezorging", "afhaal", "Afhaalpunt", "Ophalen bij een PostNL-punt bij jou in de buurt", "Gratis")}
              </div>
            </fieldset>
            <fieldset>
              <legend>Betalen</legend>
              <div class="opties">
                ${option("betaling", "ideal", "iDEAL", "Je kiest je bank in de volgende stap", "", true)}
                ${option("betaling", "kaart", "Creditcard", "Visa, Mastercard of American Express", "")}
                ${option("betaling", "achteraf", "Achteraf betalen", "Binnen 30 dagen, zonder extra kosten", "")}
              </div>
            </fieldset>
            <button class="knop rood breed" type="submit" style="margin-top:12px">Bestelling plaatsen</button>
            <p class="demo-noot">Dit is een demo. Er wordt niets besteld of afgeschreven.</p>
          </form>
          <aside class="overzicht" aria-labelledby="overzicht-titel">
            <h2 id="overzicht-titel">Je bestelling</h2>
            <ul class="mini">
              ${lines.map((l) => `<li><div class="studio">${flatFor(l.p, l.color, false)}</div><div><strong>${l.p.name}</strong><span>${l.p.brand}, ${COLORS[l.color].name.toLowerCase()}, ${l.size}${l.qty > 1 ? `, ${l.qty} stuks` : ""}</span></div><b>${euro(l.p.price * l.qty)}</b></li>`).join("")}
            </ul>
            <dl class="sommen" id="sommen"></dl>
          </aside>
        </div>
      </div>`;
  }
  function field(id, label, type, cls, attrs) {
    return `<div class="veld ${cls}"><label for="v-${id}">${label}</label><input id="v-${id}" name="${id}" type="${type}" ${attrs} aria-describedby="v-${id}-fout"><p class="fout" id="v-${id}-fout" hidden></p></div>`;
  }
  function option(name, value, title, sub, price, checked) {
    return `<label class="optie"><input type="radio" name="${name}" value="${value}" ${checked ? "checked" : ""}><span><strong>${title}</strong><small>${sub}</small></span><b>${price}</b></label>`;
  }
  function updateSums() {
    const box = $("#sommen");
    if (!box) return;
    const method = ($('input[name="bezorging"]:checked') || {}).value || "standaard";
    const ship = shippingCost(method);
    box.innerHTML = `
      <dt>Subtotaal</dt><dd>${euro(subtotal())}</dd>
      <dt>Verzending</dt><dd>${ship ? euro(ship) : "Gratis"}</dd>
      <dt class="eind">Totaal</dt><dd class="eind">${euro(subtotal() + ship)}</dd>
      <dt>Waarvan btw (21%)</dt><dd>${euro(((subtotal() + ship) / 121) * 21)}</dd>`;
  }

  const VALIDATORS = {
    email: (v) => (!v ? "Vul je e-mailadres in." : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Dit e-mailadres klopt niet. Controleer of er een @ en een punt in staan."),
    voornaam: (v) => (v ? "" : "Vul je voornaam in."),
    achternaam: (v) => (v ? "" : "Vul je achternaam in."),
    postcode: (v) => (!v ? "Vul je postcode in." : /^[1-9]\d{3}\s?[a-zA-Z]{2}$/.test(v) ? "" : "Vul een postcode in zoals 1012 AB."),
    huisnummer: (v) => (!v ? "Vul je huisnummer in." : /^\d+/.test(v) ? "" : "Begin met een cijfer, bijvoorbeeld 12 of 12a."),
    straat: (v) => (v ? "" : "Vul je straatnaam in."),
    plaats: (v) => (v ? "" : "Vul je woonplaats in."),
  };
  function validateField(input) {
    const msg = VALIDATORS[input.name](input.value.trim());
    const err = $("#" + input.id + "-fout");
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    err.textContent = msg;
    err.hidden = !msg;
    return !msg;
  }

  function placeOrder(form) {
    const inputs = $$("input[name]", form).filter((i) => VALIDATORS[i.name]);
    const bad = inputs.filter((i) => !validateField(i));
    if (bad.length) { bad[0].focus(); return; }
    const method = form.bezorging.value;
    const total = subtotal() + shippingCost(method);
    state.lastOrder = {
      nr: "ST" + String(Date.now()).slice(-7),
      email: form.email.value.trim(),
      name: form.voornaam.value.trim(),
      total,
      count: itemCount(),
      method,
      day: deliveryDay(),
    };
    store.set("lastOrder", state.lastOrder);
    state.cart = [];
    saveCart();
    location.hash = "besteld";
  }

  function renderConfirmation() {
    const o = state.lastOrder;
    if (!o) return renderNotFound();
    const when = o.method === "afhaal" ? `Je kunt je pakket vanaf ${o.day} ophalen bij je afhaalpunt.` : `We bezorgen ${o.day}${o.method === "avond" ? " tussen 18:00 en 22:00" : ""}.`;
    return `
      <div class="wrap bevestiging">
        <h1 class="shop-titel">Besteld, ${esc(o.name)}</h1>
        <p>Je bestelling <span class="ordernr">${o.nr}</span> met ${o.count} ${o.count === 1 ? "artikel" : "artikelen"} is geplaatst. Totaal ${euro(o.total)}.</p>
        <p>${when} De bevestiging gaat naar ${esc(o.email)}.</p>
        <p class="demo-noot" style="margin-bottom:28px">Demo-shop: er is niets verstuurd of afgeschreven.</p>
        <a class="knop" href="#nieuw">Verder shoppen</a>
      </div>`;
  }

  function renderNotFound() {
    return `<div class="wrap"><div class="leegte" style="padding-block:64px"><h1 class="shop-titel">Deze pagina is er niet</h1><p>De link klopt niet of het item is uit het assortiment.</p><a class="knop" href="#home">Naar de homepage</a></div></div>`;
  }

  /* ---------- winkelwagen-lade ---------- */
  const lade = $("#lade");
  const overlay = $("#overlay");
  let lastFocus = null;

  function renderDrawer() {
    const lines = cartLines();
    const box = $("#lade-inhoud");
    if (!lines.length) {
      box.innerHTML = `<div class="lade-leeg"><p>Je winkelwagen is leeg. Begin bij wat net binnen is.</p><a class="knop" href="#nieuw">Bekijk wat nieuw is</a></div>`;
      return;
    }
    const sub = subtotal();
    const rest = FREE_SHIPPING - sub;
    const pct = Math.min(100, (sub / FREE_SHIPPING) * 100);
    box.innerHTML = `
      <div class="verzend">
        <p>${rest > 0 ? `Nog <strong>${euro(rest)}</strong> tot gratis verzending` : "Je bestelling wordt gratis verzonden"}</p>
        <div class="meter" role="progressbar" aria-label="Voortgang naar gratis verzending" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><i style="width:${pct}%"></i></div>
      </div>
      <ul class="regels">
        ${lines.map((l, i) => `
          <li class="regel">
            <div class="studio">${flatFor(l.p, l.color, false)}</div>
            <div>
              <span class="merk">${l.p.brand}</span>
              <h3><a href="#p-${l.p.id}">${l.p.name}</a></h3>
              <p class="regel-meta">${COLORS[l.color].name}, maat ${l.size}</p>
              <div class="regel-onder">
                <div class="aantal-kies">
                  <button type="button" data-qty="${i}" data-delta="-1" aria-label="Eén minder van ${l.p.name}">−</button>
                  <output aria-label="Aantal">${l.qty}</output>
                  <button type="button" data-qty="${i}" data-delta="1" aria-label="Eén meer van ${l.p.name}" ${l.qty >= 5 ? "disabled" : ""}>+</button>
                </div>
                <strong class="prijs">${euro(l.p.price * l.qty)}</strong>
              </div>
              <button type="button" class="tekstknop" data-remove="${i}">Verwijderen</button>
            </div>
          </li>`).join("")}
      </ul>
      <div class="lade-voet">
        <div class="totaal"><span>Subtotaal</span><span>${euro(sub)}</span></div>
        <a class="knop rood breed" href="#afrekenen">Naar afrekenen</a>
      </div>`;
  }

  function openDrawer() {
    lastFocus = document.activeElement;
    renderDrawer();
    lade.hidden = false;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    $("#sluit-lade").focus();
  }
  function closeDrawer(restoreFocus = true) {
    if (lade.hidden) return;
    lade.hidden = true;
    overlay.hidden = true;
    document.body.style.overflow = "";
    if (restoreFocus && lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  /* ---------- acties ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  function updateCounters() {
    const set = (key, n) => {
      const el = $(`[data-teller="${key}"]`);
      const changed = el.textContent !== String(n);
      el.textContent = n;
      el.hidden = n === 0;
      if (changed && n) { el.classList.remove("tik"); void el.offsetWidth; el.classList.add("tik"); }
    };
    set("cart", itemCount());
    set("wish", state.wish.length);
  }

  function toggleWish(id) {
    const on = !inWish(id);
    state.wish = on ? [...state.wish, id] : state.wish.filter((x) => x !== id);
    store.set("wish", state.wish);
    $$(`[data-wish="${id}"]`).forEach((b) => b.setAttribute("aria-pressed", on));
    updateCounters();
    toast(on ? "Bewaard in favorieten" : "Verwijderd uit favorieten");
    if (currentRoute() === "favorieten" && !on) render();
  }

  function addToCart() {
    const v = state.pdp;
    const p = BY_ID[v.id];
    if (!v.size) {
      v.error = "Kies eerst je maat.";
      rerenderPDP(".maat:not(:disabled)");
      return;
    }
    const line = state.cart.find((l) => l.id === v.id && l.color === v.color && l.size === v.size);
    if (line) line.qty = Math.min(5, line.qty + 1);
    else state.cart.push({ id: v.id, color: v.color, size: v.size, qty: 1 });
    saveCart();
    toast(`${p.name} in maat ${v.size} toegevoegd`);
    openDrawer();
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, a");
    if (!t) return;

    if (t.tagName === "A" && t.getAttribute("href") === "#" + currentRoute()) { closeDrawer(false); return; }
    if (t.dataset.wish) { e.preventDefault(); toggleWish(t.dataset.wish); return; }
    if (t.dataset.add) { addToCart(); return; }
    if (t.id === "open-lade") { openDrawer(); return; }
    if (t.id === "sluit-lade") { closeDrawer(); return; }
    if (t.id === "herinner") {
      state.reminder = !state.reminder;
      store.set("reminder", state.reminder);
      t.setAttribute("aria-pressed", state.reminder);
      t.textContent = state.reminder ? "Herinnering staat aan" : "Zet herinnering";
      toast(state.reminder ? "We sturen je vrijdag om 17:45 een seintje" : "Herinnering staat uit");
      return;
    }
    if (t.dataset.kleur && state.pdp) {
      state.pdp.color = t.dataset.kleur;
      const group = t.classList.contains("duim") ? "duim" : "swatch";
      rerenderPDP(`.${group}[data-kleur="${t.dataset.kleur}"]`);
      return;
    }
    if (t.dataset.maat && state.pdp) {
      state.pdp.size = t.dataset.maat;
      state.pdp.error = "";
      rerenderPDP(`.maat[data-maat="${t.dataset.maat}"]`);
      return;
    }
    if (t.dataset.fsize) {
      const f = state.filters;
      const s = t.dataset.fsize;
      f.sizes = f.sizes.includes(s) ? f.sizes.filter((x) => x !== s) : [...f.sizes, s];
      t.setAttribute("aria-pressed", f.sizes.includes(s));
      updateResults();
      return;
    }
    if (t.dataset.fcolor) {
      const f = state.filters;
      const c = t.dataset.fcolor;
      f.colors = f.colors.includes(c) ? f.colors.filter((x) => x !== c) : [...f.colors, c];
      t.setAttribute("aria-pressed", f.colors.includes(c));
      updateResults();
      return;
    }
    if (t.hasAttribute("data-wis")) {
      state.filters = emptyFilters();
      const open = $(".filterpaneel")?.open;
      render({ keepScroll: true });
      if ($(".filterpaneel")) $(".filterpaneel").open = open;
      return;
    }
    if (t.dataset.qty !== undefined) {
      const line = state.cart[+t.dataset.qty];
      line.qty += +t.dataset.delta;
      if (line.qty <= 0) state.cart.splice(+t.dataset.qty, 1);
      saveCart();
      renderDrawer();
      const again = $(`[data-qty="${t.dataset.qty}"][data-delta="${t.dataset.delta}"]`);
      (again && !again.disabled ? again : $("#sluit-lade")).focus();
      return;
    }
    if (t.dataset.remove !== undefined) {
      const [removed] = state.cart.splice(+t.dataset.remove, 1);
      saveCart();
      renderDrawer();
      $("#sluit-lade").focus();
      toast(`${BY_ID[removed.id].name} verwijderd`);
      return;
    }
  });

  overlay.addEventListener("click", () => closeDrawer());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !lade.hidden) closeDrawer();
    if (e.key === "Tab" && !lade.hidden) {
      const f = $$("a[href], button:not(:disabled), input, select", lade);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.f === "brand") {
      const f = state.filters;
      f.brands = t.checked ? [...f.brands, t.value] : f.brands.filter((b) => b !== t.value);
      updateResults();
    } else if (t.id === "f-sale") {
      state.filters.sale = t.checked; updateResults();
    } else if (t.id === "sorteer") {
      state.sort = t.value; updateResults();
    } else if (t.name === "bezorging") {
      updateSums();
    } else if (t.closest("#afreken-form") && VALIDATORS[t.name] && t.getAttribute("aria-invalid")) {
      validateField(t);
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "f-prijs") {
      state.filters.max = +e.target.value;
      $("#prijs-uit").textContent = state.filters.max >= MAX_PRICE ? "Geen maximum" : "Tot " + euro(state.filters.max);
      updateResults();
    }
  });
  document.addEventListener("focusout", (e) => {
    const t = e.target;
    if (t.closest && t.closest("#afreken-form") && VALIDATORS[t.name] && t.value.trim()) validateField(t);
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id === "zoek-form") {
      e.preventDefault();
      state.query = $("#zoek-input").value;
      if (currentRoute() === "zoeken") render(); else location.hash = "zoeken";
    } else if (e.target.id === "afreken-form") {
      e.preventDefault();
      placeOrder(e.target);
    }
  });

  /* ---------- router ---------- */
  const currentRoute = () => decodeURIComponent(location.hash.slice(1)) || "home";

  function navHTML(route) {
    const links = [["nieuw", "Nieuw"], ...CATEGORIES.map((c) => ["shop-" + c.id, c.name]), ["sale", "Sale"]];
    return links.map(([href, name]) =>
      `<a href="#${href}" class="${href === "sale" ? "sale" : ""}" ${route === href ? 'aria-current="page"' : ""}>${name}</a>`).join("");
  }

  function render(opts = {}) {
    const route = currentRoute();
    closeDrawer(false);
    let html;
    let title = "Stoep streetwear";
    if (route !== "zoeken") $("#zoek-input").value = "";
    if (!route.startsWith("p-")) state.pdp = null;

    if (route === "home") html = renderHome();
    else if (route.startsWith("p-")) {
      html = renderPDP(route.slice(2));
      const p = BY_ID[route.slice(2)];
      if (p) title = `${p.name} van ${p.brand} | Stoep`;
    }
    else if (route === "favorieten") { html = renderWish(); title = "Favorieten | Stoep"; }
    else if (route === "afrekenen") { html = renderCheckout(); title = "Afrekenen | Stoep"; }
    else if (route === "besteld") { html = renderConfirmation(); title = "Besteld | Stoep"; }
    else {
      const ctx = shopContext(route);
      if (ctx) { html = renderShop(ctx); title = `${ctx.searched || ctx.title} | Stoep`; }
      else html = renderNotFound();
    }

    main.innerHTML = html;
    document.title = title;
    $("#cats").innerHTML = navHTML(route);
    if ($("#resultaten")) updateResults();
    if ($("#sommen")) updateSums();
    if (!opts.keepScroll) window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", () => { render(); main.focus({ preventScroll: true }); });
  updateCounters();
  render();
})();
