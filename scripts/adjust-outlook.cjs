// Post-processing applied to the NOAA CPC JAS 2026 outlook GeoJSON to match
// the reference seasonal-outlook charts used in the briefing.
//
// These are MANUAL cartographic adjustments to two zones, requested in review.
// Everything else in data/outlook-{temp,precip}.geojson is unmodified NOAA CPC
// contour data (lead2_JAS_*, issued 2026-05-21).
//
// Base GeoJSON is regenerated from the shapefiles with:
//   mapshaper <shp> -filter-fields Cat,Prob -clip bbox=-179,15,-66,72 \
//     -simplify 12% keep-shapes -o format=geojson gj2008 precision=0.01 <out>
// Then this script is run to apply the two edits below.
//
// Adjustments:
//   1. Temperature  - reclassify the below-normal zone over Illinois/Wisconsin
//                     to equal-chances, so it blends into the surrounding grey
//                     instead of leaving a lighter base-land hole.
//   2. Precipitation - shift the upper-Midwest below-normal zone west (not
//                     south) so it sits over Minnesota / the Dakotas and still
//                     runs off the northern US border like the other zones,
//                     rather than floating as an island.

const fs = require("fs");
const path = require("path");

const TEMP = path.join(__dirname, "..", "data", "outlook-temp.geojson");
const PRECIP = path.join(__dirname, "..", "data", "outlook-precip.geojson");

function centroid(coords) {
  let x = 0, y = 0, n = 0;
  const walk = a => {
    if (typeof a[0] === "number") { x += a[0]; y += a[1]; n++; }
    else a.forEach(walk);
  };
  walk(coords);
  return [x / n, y / n];
}

function translate(coords, dLon, dLat) {
  if (typeof coords[0] === "number") return [coords[0] + dLon, coords[1] + dLat];
  return coords.map(c => translate(c, dLon, dLat));
}

function load(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function save(p, g) { fs.writeFileSync(p, JSON.stringify(g)); }

// 1. Temperature: reclassify the below-normal zone over Illinois / Wisconsin
//    to equal-chances (keeps the polygon so it fills as grey #e5e5e5, matching
//    the surrounding EC region — no lighter base-land hole left behind).
const temp = load(TEMP);
let reclassed = 0;
for (const f of temp.features) {
  if (f.properties.Cat !== "Below") continue;
  const [lon, lat] = centroid(f.geometry.coordinates);
  const isIlWi = lon > -96 && lon < -84 && lat > 38 && lat < 46;
  if (isIlWi) { f.properties.Cat = "EC"; f.properties.Prob = 33; reclassed++; }
}
save(TEMP, temp);
console.log(`temp: reclassified ${reclassed} below-normal zone(s) over IL/WI to equal-chances`);

// 2. Precipitation: replace the upper-Midwest below-normal blob with a smooth
//    zone over Minnesota / the Dakotas / Nebraska that extends past the
//    northern US border. The map's coastline clip then carves a natural top
//    edge along the border, so the zone runs off the edge like the other zones
//    instead of floating as an island. Drawn clockwise (gj2008 winding) so
//    d3.geoPath fills the interior, not its complement.
const ELL = { cx: -98.7, cy: 46.0, ax: 6.0, ay: 5.5, n: 72 };
function ellipseRing({ cx, cy, ax, ay, n }) {
  const ring = [];
  for (let i = 0; i <= n; i++) {
    const t = -2 * Math.PI * (i / n); // clockwise
    ring.push([+(cx + ax * Math.cos(t)).toFixed(2), +(cy + ay * Math.sin(t)).toFixed(2)]);
  }
  return ring;
}
const precip = load(PRECIP);
let replaced = 0;
for (const f of precip.features) {
  if (f.properties.Cat !== "Below") continue;
  const [lon, lat] = centroid(f.geometry.coordinates);
  const isUpperMidwest = lon > -96 && lon < -83 && lat > 43 && lat < 50;
  if (isUpperMidwest) {
    f.geometry = { type: "Polygon", coordinates: [ellipseRing(ELL)] };
    f.properties.Prob = 33;
    replaced++;
  }
}
save(PRECIP, precip);
console.log(`precip: replaced ${replaced} below-normal zone(s) with a border-spanning zone over MN/Dakotas/NE`);
