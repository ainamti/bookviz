// Mouse/touch-reactive gradient background — plain JS port of the React version.
// No build step, no npm install — just a <script> tag.

const stage = document.getElementById("gradient-stage");

const target = { x: 0.5, y: 0.5 };
const current = { x: 0.5, y: 0.5 };
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function animate() {
  current.x = lerp(current.x, target.x, 0.04);
  current.y = lerp(current.y, target.y, 0.04);
  const { x, y } = current;

  // Calming range: teal -> blue -> soft violet/lavender, no reds or hot pinks
  const h1 = Math.round(x * 40 + 180);        // 180-220: teal to blue
  const h2 = Math.round(y * 40 + 220);        // 220-260: blue to blue-violet
  const h3 = Math.round((x + y) * 15 + 245);  // 245-275: violet to lavender
  const h4 = Math.round((1 - x) * 30 + 165);  // 165-195: soft teal/cyan
  const s = 42 + x * 12;                       // 42-54%: muted, not saturated
  const l1 = 54 + y * 8;                       // 54-62%
  const l2 = 58 + (1 - y) * 8;                 // 58-66%
  const gx = Math.round(x * 100);
  const gy = Math.round(y * 100);

  if (stage) {
    stage.style.setProperty("--h1", h1);
    stage.style.setProperty("--h2", h2);
    stage.style.setProperty("--h3", h3);
    stage.style.setProperty("--h4", h4);
    stage.style.setProperty("--s", `${Math.round(s)}%`);
    stage.style.setProperty("--l1", `${Math.round(l1)}%`);
    stage.style.setProperty("--l2", `${Math.round(l2)}%`);
    stage.style.setProperty("--gx", `${gx}%`);
    stage.style.setProperty("--gy", `${gy}%`);
  }

  requestAnimationFrame(animate);
}

window.addEventListener("mousemove", (e) => {
  target.x = e.clientX / window.innerWidth;
  target.y = e.clientY / window.innerHeight;
});

window.addEventListener(
  "touchmove",
  (e) => {
    const t = e.touches[0];
    if (!t) return;
    target.x = t.clientX / window.innerWidth;
    target.y = t.clientY / window.innerHeight;
  },
  { passive: true }
);

if (reducedMotion) {
  // Set a single calm state and skip the animation loop entirely.
  if (stage) {
    stage.style.setProperty("--h1", 200);
    stage.style.setProperty("--h2", 240);
    stage.style.setProperty("--h3", 260);
    stage.style.setProperty("--h4", 180);
    stage.style.setProperty("--s", "48%");
    stage.style.setProperty("--l1", "58%");
    stage.style.setProperty("--l2", "62%");
  }
} else {
  requestAnimationFrame(animate);
}