// The kickoff forecast for one game, for the gem sheet's environmental factors (docs/prd.md F2.5). Reads null
// while the game_weather migration (0008) has not run, or when the game has no forecast (a dome, a retractable
// roof, a neutral site, or a kickoff beyond the forecast window).
import { type Stadium, type WeatherForecast, gameStadium, weatherNote } from '@hiddengems/core';
import { eq } from 'drizzle-orm';
import { type Db, isMissingTable } from './client';
import { games, gameWeather } from './schema';

export interface GameWeather {
  forecast: WeatherForecast;
  stadium: Stadium | null;
  /** The context line when the weather is relevant (core weatherNote()), else null. */
  note: string | null;
  provider: string;
  pulledAt: Date;
}

export async function getGameWeather(db: Db, gameId: string): Promise<GameWeather | null> {
  try {
    const [row] = await db.select({ w: gameWeather, homeTeamId: games.homeTeamId, neutralSite: games.neutralSite })
      .from(gameWeather).innerJoin(games, eq(games.id, gameWeather.gameId)).where(eq(gameWeather.gameId, gameId));
    if (!row) return null;
    const { w } = row;
    const forecast: WeatherForecast = {
      at: w.forecastAt, temperatureF: w.temperatureF, windMph: w.windMph, gustMph: w.gustMph,
      precipChance: w.precipChance, precipIn: w.precipIn, snowIn: w.snowIn, weatherCode: w.weatherCode,
    };
    const stadium = gameStadium(row);
    return { forecast, stadium, note: weatherNote(forecast, stadium?.roof ?? null), provider: w.provider, pulledAt: w.pulledAt };
  } catch (err) {
    if (isMissingTable(err)) return null;
    throw err;
  }
}
