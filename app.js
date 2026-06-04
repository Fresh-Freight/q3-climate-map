// NOAA Q3 2026 Climate Outlook map
// Renders NOAA CPC probability contour polygons directly (smooth zones that
// flow across state boundaries the way NOAA's published seasonal outlook maps
// do), with state outlines drawn on top as a light reference grid.

const US_ATLAS_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
const TEMP_URL = "data/outlook-temp.geojson";
const PRECIP_URL = "data/outlook-precip.geojson";
const META_URL = "data/outlook-meta.json";

const VIEW_BOX = { width: 960, height: 600 };

const svg = d3.select("#map")
  .attr("viewBox", `0 0 ${VIEW_BOX.width} ${VIEW_BOX.height}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

const projection = d3.geoAlbersUsa().scale(1200).translate([VIEW_BOX.width / 2, VIEW_BOX.height / 2]);
const path = d3.geoPath(projection);

const defs = svg.append("defs");

const layers = {
  base: svg.append("g").attr("class", "layer-base"),
  overlay: svg.append("g").attr("class", "layer-overlay"),
  outline: svg.append("g").attr("class", "layer-outline")
};

let currentView = "temperature";
const outlook = { temperature: null, precipitation: null };

const legendEl = document.getElementById("legend");
const validEl = document.getElementById("valid-season");
const issuedEl = document.getElementById("issued-date");

Promise.all([
  d3.json(US_ATLAS_URL),
  d3.json(TEMP_URL),
  d3.json(PRECIP_URL),
  d3.json(META_URL)
]).then(([us, tempGeo, precipGeo, meta]) => {
  outlook.temperature = tempGeo;
  outlook.precipitation = precipGeo;

  renderMeta(meta);

  const states = topojson.feature(us, us.objects.states);
  const stateMesh = topojson.mesh(us, us.objects.states, (a, b) => a !== b);

  projection.fitSize([VIEW_BOX.width, VIEW_BOX.height], states);

  // Clip path: union of state geometries = US landmass. Overlay polygons are
  // clipped to this so contours stop at the coast instead of bleeding into the
  // ocean or off-map areas.
  defs.append("clipPath")
    .attr("id", "us-clip")
      .selectAll("path")
      .data(states.features)
      .join("path")
        .attr("d", path);

  layers.overlay.attr("clip-path", "url(#us-clip)");

  // Light base fill so EC / no-data areas read as land, not empty space.
  layers.base.selectAll("path.base-state")
    .data(states.features)
    .join("path")
      .attr("class", "base-state")
      .attr("d", path);

  drawOverlay();

  // State outlines on top of the fills, as a faint reference grid.
  layers.outline.append("path")
    .attr("class", "state-outline")
    .attr("d", path(stateMesh));

  drawLegend();
}).catch(err => {
  console.error("Failed to load map data:", err);
  svg.append("text")
    .attr("x", VIEW_BOX.width / 2)
    .attr("y", VIEW_BOX.height / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "#888")
    .style("font-family", "Open Sans, sans-serif")
    .text("Map data failed to load. Check your network and refresh.");
});

function renderMeta(meta) {
  if (!meta) return;
  if (validEl && meta.validSeasonLabel) validEl.textContent = meta.validSeasonLabel;
  if (issuedEl && meta.issueDate) {
    const d = new Date(meta.issueDate + "T00:00:00Z");
    issuedEl.textContent = d.toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric", timeZone: "UTC"
    });
  }
}

// Bin (Cat, Prob) to the discrete legend colors so the map matches the legend.
// Prob is the lower bound of the NOAA band: 33 → 33–40%, 40 → 40–50%, 50 → 50%+.
function colorFor(feature) {
  const cat = feature.properties.Cat;
  const prob = Number(feature.properties.Prob);
  if (!cat || cat === "EC") return COLOR_RAMP["near"];
  if (cat === "Above") {
    if (prob >= 50) return COLOR_RAMP["above-strong"];
    if (prob >= 40) return COLOR_RAMP["above-moderate"];
    return COLOR_RAMP["above-slight"];
  }
  if (cat === "Below") {
    if (prob >= 50) return COLOR_RAMP["below-strong"];
    if (prob >= 40) return COLOR_RAMP["below-moderate"];
    return COLOR_RAMP["below-slight"];
  }
  return COLOR_RAMP["near"];
}

function drawOverlay() {
  const geo = outlook[currentView];
  if (!geo) return;
  layers.overlay.selectAll("path.overlay-poly")
    .data(geo.features, (_, i) => i)
    .join("path")
      .attr("class", "overlay-poly")
      .attr("d", path)
      .attr("fill", d => colorFor(d));
}

function drawLegend() {
  legendEl.innerHTML = "";
  const items = currentView === "precipitation" ? LEGEND_PRECIP : LEGEND_TEMP;
  for (const item of items) {
    const row = document.createElement("div");
    row.className = "legend-row";
    const sw = document.createElement("span");
    sw.className = "legend-swatch";
    sw.style.background = COLOR_RAMP[item.cls];
    const lbl = document.createElement("span");
    lbl.className = "legend-label";
    lbl.textContent = item.label;
    row.appendChild(sw);
    row.appendChild(lbl);
    legendEl.appendChild(row);
  }
}

// Toggle wiring: fade overlay out, swap the contour set, fade back in.
document.querySelectorAll(".toggle").forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.getAttribute("data-view");
    if (view === currentView) return;
    currentView = view;
    document.querySelectorAll(".toggle").forEach(b => {
      const isActive = b.getAttribute("data-view") === view;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    layers.overlay.selectAll("path.overlay-poly")
      .transition().duration(200)
        .style("opacity", 0)
        .on("end", () => {
          drawOverlay();
          layers.overlay.selectAll("path.overlay-poly")
            .style("opacity", 0)
            .transition().duration(200)
              .style("opacity", 1);
        });

    drawLegend();
  });
});
