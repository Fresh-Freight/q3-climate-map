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
//   1. Temperature  - drop the below-normal zone over Illinois/Wisconsin.
//   2. Precipitation - shift the upper-Midwest below-normal zone west + south
//                      so it sits over Minnesota, the Dakotas and Nebraska.

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

// 1. Temperature: remove the below-normal blotch over Illinois / Wisconsin.
const temp = load(TEMP);
const beforeT = temp.features.length;
temp.features = temp.features.filter(f => {
  if (f.properties.Cat !== "Below") return true;
  const [lon, lat] = centroid(f.geometry.coordinates);
  const isIlWi = lon > -96 && lon < -84 && lat > 38 && lat < 46;
  return !isIlWi;
});
save(TEMP, temp);
console.log(`temp: removed ${beforeT - temp.features.length} below-normal zone(s) over IL/WI`);

// 2. Precipitation: shift the upper-Midwest below-normal zone west + south
//    (over Wisconsin -> over Minnesota / Dakotas / Nebraska).
const D_LON = -8.5, D_LAT = -2.5;
const precip = load(PRECIP);
let shifted = 0;
for (const f of precip.features) {
  if (f.properties.Cat !== "Below") continue;
  const [lon, lat] = centroid(f.geometry.coordinates);
  const isUpperMidwest = lon > -96 && lon < -83 && lat > 43 && lat < 50;
  if (isUpperMidwest) {
    f.geometry.coordinates = translate(f.geometry.coordinates, D_LON, D_LAT);
    shifted++;
  }
}
save(PRECIP, precip);
console.log(`precip: shifted ${shifted} below-normal zone(s) by (${D_LON}, ${D_LAT}) toward MN/Dakotas/NE`);
