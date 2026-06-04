// Color ramp + legend definitions for the NOAA CPC seasonal outlook map.
//
// The map itself is driven entirely by the NOAA CPC contour polygons in
// data/outlook-temp.geojson and data/outlook-precip.geojson (parsed from the
// published lead2_JAS_*.shp shapefiles). Each polygon carries a Cat field
// (Above / Below / EC) and a Prob field whose value is the LOWER bound of the
// NOAA probability band (33 → 33–40%, 40 → 40–50%, 50 → 50–60%, …).
//
// Classification keys map to the brand color ramp:
//   above-strong   #3a6b22   (50%+ probability above-normal)
//   above-moderate #7cb854   (40–50%)
//   above-slight   #a8d490   (33–40%)
//   near           #e5e5e5   (equal chances, 33%)
//   below-slight   #ffd4a8   (33–40% below)
//   below-moderate #f4a564   (40–50% below)
//   below-strong   #ec7700   (50%+ below)

const COLOR_RAMP = {
  "above-strong":   "#3a6b22",
  "above-moderate": "#7cb854",
  "above-slight":   "#a8d490",
  "near":           "#e5e5e5",
  "below-slight":   "#ffd4a8",
  "below-moderate": "#f4a564",
  "below-strong":   "#ec7700"
};

const LEGEND_TEMP = [
  { cls: "above-strong",   label: "Above-normal 50%+" },
  { cls: "above-moderate", label: "Above-normal 40–50%" },
  { cls: "above-slight",   label: "Above-normal 33–40%" },
  { cls: "near",           label: "Equal chances" },
  { cls: "below-slight",   label: "Below-normal 33–40%" },
  { cls: "below-moderate", label: "Below-normal 40–50%" },
  { cls: "below-strong",   label: "Below-normal 50%+" }
];

const LEGEND_PRECIP = [
  { cls: "above-strong",   label: "Above-normal 50%+" },
  { cls: "above-moderate", label: "Above-normal 40–50%" },
  { cls: "above-slight",   label: "Above-normal 33–40%" },
  { cls: "near",           label: "Equal chances" },
  { cls: "below-slight",   label: "Below-normal 33–40%" },
  { cls: "below-moderate", label: "Below-normal 40–50%" },
  { cls: "below-strong",   label: "Below-normal 50%+" }
];
