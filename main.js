const STATUS_SHELVES = new Set(["read","currently-reading","to-read"]);
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function primaryGenre(shelves){
  if(!shelves) return "Unknown";
  const tags = shelves.split(",").map(t=>t.trim()).filter(t=>t && !STATUS_SHELVES.has(t.toLowerCase()));
  return tags.length ? tags[0].replace(/\b\w/g, c=>c.toUpperCase()) : "Unknown";
}

function parseGoodreadsDate(str){
  if(!str) return null;
  const d = new Date(str.replace(/\//g,"-"));
  return isNaN(d) ? null : d;
}

function cleanRows(rawRows){
  return rawRows.map(r => {
    const dateRead = parseGoodreadsDate(r["Date Read"]);
    const dateAdded = parseGoodreadsDate(r["Date Added"]);
    const myRating = +r["My Rating"] || null;
    return {
      title: r["Title"],
      author: r["Author"],
      myRating: myRating > 0 ? myRating : null,
      pages: +r["Number of Pages"] || null,
      dateRead, dateAdded,
      shelf: r["Exclusive Shelf"],
      genre: primaryGenre(r["Bookshelves"]),
      readMonth: dateRead ? dateRead.toISOString().slice(0,7) : null,
    };
  });
}

function computeInsights(rows){
  const read = rows.filter(r => r.shelf === "read");
  const total = rows.length;
  const totalRead = read.length;
  const dnfRate = total ? Math.round((total - totalRead) / total * 1000)/10 : 0;
  const rated = read.filter(r => r.myRating);
  const avgRating = rated.length ? (d3.mean(rated, r=>r.myRating)).toFixed(2) : "—";

  const byMonth = d3.rollup(read.filter(r=>r.readMonth), v=>v.length, r=>r.readMonth);
  const velocity = Array.from(byMonth, ([month,count]) => ({month,count})).sort((a,b)=>a.month.localeCompare(b.month));

  const byGenre = d3.rollup(read, v=>v.length, r=>r.genre);
  const genreDist = Array.from(byGenre, ([genre,count]) => ({genre,count}))
    .sort((a,b)=>b.count-a.count).slice(0,8);

  const uniqueGenres = new Set(read.map(r=>r.genre)).size;
  let persona = "Completionist";
  if(total && (total-totalRead)/total > 0.3) persona = "Sampler";
  else if(uniqueGenres <= 2 && totalRead > 5) persona = "Specialist";
  else if(totalRead > 20) persona = "Binger";

  return {total, totalRead, dnfRate, avgRating, velocity, genreDist, persona};
}

function renderStats(insights){
  const grid = d3.select("#stat-grid");
  grid.selectAll("*").remove();
  const stats = [
    {label:"Books logged", value: insights.total},
    {label:"Finished", value: insights.totalRead},
    {label:"Didn't finish", value: insights.dnfRate + "%"},
    {label:"Avg rating given", value: insights.avgRating},
  ];
  const s = grid.selectAll(".stat").data(stats).join("div").attr("class","stat");
  s.append("span").attr("class","num").text(d=>d.value);
  s.append("span").attr("class","label").text(d=>d.label);
  d3.select("#persona-tag").text(insights.persona);
}

// Generic: watch a container, run reveal() once when it enters the viewport.
function onScrollReveal(containerId, reveal){
  const el = document.getElementById(containerId);
  if(!el) return;
  if(REDUCED_MOTION){ reveal(); return; }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        reveal();
        observer.unobserve(entry.target);
      }
    });
  }, {threshold: 0.25});
  observer.observe(el);
}

function renderVelocity(velocity){
  const svg = d3.select("#velocity-chart");
  svg.selectAll("*").remove();
  if(!velocity.length){
    svg.attr("width",900).attr("height",60);
    svg.append("text").attr("x",10).attr("y",30).text("No dated books to plot yet.");
    return;
  }
  const margin = {top:20,right:20,bottom:40,left:36};
  const width = 860, height = 260;
  svg.attr("width", width+margin.left+margin.right).attr("height", height+margin.top+margin.bottom);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(velocity.map(d=>d.month)).range([0,width]).padding(0.25);
  const y = d3.scaleLinear().domain([0, d3.max(velocity,d=>d.count)]).nice().range([height,0]);

  g.append("g").attr("class","axis").attr("transform",`translate(0,${height})`)
    .call(d3.axisBottom(x).tickValues(x.domain().filter((d,i)=> i % Math.ceil(velocity.length/12) === 0)))
    .selectAll("text").attr("transform","rotate(-40)").style("text-anchor","end");
  g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(4));

  const tooltip = d3.select("#tooltip");
  const bars = g.selectAll(".bar").data(velocity).join("rect")
    .attr("class","bar")
    .attr("x", d=>x(d.month))
    .attr("width", x.bandwidth())
    .attr("y", height)
    .attr("height", 0)
    .on("mousemove", (event,d) => {
      tooltip.style("opacity",1)
        .style("left", (event.pageX+12)+"px").style("top",(event.pageY-24)+"px")
        .text(`${d.month}: ${d.count} book${d.count===1?"":"s"}`);
    })
    .on("mouseleave", () => tooltip.style("opacity",0));

  onScrollReveal("velocity-box", () => {
    bars.transition().duration(650).delay((d,i)=>i*18).ease(d3.easeCubicOut)
      .attr("y", d=>y(d.count))
      .attr("height", d=>height - y(d.count));
  });
}

function renderGenres(genreDist){
  const svg = d3.select("#genre-chart");
  svg.selectAll("*").remove();
  if(!genreDist.length){
    svg.attr("width",900).attr("height",60);
    svg.append("text").attr("x",10).attr("y",30).text("No genre data yet.");
    return;
  }
  const margin = {top:10,right:30,bottom:10,left:130};
  const width = 750, rowH = 32;
  const height = genreDist.length * rowH;
  svg.attr("width", width+margin.left+margin.right).attr("height", height+margin.top+margin.bottom);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const y = d3.scaleBand().domain(genreDist.map(d=>d.genre)).range([0,height]).padding(0.3);
  const x = d3.scaleLinear().domain([0, d3.max(genreDist,d=>d.count)]).nice().range([0,width]);

  g.selectAll(".label").data(genreDist).join("text")
    .attr("x",-10).attr("y", d=>y(d.genre)+y.bandwidth()/2)
    .attr("dy","0.35em").attr("text-anchor","end").text(d=>d.genre);

  const tooltip = d3.select("#tooltip");
  const bars = g.selectAll(".bar").data(genreDist).join("rect")
    .attr("class","bar")
    .attr("x",0).attr("y", d=>y(d.genre))
    .attr("width", 0)
    .attr("height", y.bandwidth())
    .on("mousemove", (event,d) => {
      tooltip.style("opacity",1)
        .style("left", (event.pageX+12)+"px").style("top",(event.pageY-24)+"px")
        .text(`${d.genre}: ${d.count}`);
    })
    .on("mouseleave", () => tooltip.style("opacity",0));

  onScrollReveal("genre-box", () => {
    bars.transition().duration(650).delay((d,i)=>i*40).ease(d3.easeCubicOut)
      .attr("width", d=>x(d.count));
  });
}

function renderAll(rows, label, isDemo){
  const cleaned = cleanRows(rows);
  const insights = computeInsights(cleaned);
  renderStats(insights);
  renderVelocity(insights.velocity);
  renderGenres(insights.genreDist);
  const status = d3.select("#status-line");
  status.classed("demo", !!isDemo).text(label);
}

function makeSyntheticSample(n=40){
  const genres = ["Fantasy","Sci-Fi","Nonfiction","Memoir","Literary Fiction","Thriller"];
  const authors = Array.from({length:15}, (_,i)=>`Author ${i}`);
  const rows = [];
  const start = new Date(2023,0,1).getTime();
  for(let i=0;i<n;i++){
    const added = new Date(start + Math.random()*900*86400000);
    const finished = new Date(added.getTime() + (2+Math.random()*43)*86400000);
    const roll = Math.random();
    const shelf = roll<0.6?"read": roll<0.75?"currently-reading": roll<0.85?"read":"to-read";
    rows.push({
      "Title": `Sample Book ${i}`,
      "Author": authors[Math.floor(Math.random()*authors.length)],
      "My Rating": String(Math.floor(Math.random()*6)),
      "Average Rating": (3.2+Math.random()*1.4).toFixed(2),
      "Number of Pages": String(150+Math.floor(Math.random()*500)),
      "Date Read": shelf==="read" ? finished.toISOString().slice(0,10).replace(/-/g,"/") : "",
      "Date Added": added.toISOString().slice(0,10).replace(/-/g,"/"),
      "Bookshelves": genres[Math.floor(Math.random()*genres.length)],
      "Exclusive Shelf": shelf,
    });
  }
  return rows;
}

function handleFile(file){
  const status = d3.select("#status-line");
  status.classed("demo", false).text(`Parsing ${file.name}...`);
  const reader = new FileReader();
  reader.onload = (e) => {
    try{
      const rows = d3.csvParse(e.target.result);
      const required = ["Title","My Rating","Number of Pages","Date Read","Date Added","Bookshelves","Exclusive Shelf"];
      const missing = required.filter(c => !(c in rows.columns));
      if(missing.length){
        status.text(`This doesn't look like a Goodreads export — missing: ${missing.join(", ")}`);
        return;
      }
      renderAll(rows, `Loaded ${rows.length} books from ${file.name}`, false);
    }catch(err){
      status.text("Couldn't parse that file. Make sure it's the raw Goodreads export CSV.");
    }
  };
  reader.readAsText(file);
}

/**
 * Taste Map Visualization — SCAFFOLD
 * ------------------------------------
 * Fill in each TODO. This expects taste_map.json (produced by
 * taste_map_pipeline.py) to already exist alongside your site files.
 *
 * Expected shape of the loaded data — see export_taste_map() in the
 * Python scaffold for exactly what each field is:
 *   {
 *     points: [{title, author, x, y, cluster, my_rating, read_year}, ...],
 *     centroid: {x, y},
 *     cluster_labels: {"0": "...", "1": "...", ...},
 *     trajectory: [{title, x, y, read_year}, ...]
 *   }
 */

async function loadTasteMap() {
  // TODO: fetch("taste_map.json"), parse it, return the object.
  // What happens if the file doesn't exist yet? Decide what the
  // page should show (nothing? a message?) rather than letting
  // an unhandled promise rejection break the whole page.
}

function renderScatter(svg, data) {
  /**
   * Draw one circle per book in data.points, positioned by x/y,
   * colored by cluster.
   *
   * Think about:
   * - d3.scaleLinear for mapping your x/y data range to pixel
   *   coordinates within the SVG's actual width/height (the raw
   *   x/y from PCA/UMAP won't be in pixel units)
   * - d3.scaleOrdinal (or just an array you index into) for mapping
   *   cluster id -> a color from your site's palette
   * - what should happen on hover? You already built tooltip logic
   *   for the velocity/genre charts in main.js — this can reuse
   *   that same pattern.
   *
   * TODO: implement the D3 join (selectAll(".point").data(...).join(...))
   * and the scales it depends on.
   */
}

function renderCentroid(svg, data) {
  /**
   * Draw a single, visually distinct marker (different shape or size
   * than the book points) at data.centroid — this is "the center of
   * your taste," and should read as clearly different from an
   * individual book.
   *
   * TODO: append one marker using the SAME x/y scales as renderScatter
   * (create the scales once, pass them into both functions, rather
   * than rebuilding them twice with potentially different domains).
   */
}

function renderTrajectory(svg, data) {
  /**
   * Connect data.trajectory points, in order, with a line — this
   * shows the path your taste took over time.
   *
   * Look up: d3.line(), which takes an accessor for x and y and
   * returns a path-generator function you call on your data array.
   *
   * Think about: should the line be drawn all at once, or animated
   * in (stroke-dasharray/stroke-dashoffset trick) the way your bar
   * charts animate on scroll? Not required for a first version —
   * get it rendering as a static line first.
   *
   * TODO: build the line generator, append a single <path> using it.
   */
}

function renderClusterLegend(container, data) {
  /**
   * Show what each color means — data.cluster_labels maps cluster id
   * to a human-readable name your Python pipeline generated.
   *
   * TODO: render a small legend (color swatch + label) for each
   * entry in cluster_labels. Keep it simple — a flex row of
   * swatch+text pairs is enough, doesn't need to be fancy.
   */
}

function showBookDetail(book) {
  /**
   * Called when a point is clicked — show that book's info somewhere
   * on the page (title, author, rating, which cluster it belongs to).
   *
   * TODO: decide where this appears — a fixed panel that updates in
   * place is simpler to build than a modal, and avoids needing to
   * manage open/close state.
   */
}

async function initTasteMap() {
  const data = await loadTasteMap();
  if (!data) return;

  const svg = d3.select("#taste-map-chart");
  // TODO: set svg width/height/viewBox to match your site's chart
  // sizing conventions (see renderVelocity/renderGenres in main.js
  // for the pattern you've already established).

  renderScatter(svg, data);
  renderCentroid(svg, data);
  renderTrajectory(svg, data);
  renderClusterLegend(document.getElementById("taste-map-legend"), data);

  // TODO: wire up click handlers on each point to call showBookDetail.
  // Where in renderScatter should this listener be attached?
}

// TODO: call initTasteMap() — but only once the taste map section
// scrolls into view, the same way your bar charts wait for
// onScrollReveal() rather than rendering immediately on page load.

// wire up import controls
d3.select("#file-btn").on("click", () => document.getElementById("file-input").click());
d3.select("#file-input").on("change", function(){
  if(this.files[0]) handleFile(this.files[0]);
});
const dropZone = document.getElementById("drop-zone");
["dragenter","dragover"].forEach(evt => dropZone.addEventListener(evt, e => {
  e.preventDefault(); dropZone.classList.add("dragover");
}));
["dragleave","drop"].forEach(evt => dropZone.addEventListener(evt, e => {
  e.preventDefault(); dropZone.classList.remove("dragover");
}));
dropZone.addEventListener("drop", e => {
  if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

// initial demo render
renderAll(makeSyntheticSample(), "Showing sample data — import your own to replace it.", true);

// ---------------------------------------------------------------------
// Section navigation: click anywhere (outside interactive controls) to
// advance, plus a toolbar for home / back / forward.
// ---------------------------------------------------------------------
const slides = Array.from(document.querySelectorAll(".slide"));
let currentIndex = 0;

function updateToolbar(){
  document.getElementById("nav-position").textContent = `${currentIndex+1}/${slides.length}`;
  document.getElementById("nav-prev").disabled = currentIndex === 0;
  document.getElementById("nav-next").disabled = currentIndex === slides.length - 1;
}

function goTo(index){
  const clamped = Math.max(0, Math.min(slides.length - 1, index));
  slides[clamped].scrollIntoView({behavior: REDUCED_MOTION ? "auto" : "smooth"});
}

// Track which slide is most in view (for toolbar state + click-advance target)
const slideObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(entry.isIntersecting && entry.intersectionRatio > 0.5){
      currentIndex = slides.indexOf(entry.target);
      updateToolbar();
    }
  });
}, {threshold: [0.5]});
slides.forEach(s => slideObserver.observe(s));

document.addEventListener("click", (e) => {
  if(e.target.closest(".no-advance")) return;
  goTo(currentIndex + 1);
});

document.getElementById("nav-home").addEventListener("click", (e) => { e.stopPropagation(); goTo(0); });
document.getElementById("nav-prev").addEventListener("click", (e) => { e.stopPropagation(); goTo(currentIndex - 1); });
document.getElementById("nav-next").addEventListener("click", (e) => { e.stopPropagation(); goTo(currentIndex + 1); });

document.addEventListener("keydown", (e) => {
  if(["ArrowDown","ArrowRight","PageDown"].includes(e.key)){ e.preventDefault(); goTo(currentIndex+1); }
  else if(["ArrowUp","ArrowLeft","PageUp"].includes(e.key)){ e.preventDefault(); goTo(currentIndex-1); }
  else if(e.key === "Home"){ e.preventDefault(); goTo(0); }
});

updateToolbar();

// ---------------------------------------------------------------------
// Full-page gradient: mouse/touch-reactive background behind everything.
// ---------------------------------------------------------------------
const bgStage = document.getElementById("bg-stage");
if(bgStage){
  const gTarget = {x: 0.5, y: 0.5};
  const gCurrent = {x: 0.5, y: 0.5};
  const lerp = (a,b,t) => a + (b-a)*t;

  function animateBgGradient(){
    gCurrent.x = lerp(gCurrent.x, gTarget.x, 0.04);
    gCurrent.y = lerp(gCurrent.y, gTarget.y, 0.04);
    const {x, y} = gCurrent;

    const h1 = Math.round(x * 40 + 180);
    const h2 = Math.round(y * 40 + 220);
    const h3 = Math.round((x + y) * 15 + 245);
    const h4 = Math.round((1 - x) * 30 + 165);
    const s = 32 + x * 10;
    const l1 = 70 + y * 6;
    const l2 = 74 + (1 - y) * 6;

    bgStage.style.setProperty("--h1", h1);
    bgStage.style.setProperty("--h2", h2);
    bgStage.style.setProperty("--h3", h3);
    bgStage.style.setProperty("--h4", h4);
    bgStage.style.setProperty("--s", `${Math.round(s)}%`);
    bgStage.style.setProperty("--l1", `${Math.round(l1)}%`);
    bgStage.style.setProperty("--l2", `${Math.round(l2)}%`);
    bgStage.style.setProperty("--gx", `${Math.round(x*100)}%`);
    bgStage.style.setProperty("--gy", `${Math.round(y*100)}%`);

    requestAnimationFrame(animateBgGradient);
  }

  window.addEventListener("mousemove", (e) => {
    gTarget.x = e.clientX / window.innerWidth;
    gTarget.y = e.clientY / window.innerHeight;
  });
  window.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    if(!t) return;
    gTarget.x = t.clientX / window.innerWidth;
    gTarget.y = t.clientY / window.innerHeight;
  }, {passive: true});

  if(!REDUCED_MOTION){
    requestAnimationFrame(animateBgGradient);
  }
}