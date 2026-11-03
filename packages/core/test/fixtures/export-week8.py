# Rebuilds week8.json: nflverse usage through Week 8 Sunday and what hgs.py v3.0 (ops/pipeline/hgs.py)
# computed from it for the Week 8 board (CHI @ SEA). Usage, from the repo root:
#   python3 packages/core/test/fixtures/export-week8.py <nflcache dir> <picks.json>
# <nflcache dir> holds the nflverse 2026 release files hgs.py reads (play_by_play_2026.csv.gz,
# snap_counts_2026.csv, injuries_2026.csv, players.csv) plus games_nfldata.csv (schedules/games.csv).
# <picks.json> is the shadow pipeline's picks file, for the Week 8 board's prices.
import json, sys, os, shutil, math
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'ops/pipeline'))
import hgs, pandas as pd, numpy as np
C, PICKS = sys.argv[1], sys.argv[2]
OUT = os.path.join(ROOT, 'packages/core/test/fixtures/week8.json')
hgs.urllib.request.urlretrieve = lambda url, p: shutil.copy(os.path.join(C, 'games_nfldata.csv'), p)
ctx = hgs.stats_ctx(C, 2026); agg = ctx['agg']; logs = ctx['logs']
# team/position by latest week vs pandas .last() (row order)
lat = logs.sort_values('week', kind='stable').groupby('gsis').last()
diff = [(g, agg.loc[g].team, lat.loc[g].team) for g in agg.index if agg.loc[g].team != lat.loc[g].team or agg.loc[g].position != lat.loc[g].position]
print('last() vs latest-week differences:', diff)
nn = lambda v: None if (v is None or (isinstance(v, float) and math.isnan(v))) else float(v)
L = [[r.gsis, r.game_id, int(r.week), r.team, r.position, nn(r.snap_pct), int(r.rz_carries), int(r.rz_targets), int(r.rzc_td), int(r.rzt_td), int(r.tds)] for r in logs.itertuples()]
g = pd.read_csv(os.path.join(C, 'games_nfldata.csv')); g = g[(g.season == 2026) & (g.game_type == 'REG') & (g.week <= 8)]
lines = [[r.game_id, int(r.week), r.home_team, r.away_team, nn(r.spread_line), nn(r.total_line)] for r in g.itertuples()]
picks = json.load(open(PICKS))['rows']
REV = {v: k for k, v in hgs.SHORT.items()}
board = []
for r in picks:
    if r.get('week') != 8 or r['source'] != 'Board': continue
    books = {REV[b.split(' ')[0]]: float(b.split(' ')[1]) for b in r['books_txt'].split(' · ')}
    price = books.get('DraftKings') or max(books.values()); ip = 1 / price; fair = ip * (1 - min(0.35, 0.05 + 0.01 * price))
    gs = hgs.match(ctx, r['player'], r['game'])
    row = dict(player=r['player'], game=r['game'], gsis=gs, price=price, books=list(books.values()), injury=ctx['inj'].get(gs) if gs else None)
    if gs is None:
        row['expected'] = dict(hitChance=fair, hasStats=False)
    else:
        ps, hit, a = hgs.stats_prob(ctx, gs)
        w = (0.5 if a.games >= 4 else 0.3) * min(1, 8 / (price + 4)); est = w * ps + (1 - w) * fair
        s1 = 40 * min(1, a.games * max(ip, est) / 3); s2 = 30 * (1 - min(1, abs(ps - hit) / 0.25))
        ips = [1 / v for v in books.values()]
        s3 = 15 * (1 - min(1, ((max(ips) - min(ips)) / (sum(ips) / len(ips))) / 0.25)) if len(books) >= 2 else 7
        st = ctx['inj'].get(gs); s4 = max(0, hgs.INJ_PTS.get(st, 15) - (5 if a.snap_recent < 0.8 * a.snap_season else 0))
        m = hgs.model_v3(dict(player=r['player'], game=r['game'], books=books, inj=False, L5=None, L10=None, y26=None, y25=None, opp_rank=''), ctx)
        row['expected'] = dict(hasStats=True, team=a.team, implied=ctx['imp'][a.team]['factor'], statsChance=ps, hitRate=hit, hitChance=est, statsWeight=w,
                               parts=[s1, s2, s3, s4], clarity=m['clarity_score'], ourPct=m['our_pct'])
    board.append(row)
players = {gs: dict(lambda_=float(a.lam), statsChance=hgs.stats_prob(ctx, gs)[0], team=a.team, implied=ctx['imp'].get(a.team, {}).get('factor', 1.0), games=int(a.games), tdGames=int(a.td_games), snapRecent=float(a.snap_recent), snapSeason=float(a.snap_season), longRate=float(a.long_lam)) for gs, a in agg.iterrows()}
cc, ct = agg.attrs['conv']
out = dict(source='ops/pipeline/hgs.py (v3.0) via packages/core/test/fixtures/export-week8.py, on nflverse 2026 data through Week 8 Sunday, the view the Week 8 board (CHI @ SEA, Mon Nov 2 2026) was frozen on',
           columns=['playerId', 'gameId', 'week', 'team', 'position', 'snapPct', 'rzCarries', 'rzTargets', 'rzCarryTds', 'rzTargetTds', 'touchdowns'],
           logs=L, lines=lines, league=dict(carryTd=cc, targetTd=ct), players=players, board=board)
json.dump(out, open(OUT, 'w'), separators=(',', ':'), default=float)
print(len(L), 'logs', len(players), 'players', len(board), 'board', os.path.getsize(OUT), 'bytes')
