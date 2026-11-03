// pull-weather: the kickoff forecast for every upcoming game at an open stadium in the next 7 days (core
// gameStadium(), WEATHER_WINDOW_DAYS), one free Open-Meteo request each. It follows each odds pull that takes a
// snapshot or a freeze, so it needs no cron of its own. game_weather keeps the latest forecast per game; it is
// context for the gem sheet and never moves a rating.
import { WEATHER_WINDOW_DAYS, gameStadium, weatherNote } from '@hiddengems/core';
import { gameWeather, games, isMissingTable } from '@hiddengems/db';
import { and, eq, gt, lt } from 'drizzle-orm';
import type { Job } from '../runner';
import { plural } from './shared';

const DAY = 86_400_000;
const int = (n: number | null) => (n == null ? null : Math.round(n));

export const pullWeather: Job = {
  name: 'pull-weather',
  provider: 'weather',
  async run(ctx) {
    const { db, now } = ctx;
    const provider = ctx.providers.weather;
    // Until migration 0008 runs there is nowhere to keep a forecast, so nothing is fetched.
    try {
      await db.select({ id: gameWeather.gameId }).from(gameWeather).limit(1);
    } catch (err) {
      if (isMissingTable(err)) return { skipped: 'Weather starts once migration 0008 has run' };
      throw err;
    }

    const upcoming = await db.select().from(games).where(and(
      gt(games.kickoffAt, now), lt(games.kickoffAt, new Date(now.getTime() + WEATHER_WINDOW_DAYS * DAY)), eq(games.status, 'scheduled'),
    ));
    const open = upcoming.flatMap((g) => {
      const stadium = gameStadium(g);
      return stadium?.roof === 'open' ? [{ game: g, stadium }] : [];
    });
    if (!open.length) return { skipped: `No games at open stadiums in the next ${WEATHER_WINDOW_DAYS} days` };

    const pctx = ctx.using(provider);
    const missing: string[] = [];
    let written = 0, noted = 0;
    for (const { game, stadium } of open) {
      const f = await provider.forecast(pctx, stadium, game.kickoffAt);
      if (!f) { missing.push(game.id); continue; }
      const row = {
        gameId: game.id, provider: provider.id, forecastAt: f.at, temperatureF: f.temperatureF, windMph: f.windMph, gustMph: f.gustMph,
        precipChance: int(f.precipChance), precipIn: f.precipIn, snowIn: f.snowIn, weatherCode: int(f.weatherCode), runId: ctx.runId, pulledAt: now,
      };
      const { gameId: _g, ...set } = row;
      await db.insert(gameWeather).values(row).onConflictDoUpdate({ target: gameWeather.gameId, set });
      written++;
      if (weatherNote(f, stadium.roof)) noted++;
    }
    if (missing.length) ctx.log('warn', `${plural(missing.length, 'game')} had no forecast near kickoff`, { gameIds: missing });
    return {
      message: `Pulled kickoff forecasts for ${plural(written, 'game')} at open stadiums, ${noted} with a weather note`,
      rowsWritten: written,
      meta: { games: open.map((o) => o.game.id), missing: missing.length, noted },
    };
  },
};
