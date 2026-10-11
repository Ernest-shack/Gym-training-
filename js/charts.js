// Tiny SVG charts: single-series line and bar, with a hover/tap tooltip.
const W = 320;
const H = 170;
const PAD = { l: 34, r: 12, t: 14, b: 24 };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => (Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 10) / 10).toLocaleString();

function niceTicks(min, max, count = 3) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}

function frame(ticks, y, xLabels) {
  const grid = ticks.map((t) => `<line class="grid" x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(t)}" y2="${y(t)}"/><text class="axis" x="${PAD.l - 6}" y="${y(t) + 4}" text-anchor="end">${fmt(t)}</text>`).join('');
  const xs = xLabels.map(([x, label, anchor]) => `<text class="axis" x="${x}" y="${H - 6}" text-anchor="${anchor}">${esc(label)}</text>`).join('');
  return grid + xs;
}

function wrap(kind, points, label, svg, xs) {
  const table = `<table class="sr-only"><caption>${esc(label)}</caption><tbody>${points.map((p) => `<tr><th>${esc(p.label)}</th><td>${p.y}</td></tr>`).join('')}</tbody></table>`;
  return `<figure class="chart" data-kind="${kind}" data-label="${esc(label)}" data-points="${esc(JSON.stringify(points))}" data-xs="${esc(JSON.stringify(xs))}">
    <figcaption class="small muted">${esc(label)}</figcaption>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${svg}</svg>
    <div class="tooltip" hidden></div>${table}</figure>`;
}

export function lineChart(points, { label = '' } = {}) {
  const vals = points.map((p) => p.y);
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
  const [lo, hi] = [ticks[0], ticks[ticks.length - 1]];
  const x = (i) => PAD.l + (points.length === 1 ? 0 : (i * (W - PAD.l - PAD.r)) / (points.length - 1));
  const y = (v) => PAD.t + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.t - PAD.b);
  const xs = points.map((_, i) => x(i));
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join('');
  const last = points.length - 1;
  const svg = frame(ticks, y, [[x(0), points[0].label, 'start'], [x(last), points[last].label, 'end']])
    + `<path class="line" d="${d}"/>`
    + points.map((p, i) => `<circle class="dot" data-i="${i}" cx="${x(i)}" cy="${y(p.y)}" r="4"/>`).join('')
    + `<text class="value" x="${x(last)}" y="${y(points[last].y) - 10}" text-anchor="end">${fmt(points[last].y)}</text>`
    + `<line class="cross" x1="0" x2="0" y1="${PAD.t}" y2="${H - PAD.b}" visibility="hidden"/>`;
  return wrap('line', points, label, svg, xs);
}

export function barChart(points, { label = '' } = {}) {
  const ticks = niceTicks(0, Math.max(3, ...points.map((p) => p.y)));
  const hi = ticks[ticks.length - 1];
  const y = (v) => PAD.t + (1 - v / hi) * (H - PAD.t - PAD.b);
  const slot = (W - PAD.l - PAD.r) / points.length;
  const bw = Math.min(24, slot - 2); // >= 2px gap between bars
  const xs = points.map((_, i) => PAD.l + slot * i + slot / 2);
  const base = y(0);
  const bars = points.map((p, i) => {
    if (!p.y) return '';
    const top = y(p.y);
    const r = Math.min(4, (base - top) / 2);
    const x0 = xs[i] - bw / 2;
    const x1 = xs[i] + bw / 2;
    return `<path class="bar" data-i="${i}" d="M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x1 - r}Q${x1},${top} ${x1},${top + r}V${base}Z"/>`;
  }).join('');
  const last = points.length - 1;
  const svg = frame(ticks, y, [[xs[0], points[0].label, 'middle'], [xs[last], points[last].label, 'end']])
    + bars
    + (points[last].y ? `<text class="value" x="${xs[last]}" y="${y(points[last].y) - 6}" text-anchor="middle">${points[last].y}</text>` : '');
  return wrap('bar', points, label, svg, xs);
}

/** Attach hover / tap tooltips to every chart inside root. */
export function bindCharts(root) {
  root.querySelectorAll('figure.chart').forEach((fig) => {
    const points = JSON.parse(fig.dataset.points);
    const xs = JSON.parse(fig.dataset.xs);
    const svg = fig.querySelector('svg');
    const tip = fig.querySelector('.tooltip');
    const cross = svg.querySelector('.cross');
    const show = (ev) => {
      const box = svg.getBoundingClientRect();
      const sx = ((ev.clientX - box.left) / box.width) * W;
      let i = 0;
      xs.forEach((x, k) => { if (Math.abs(x - sx) < Math.abs(xs[i] - sx)) i = k; });
      svg.querySelectorAll('.hot').forEach((n) => n.classList.remove('hot'));
      const mark = svg.querySelector(`[data-i="${i}"]`);
      if (mark) mark.classList.add('hot');
      if (cross) {
        cross.setAttribute('x1', xs[i]);
        cross.setAttribute('x2', xs[i]);
        cross.setAttribute('visibility', 'visible');
      }
      tip.innerHTML = `<b>${esc(fmt(points[i].y))}</b> <span>${esc(points[i].label)}</span>`;
      tip.hidden = false;
      fig.classList.add('hovering');
      const px = (xs[i] / W) * box.width;
      tip.style.left = `${Math.min(Math.max(px, 50), box.width - 50)}px`;
    };
    const hide = () => {
      tip.hidden = true;
      fig.classList.remove('hovering');
      if (cross) cross.setAttribute('visibility', 'hidden');
      svg.querySelectorAll('.hot').forEach((n) => n.classList.remove('hot'));
    };
    svg.addEventListener('pointermove', show);
    svg.addEventListener('pointerdown', show);
    svg.addEventListener('pointerleave', hide);
  });
}
