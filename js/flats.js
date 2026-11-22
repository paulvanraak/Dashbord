/* Technische fashion flats als SVG. Elke kledingvorm krijgt de kleur van de gekozen variant. */

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function shade(hex, amt) {
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return "#" + hexToRgb(hex).map((v) => f(v).toString(16).padStart(2, "0")).join("");
}

const FLATS = {
  hoodie(c, d, s, o) {
    return `
      <path d="M74 58 C66 22 134 22 126 58 Z" fill="${s}"/>
      <path d="M78 52 L58 60 L40 72 L26 148 L42 152 L56 100 L58 170 L142 170 L144 100 L158 152 L174 148 L160 72 L142 60 L122 52 C116 64 84 64 78 52 Z" fill="${c}"/>
      <path d="M84 56 C84 36 116 36 116 56 C112 66 88 66 84 56 Z" fill="${s}"/>
      ${o.zip
        ? `<path d="M100 62 L100 170" fill="none"/><path d="M72 120 L80 150 M128 120 L120 150" fill="none" stroke="${d}"/>`
        : `<path d="M74 128 L126 128 L134 156 L66 156 Z" fill="${c}"/>`}
      <path d="M58 160 L142 160 M28 138 L44 142 M172 138 L156 142" fill="none"/>
      <path d="M93 64 L91 92 M107 64 L109 92" fill="none" stroke="${d}"/>
      ${o.print ? printText(o.print, 112, d, o.print.length > 3 ? 17 : 22) : ""}`;
  },

  tee(c, d, s, o) {
    const body = o.long
      ? "M80 48 L58 56 L40 72 L26 152 L42 156 L56 100 L58 170 L142 170 L144 100 L158 156 L174 152 L160 72 L142 56 L120 48 C114 62 86 62 80 48 Z"
      : "M80 48 L56 56 L28 82 L44 102 L58 92 L58 170 L142 170 L142 92 L156 102 L172 82 L144 56 L120 48 C114 62 86 62 80 48 Z";
    return `
      <path d="${body}" fill="${c}"/>
      <path d="M84 50 C90 64 110 64 116 50" fill="none" stroke="${d}"/>
      <path d="M58 162 L142 162" fill="none" stroke="${d}"/>
      ${o.long ? `<path d="M28 142 L43 146 M172 142 L157 146" fill="none" stroke="${d}"/>` : ""}
      ${o.pocket ? `<path d="M112 84 L132 84 L132 106 L112 106 Z" fill="${s}"/>` : ""}
      ${o.print ? printText(o.print, 104, d, 18) : ""}`;
  },

  pants(c, d, s, o) {
    return `
      <path d="M64 28 L136 28 L142 172 L108 172 L100 78 L92 172 L58 172 Z" fill="${c}"/>
      <path d="M64 40 L136 40" fill="none"/>
      <path d="M100 40 L100 70" fill="none" stroke="${d}"/>
      <path d="M70 40 C72 56 82 60 92 58 M130 40 C128 56 118 60 108 58" fill="none" stroke="${d}"/>
      ${o.cargo ? `<path d="M62 96 L82 96 L82 126 L62 126 Z M118 96 L138 96 L138 126 L118 126 Z" fill="${s}"/><path d="M62 104 L82 104 M118 104 L138 104" fill="none" stroke="${d}"/>` : ""}
      ${o.stripe ? `<path d="M65 44 L60 170 M135 44 L140 170" fill="none" stroke="#F6F6F2" stroke-width="5"/>` : ""}
      ${o.loop ? `<path d="M128 70 L134 70 L135 92 L129 92 Z" fill="${s}"/><path d="M64 118 L94 118 L94 146 L62 146 Z M106 118 L136 118 L138 146 L106 146 Z" fill="${s}"/>` : ""}`;
  },

  shorts(c, d, s, o) {
    return `
      <path d="M62 52 L138 52 L148 140 L106 146 L100 98 L94 146 L52 140 Z" fill="${c}"/>
      <path d="M62 64 L138 64" fill="none"/>
      <path d="M100 64 L100 92 M68 64 C70 78 80 82 90 80 M132 64 C130 78 120 82 110 80" fill="none" stroke="${d}"/>
      <path d="M53 132 L94 136 M147 132 L106 136" fill="none" stroke="${d}"/>
      ${o.cargo ? `<path d="M56 96 L76 96 L77 124 L56 124 Z M124 96 L144 96 L144 124 L123 124 Z" fill="${s}"/>` : ""}`;
  },

  jacket(c, d, s, o) {
    return `
      <path d="M80 46 L58 56 L36 72 L28 150 L46 154 L58 98 L58 168 L142 168 L142 98 L154 154 L172 150 L164 72 L142 56 L120 46 Z" fill="${c}"/>
      <path d="M78 50 L80 30 L120 30 L122 50 L100 60 Z" fill="${s}"/>
      <path d="M100 60 L100 168" fill="none"/>
      ${o.quilt ? `<path d="M58 84 L142 84 M58 108 L142 108 M58 132 L142 132 M58 156 L142 156 M35 98 L56 102 M32 124 L53 128 M165 98 L144 102 M168 124 L147 128" fill="none" stroke="${d}"/>` : ""}
      ${o.buttons ? `<g fill="${d}" stroke="none"><circle cx="106" cy="78" r="2.6"/><circle cx="106" cy="102" r="2.6"/><circle cx="106" cy="126" r="2.6"/><circle cx="106" cy="150" r="2.6"/></g>` : ""}
      ${o.pockets ? `<path d="M66 118 L90 118 L90 146 L66 146 Z M110 118 L134 118 L134 146 L110 146 Z M70 74 L88 74 L88 92 L70 92 Z" fill="${s}"/>` : ""}
      <path d="M58 160 L142 160" fill="none" stroke="${d}"/>`;
  },

  sneaker(c, d, s, o) {
    const sole = luminance(c) > 0.85 ? "#C9A06B" : "#F2F1EC";
    const upper = o.mid
      ? "M30 140 C28 112 32 80 46 72 L82 72 C84 86 92 94 102 96 C122 100 140 106 158 112 C172 118 178 128 176 140 Z"
      : "M30 140 C30 118 44 108 60 104 L84 94 L94 80 L122 80 C126 96 138 104 158 112 C172 118 178 128 176 140 Z";
    return `
      <path d="${upper}" fill="${c}"/>
      <path d="M22 140 L178 140 C184 144 184 154 176 158 L30 158 C20 158 18 146 22 140 Z" fill="${sole}"/>
      <path d="M24 149 L180 149" fill="none" stroke="${shade(sole, -0.25)}"/>
      <path d="M62 130 C92 118 124 118 162 128" fill="none" stroke="${s}" stroke-width="7"/>
      <path d="M62 130 C92 118 124 118 162 128" fill="none" stroke-width="1.4"/>
      <path d="${o.mid ? "M92 90 L108 98 M96 82 L112 92 M100 74 L114 84" : "M98 96 L112 104 M104 88 L118 98 M110 82 L124 92"}" fill="none" stroke="${d}"/>
      <path d="M150 112 C160 116 166 122 168 130" fill="none" stroke="${d}"/>`;
  },

  cap(c, d, s) {
    return `
      <path d="M48 124 C46 70 154 70 152 124 Z" fill="${c}"/>
      <path d="M100 76 L100 124 M76 82 C70 96 70 112 72 124 M124 82 C130 96 130 112 128 124" fill="none" stroke="${d}"/>
      <path d="M44 122 C80 114 150 114 182 130 C170 142 100 138 44 132 Z" fill="${s}"/>
      <circle cx="100" cy="74" r="4.5" fill="${c}"/>`;
  },

  beanie(c, d, s) {
    const ribs = Array.from({ length: 11 }, (_, i) => `M${60 + i * 8} 122 L${60 + i * 8} 150`).join(" ");
    return `
      <path d="M58 124 C56 62 144 62 142 124 Z" fill="${c}"/>
      <path d="M70 116 C70 90 80 76 92 70 M130 116 C130 90 120 76 108 70" fill="none" stroke="${d}"/>
      <rect x="52" y="116" width="96" height="40" rx="6" fill="${s}"/>
      <path d="${ribs}" fill="none" stroke="${d}"/>
      <rect x="88" y="128" width="24" height="15" fill="#F6F6F2"/>`;
  },

  bag(c, d, s, o) {
    if (o.tote) {
      return `
        <path d="M74 74 C74 34 126 34 126 74" fill="none" stroke-width="9"/>
        <path d="M74 74 C74 34 126 34 126 74" fill="none" stroke="${c}" stroke-width="5"/>
        <path d="M52 70 L148 70 L156 168 L44 168 Z" fill="${c}"/>
        <path d="M54 82 L146 82" fill="none" stroke="${d}" stroke-dasharray="5 4"/>`;
    }
    return `
      <path d="M62 96 C56 34 144 34 138 96" fill="none" stroke-width="9"/>
      <path d="M62 96 C56 34 144 34 138 96" fill="none" stroke="${s}" stroke-width="5"/>
      <rect x="44" y="88" width="112" height="72" rx="14" fill="${c}"/>
      <path d="M56 104 L144 104" fill="none" stroke="${d}" stroke-dasharray="4 4"/>
      <rect x="86" y="120" width="28" height="16" rx="2" fill="${s}"/>`;
  },
};

function printText(txt, y, color, size) {
  return `<text x="100" y="${y}" text-anchor="middle" font-family="Archivo, 'Arial Narrow', sans-serif" font-weight="900" font-stretch="75%" font-size="${size}" fill="${color}" stroke="none" letter-spacing="1">${txt}</text>`;
}

function flatSVG(type, hex, opts = {}, label = "") {
  const detail = luminance(hex) < 0.38 ? "rgba(255,255,255,.6)" : "rgba(0,0,0,.42)";
  const second = shade(hex, luminance(hex) < 0.2 ? 0.14 : -0.16);
  const role = label ? `role="img" aria-label="${label}"` : `aria-hidden="true"`;
  return `<svg class="flat" viewBox="0 0 200 200" ${role}><g stroke="#000" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">${FLATS[type](hex, detail, second, opts)}</g></svg>`;
}
