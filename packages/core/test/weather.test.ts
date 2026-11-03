import { describe, expect, it } from 'vitest';
import { STADIUMS, type WeatherForecast, gameStadium, teams, weatherNote } from '../src';

const calm: WeatherForecast = {
  at: new Date('2026-11-08T18:00:00Z'), temperatureF: 48, windMph: 6, gustMph: 11, precipChance: 10, precipIn: 0, snowIn: 0, weatherCode: 2,
};

describe('stadiums', () => {
  it('has a home stadium with coordinates for every team', () => {
    for (const t of teams) {
      const s = STADIUMS[t.id];
      expect(s, t.id).toBeDefined();
      expect(Math.abs(s!.lat)).toBeLessThan(90);
      expect(s!.lon).toBeLessThan(-60); // every home stadium is in the continental US
    }
  });

  it('falls back to no stadium at a neutral site', () => {
    expect(gameStadium({ homeTeamId: 'buf', neutralSite: false })).toMatchObject({ roof: 'open' });
    expect(gameStadium({ homeTeamId: 'buf', neutralSite: true })).toBeNull();
    expect(gameStadium({ homeTeamId: 'no', neutralSite: false })).toMatchObject({ roof: 'dome' });
  });
});

describe('weather note', () => {
  it('says nothing when the weather is not relevant', () => {
    expect(weatherNote(calm, 'open')).toBeNull();
    expect(weatherNote(null, 'open')).toBeNull();
    expect(weatherNote({ ...calm, windMph: 14.4, temperatureF: 25.6, precipChance: 49 }, 'open')).toBeNull();
  });

  it('never notes weather under a dome or a retractable roof', () => {
    const storm = { ...calm, windMph: 30, temperatureF: 10, precipChance: 90, snowIn: 2, weatherCode: 75 };
    expect(weatherNote(storm, 'dome')).toBeNull();
    expect(weatherNote(storm, 'retractable')).toBeNull();
    expect(weatherNote(storm, null)).toBeNull();
  });

  it('notes wind of 15 mph or more, with gusts when they run well above it', () => {
    expect(weatherNote({ ...calm, windMph: 14.6, gustMph: 17 }, 'open')).toBe('Wind 15 mph');
    expect(weatherNote({ ...calm, windMph: 18, gustMph: 27.2 }, 'open')).toBe('Wind 18 mph gusting to 27');
  });

  it('notes cold at 25°F or under', () => {
    expect(weatherNote({ ...calm, temperatureF: 25 }, 'open')).toBe('25°F');
    expect(weatherNote({ ...calm, temperatureF: -3.2 }, 'open')).toBe('-3°F');
  });

  it('notes rain at a 50% chance or more, and any snow', () => {
    expect(weatherNote({ ...calm, precipChance: 50, precipIn: 0.1, weatherCode: 61 }, 'open')).toBe('50% chance of rain');
    expect(weatherNote({ ...calm, precipChance: 30, snowIn: 0.4, weatherCode: 71 }, 'open')).toBe('30% chance of snow');
    expect(weatherNote({ ...calm, precipChance: null, weatherCode: 85 }, 'open')).toBe('Snow');
  });

  it('puts wind first, then precipitation, then cold', () => {
    expect(weatherNote({ ...calm, windMph: 18, gustMph: 27, precipChance: 70, snowIn: 1.2, temperatureF: 22, weatherCode: 73 }, 'open'))
      .toBe('Wind 18 mph gusting to 27, 70% chance of snow, 22°F');
  });
});
