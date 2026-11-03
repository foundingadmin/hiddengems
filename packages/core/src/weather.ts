// Weather for the environmental factors panel (docs/prd.md F2.5): each team's home stadium with its roof,
// and the one line worth showing when the kickoff forecast matters. Context only: nothing here moves a rating.

/** A retractable roof closes for bad weather, so only open stadiums get a forecast. */
export type Roof = 'dome' | 'retractable' | 'open';

export interface Stadium {
  name: string;
  lat: number;
  lon: number;
  roof: Roof;
}

/** Home stadiums for the 2026 season, by team id. SoFi's fixed roof counts as a dome. */
export const STADIUMS: Record<string, Stadium> = {
  ari: { name: 'State Farm Stadium', lat: 33.5276, lon: -112.2626, roof: 'retractable' },
  atl: { name: 'Mercedes-Benz Stadium', lat: 33.7554, lon: -84.4008, roof: 'retractable' },
  bal: { name: 'M&T Bank Stadium', lat: 39.278, lon: -76.6227, roof: 'open' },
  buf: { name: 'Highmark Stadium', lat: 42.7738, lon: -78.787, roof: 'open' },
  car: { name: 'Bank of America Stadium', lat: 35.2258, lon: -80.8528, roof: 'open' },
  chi: { name: 'Soldier Field', lat: 41.8623, lon: -87.6167, roof: 'open' },
  cin: { name: 'Paycor Stadium', lat: 39.0955, lon: -84.516, roof: 'open' },
  cle: { name: 'Huntington Bank Field', lat: 41.5061, lon: -81.6995, roof: 'open' },
  dal: { name: 'AT&T Stadium', lat: 32.7473, lon: -97.0945, roof: 'retractable' },
  den: { name: 'Empower Field at Mile High', lat: 39.7439, lon: -105.0201, roof: 'open' },
  det: { name: 'Ford Field', lat: 42.34, lon: -83.0456, roof: 'dome' },
  gb: { name: 'Lambeau Field', lat: 44.5013, lon: -88.0622, roof: 'open' },
  hou: { name: 'NRG Stadium', lat: 29.6847, lon: -95.4107, roof: 'retractable' },
  ind: { name: 'Lucas Oil Stadium', lat: 39.7601, lon: -86.1639, roof: 'retractable' },
  jax: { name: 'EverBank Stadium', lat: 30.3239, lon: -81.6373, roof: 'open' },
  kc: { name: 'GEHA Field at Arrowhead Stadium', lat: 39.0489, lon: -94.4839, roof: 'open' },
  lac: { name: 'SoFi Stadium', lat: 33.9535, lon: -118.3392, roof: 'dome' },
  lar: { name: 'SoFi Stadium', lat: 33.9535, lon: -118.3392, roof: 'dome' },
  lv: { name: 'Allegiant Stadium', lat: 36.0909, lon: -115.1833, roof: 'dome' },
  mia: { name: 'Hard Rock Stadium', lat: 25.958, lon: -80.2389, roof: 'open' },
  min: { name: 'U.S. Bank Stadium', lat: 44.9737, lon: -93.2575, roof: 'dome' },
  ne: { name: 'Gillette Stadium', lat: 42.0909, lon: -71.2643, roof: 'open' },
  no: { name: 'Caesars Superdome', lat: 29.9511, lon: -90.0812, roof: 'dome' },
  nyg: { name: 'MetLife Stadium', lat: 40.8135, lon: -74.0745, roof: 'open' },
  nyj: { name: 'MetLife Stadium', lat: 40.8135, lon: -74.0745, roof: 'open' },
  phi: { name: 'Lincoln Financial Field', lat: 39.9008, lon: -75.1675, roof: 'open' },
  pit: { name: 'Acrisure Stadium', lat: 40.4468, lon: -80.0158, roof: 'open' },
  sea: { name: 'Lumen Field', lat: 47.5952, lon: -122.3316, roof: 'open' },
  sf: { name: "Levi's Stadium", lat: 37.403, lon: -121.97, roof: 'open' },
  tb: { name: 'Raymond James Stadium', lat: 27.9759, lon: -82.5033, roof: 'open' },
  ten: { name: 'Nissan Stadium', lat: 36.1665, lon: -86.7713, roof: 'open' },
  was: { name: 'Northwest Stadium', lat: 38.9076, lon: -76.8645, roof: 'open' },
};

/** Where a game is played: the home team's stadium, or null at a neutral site (no weather). */
export function gameStadium(g: { homeTeamId: string; neutralSite: boolean }): Stadium | null {
  return g.neutralSite ? null : STADIUMS[g.homeTeamId] ?? null;
}

/** The forecast for the hour nearest kickoff. Any reading can be missing. */
export interface WeatherForecast {
  /** The forecast hour used. */
  at: Date;
  temperatureF: number | null;
  windMph: number | null;
  gustMph: number | null;
  /** Chance of precipitation, 0 to 100. */
  precipChance: number | null;
  precipIn: number | null;
  snowIn: number | null;
  /** WMO weather code, as Open-Meteo sends it. */
  weatherCode: number | null;
}

/** When the forecast is worth a line. */
export const WEATHER_LIMITS = { windMph: 15, coldF: 25, precipChance: 50, gustGapMph: 5 } as const;

/** Forecast days a pull covers: the odds week. */
export const WEATHER_WINDOW_DAYS = 7;

// WMO codes 71 to 77 and 85 to 86 are snow.
const isSnow = (f: WeatherForecast) =>
  (f.snowIn ?? 0) > 0 || (f.weatherCode != null && ((f.weatherCode >= 71 && f.weatherCode <= 77) || f.weatherCode === 85 || f.weatherCode === 86));

/**
 * A short context line when the weather is relevant at an open stadium ("Wind 18 mph gusting to 27, 70% chance
 * of snow, 22°F"), null otherwise. Domes and retractable roofs never get one.
 */
export function weatherNote(f: WeatherForecast | null, roof: Roof | null): string | null {
  if (!f || roof !== 'open') return null;
  const wind = f.windMph == null ? null : Math.round(f.windMph);
  const gust = f.gustMph == null ? null : Math.round(f.gustMph);
  const temp = f.temperatureF == null ? null : Math.round(f.temperatureF);
  const chance = f.precipChance == null ? null : Math.round(f.precipChance);
  const parts: string[] = [];
  if (wind != null && wind >= WEATHER_LIMITS.windMph) {
    parts.push(gust != null && gust >= wind + WEATHER_LIMITS.gustGapMph ? `wind ${wind} mph gusting to ${gust}` : `wind ${wind} mph`);
  }
  const wet = chance != null && chance >= WEATHER_LIMITS.precipChance;
  if (isSnow(f)) parts.push(chance != null ? `${chance}% chance of snow` : 'snow');
  else if (wet) parts.push(`${chance}% chance of rain`);
  if (temp != null && temp <= WEATHER_LIMITS.coldF) parts.push(`${temp}°F`);
  if (!parts.length) return null;
  const line = parts.join(', ');
  return line.charAt(0).toUpperCase() + line.slice(1);
}
