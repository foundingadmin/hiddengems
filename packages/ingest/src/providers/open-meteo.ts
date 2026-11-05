// Open-Meteo forecast API (https://open-meteo.com/en/docs): free for non-commercial use, no key, hourly
// forecasts up to 16 days out (data CC BY 4.0, Open-Meteo.com). One request per game asks for the two hours
// around kickoff in US units; the hour nearest kickoff is kept.
import type { WeatherForecast } from '@hiddengems/core';
import { z } from 'zod';
import { ours } from '../errors';
import type { WeatherProvider } from './types';

const BASE = 'https://api.open-meteo.com/v1/forecast';
const HOURLY = ['temperature_2m', 'wind_speed_10m', 'wind_gusts_10m', 'precipitation_probability', 'precipitation', 'snowfall', 'weather_code'] as const;
/** A forecast hour further than this from kickoff is not a kickoff forecast. */
const MAX_GAP_MS = 90 * 60_000;

const series = z.array(z.number().nullable());
const Forecast = z.object({
  utc_offset_seconds: z.number().optional(),
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: series,
    wind_speed_10m: series,
    wind_gusts_10m: series,
    precipitation_probability: series,
    precipitation: series,
    snowfall: series,
    weather_code: series,
  }),
});

/** The forecast hour nearest kickoff from an hourly payload, or null when none is within 90 minutes. */
export function normalizeForecast(payload: unknown, kickoff: Date): WeatherForecast | null {
  const r = Forecast.safeParse(payload);
  if (!r.success) throw ours('payload', `Open-Meteo forecast no longer matches our adapter: ${r.error.issues[0]?.message ?? 'invalid'}`, { provider: 'open-meteo' });
  const { hourly: h, utc_offset_seconds: offset = 0 } = r.data;
  // Times come without a zone, in the requested one (GMT); the offset makes them UTC either way.
  const times = h.time.map((t) => Date.parse(`${t}Z`) - offset * 1000);
  let best = -1;
  for (let i = 0; i < times.length; i++) {
    const gap = Math.abs(times[i]! - kickoff.getTime());
    if (Number.isFinite(gap) && gap <= MAX_GAP_MS && (best < 0 || gap < Math.abs(times[best]! - kickoff.getTime()))) best = i;
  }
  if (best < 0) return null;
  const at = (s: (number | null)[]) => s[best] ?? null;
  return {
    at: new Date(times[best]!),
    temperatureF: at(h.temperature_2m),
    windMph: at(h.wind_speed_10m),
    gustMph: at(h.wind_gusts_10m),
    precipChance: at(h.precipitation_probability),
    precipIn: at(h.precipitation),
    snowIn: at(h.snowfall),
    weatherCode: at(h.weather_code),
  };
}

/** "2026-11-08T18:00" in UTC, the hour format start_hour and end_hour take. */
const hour = (ms: number) => new Date(ms).toISOString().slice(0, 13) + ':00';

export function openMeteo(): WeatherProvider {
  return {
    id: 'open-meteo',
    async forecast(ctx, { lat, lon }, kickoff) {
      const start = Math.floor(kickoff.getTime() / 3_600_000) * 3_600_000;
      const params = new URLSearchParams({
        latitude: lat.toFixed(4), longitude: lon.toFixed(4), hourly: HOURLY.join(','),
        temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', precipitation_unit: 'inch', timezone: 'GMT',
        start_hour: hour(start), end_hour: hour(start + 3_600_000),
      });
      return normalizeForecast(await ctx.http.getJson(`${BASE}?${params}`), kickoff);
    },
  };
}
