export type ThemePreset =
  | "default"
  | "beach"
  | "mountain"
  | "sunset"
  | "forest"
  | "night-city";

export type ThemeDefinition = {
  id: ThemePreset;
  label: string;
  description: string;
  bgUrl: string | null;
  // Optional CSS variable overrides (HSL strings, no hsl() wrapper)
  primary?: string;
  primaryBorder?: string;
  accent?: string;
  accentBorder?: string;
  // How much the readability overlay covers the image. 0 = pure image,
  // 1 = fully obscured. Tuned per theme so text always stays legible.
  overlayOpacity: number;
};

const baseUrl = (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "/";
const asset = (path: string) =>
  `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

export const THEMES: Record<ThemePreset, ThemeDefinition> = {
  default: {
    id: "default",
    label: "Default",
    description: "Calm dark teal — the original Freedom look.",
    bgUrl: null,
    overlayOpacity: 0,
  },
  beach: {
    id: "beach",
    label: "Beach",
    description: "Turquoise water on warm sand.",
    bgUrl: asset("themes/beach.jpg"),
    primary: "188 70% 45%",
    primaryBorder: "hsl(188 70% 45% / 0.45)",
    accent: "185 75% 55%",
    accentBorder: "hsl(185 75% 55% / 0.45)",
    overlayOpacity: 0.78,
  },
  mountain: {
    id: "mountain",
    label: "Mountain",
    description: "Snow-capped peaks above a quiet river.",
    bgUrl: asset("themes/mountain.jpg"),
    primary: "210 50% 55%",
    primaryBorder: "hsl(210 50% 55% / 0.45)",
    accent: "200 55% 65%",
    accentBorder: "hsl(200 55% 65% / 0.45)",
    overlayOpacity: 0.8,
  },
  sunset: {
    id: "sunset",
    label: "Sunset",
    description: "Warm golden hour over the ocean.",
    bgUrl: asset("themes/sunset.png"),
    primary: "22 80% 58%",
    primaryBorder: "hsl(22 80% 58% / 0.45)",
    accent: "12 85% 65%",
    accentBorder: "hsl(12 85% 65% / 0.45)",
    overlayOpacity: 0.78,
  },
  forest: {
    id: "forest",
    label: "Forest",
    description: "Sun through bright green birch leaves.",
    bgUrl: asset("themes/forest.jpg"),
    primary: "148 50% 42%",
    primaryBorder: "hsl(148 50% 42% / 0.45)",
    accent: "140 55% 52%",
    accentBorder: "hsl(140 55% 52% / 0.45)",
    overlayOpacity: 0.82,
  },
  "night-city": {
    id: "night-city",
    label: "Night City",
    description: "Deep navy sky with glowing skyline.",
    bgUrl: asset("themes/night-city.png"),
    primary: "225 65% 62%",
    primaryBorder: "hsl(225 65% 62% / 0.45)",
    accent: "260 60% 68%",
    accentBorder: "hsl(260 60% 68% / 0.45)",
    overlayOpacity: 0.8,
  },
};

export const THEME_LIST: ThemeDefinition[] = [
  THEMES.default,
  THEMES.beach,
  THEMES.mountain,
  THEMES.sunset,
  THEMES.forest,
  THEMES["night-city"],
];

export function isThemePreset(value: unknown): value is ThemePreset {
  return typeof value === "string" && value in THEMES;
}
