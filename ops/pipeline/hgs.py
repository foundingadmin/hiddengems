"""Hidden Gem Scale pipeline v3 (nflverse stats + Outlier prices).  python3 hgs.py freeze|open|close RAW PICKS WEEK NOW_ISO SCHED
SCHED: {"AWY @ HOM": "kickoff ISO with offset", ...} from fetch_sports_data. Props whose game has kicked off are skipped (live in-game odds never enter the data).
                                  python3 hgs.py grade RESULTS PICKS     (manual results)
                                  python3 hgs.py autograde PICKS         (scorers read from nflverse play by play; inactive = void)
Stats come from nflverse (github.com/nflverse/nflverse-data), cached in ./nflcache. Cut v3 = calibrated red zone touchdown model
blended with the no-vig market. Backtest weeks 4 to 8 of 2026, 1,367 player games: Brier 0.131 vs 0.137 for plain hit rates and 0.147 for knowing nothing.
RAW: lines "Name AAA @ BBB|<odds..> [+N] IP% rank opp L5 L10 H2H 2026 2025|book:odds,...[|INJ]" (Outlier anytime TD board).
PICKS: {"updated":iso,"rows":[...]} flat rows.  RESULTS: {"<group>": 1|0|null(inactive=void), ...} for board rows (player TD yes/no)."""
import json,re,sys,math,os,urllib.request
import pandas as pd
import numpy as np
from datetime import datetime
def klabel(iso):
    d=datetime.fromisoformat(iso)
    return d.strftime('%a %b ')+str(d.day)+' · '+d.strftime('%I:%M %p').lstrip('0')+' MT'
BOOK={'fand':'FanDuel','draf':'DraftKings','priz':'PrizePicks','onel':'Fanatics','undr':'Underdog','slpr':'Sleeper','othr':'Other'}
SHORT={'FanDuel':'FD','DraftKings':'DK','PrizePicks':'PP','Fanatics':'FAN','Underdog':'UD','Sleeper':'SL','Other':'OT'}
def slug(s): return re.sub('[^a-z0-9]','',s.lower())
def pct(s): return None if s=='-' else int(s[:-1])/100
def ninf(p,maxn,pref):
    if p is None: return 0
    if p==0: return pref
    for n in range(maxn,0,-1):
        if abs(100*round(p*n)/n-100*p)<=0.6: return n
    return pref
def grade_stone(ct,price):
    if ct<0: return "Fool's gold"
    if ct<5: return 'Dirt'
    return 'Diamond' if price>=5 else 'Ruby' if price>=2.5 else 'Emerald' if price>=1.67 else 'Sapphire' if price>=1.25 else 'Quartz'
def parse(line):
    parts=line.strip().split('|')
    if len(parts)<3: return None
    m=re.match(r"(.+?) ([A-Z]{2,3} @ [A-Z]{2,3})$",parts[0])
    if not m: return None
    name,game=m.group(1),m.group(2); t=parts[1].split()
    try: i=next(j for j,x in enumerate(t) if x.endswith('%'))
    except StopIteration: return None
    sp=[pct(x) for x in t[i+3:i+8]]+[None]*5
    bk={}
    for b in parts[2].split(','):
        if ':' not in b: continue
        k,v=b.split(':',1)
        try: bk[BOOK.get(k,'Other')]=float(v)
        except ValueError: pass
    if not bk: return None
    return dict(player=name,game=game,opp_rank=t[i+1],L5=sp[0],L10=sp[1],y26=sp[3],y25=sp[4],books=bk,inj=len(parts)>3)
def model(p):
    bk=p['books']; price=bk.get('DraftKings') or max(bk.values())
    book='DraftKings' if 'DraftKings' in bk else max(bk,key=bk.get)
    ip=1/price; L5,L10,y26,y25=p['L5'],p['L10'],p['y26'],p['y25']
    n26=ninf(y26,9,7) if y26 is not None else 0; n25=ninf(y25,17,14) if y25 is not None else 0
    h26=(y26 or 0)*n26; h25=(y25 or 0)*n25
    fair=ip*0.93                         # strip ~7% hold
    k=min(50,8+1.5*price)                # prior games at the market: longshots need more proof
    l5h,l5n=((L5*5,2.5) if L5 is not None else (0,0))   # recency: last 5 counted half again
    est=(h26+0.5*l5h+0.35*h25+k*fair)/(n26+l5n+0.35*n25+k)
    neff=n26+0.35*n25
    s1=40*min(1,neff*max(ip,est)/3)      # sample: expected hits seen, not games
    rec=[r for r in (L5,L10,y26) if r is not None]
    sp1=(max(rec)-min(rec)) if len(rec)>=2 else 0.35
    sp2=0.5*abs(y25-y26) if (y25 is not None and y26 is not None) else 0.15
    s2=30*(1-min(1,max(sp1,sp2)/0.5))    # consistency across splits
    if len(bk)>=2:
        ips=[1/v for v in bk.values()]; s3=15*(1-min(1,((max(ips)-min(ips))/(sum(ips)/len(ips)))/0.25))
    else: s3=7                           # market agreement
    s4=5 if p['inj'] else 15             # setup confirmed (team injury flag)
    cs=round(s1+s2+s3+s4)
    tier,f=(('Clear',1.0) if cs>=80 else ('Slight haze',.85) if cs>=65 else ('Hazy',.7) if cs>=50 else ('Cloudy',.55))
    cut=round((est-ip)*100,1); ct=round(cut*price*f)
    fmt=lambda r:'' if r is None else str(round(r*100))
    return dict(price=price,book=book,books_txt=' · '.join(f"{SHORT[b]} {v:g}" for b,v in bk.items()),
        book_pct=round(ip*100),our_pct=round(est*100),cut=cut,clarity_score=cs,clarity=tier,clarity_x=f,carat=ct,
        grade=grade_stone(ct,price),c_sample=round(s1),c_consistency=round(s2),c_market=round(s3),c_setup=s4,
        l5=fmt(L5),l10=fmt(L10),y2026=fmt(y26),y2025=fmt(y25),opp_rank=p['opp_rank'],injury_flag=p['inj'])


REL = 'https://github.com/nflverse/nflverse-data/releases/download/'
FILES = {'pbp': 'pbp/play_by_play_{y}.csv.gz', 'snaps': 'snap_counts/snap_counts_{y}.csv',
         'inj': 'injuries/injuries_{y}.csv', 'players': 'players/players.csv'}
TEAM_FIX = {'JAC': 'JAX'}           # Outlier spelling -> nflverse
SKILL = {'QB', 'RB', 'WR', 'TE', 'FB'}

def fetch(d, season=2026, refresh=False):
    os.makedirs(d, exist_ok=True); out = {}
    for k, pat in FILES.items():
        p = os.path.join(d, pat.split('/')[1].format(y=season))
        if refresh or not os.path.exists(p):
            urllib.request.urlretrieve(REL + pat.format(y=season), p)
        out[k] = p
    return out

def norm(n):
    n = re.sub(r"[.'’]", '', str(n).lower())
    n = re.sub(r'\b(jr|sr|ii|iii|iv|v)\b', '', n)
    return re.sub(r'[^a-z]', '', n)

def load_nfl(paths):
    pbp = pd.read_csv(paths['pbp'], low_memory=False, usecols=['game_id', 'week', 'posteam', 'defteam', 'yardline_100', 'play_type',
          'rusher_player_id', 'passer_player_id', 'receiver_player_id', 'td_player_id', 'touchdown', 'td_team'])
    snaps = pd.read_csv(paths['snaps'])
    players = pd.read_csv(paths['players'], low_memory=False, usecols=['gsis_id', 'pfr_id', 'display_name', 'position'])
    inj = pd.read_csv(paths['inj'])
    return pbp, snaps, players, inj

def game_logs(pbp, snaps, players):
    """One row per player per game played: week, team, opp, snap_pct, td (0/1), tds, rz_carries, rz_targets."""
    pfr = players.dropna(subset=['pfr_id']).drop_duplicates('pfr_id').set_index('pfr_id')['gsis_id']
    s = snaps[(snaps.offense_snaps > 0) & snaps.position.isin(SKILL)].copy()
    s['gsis'] = s.pfr_player_id.map(pfr)
    s = s.dropna(subset=['gsis'])
    # snap counts lag a few days behind play by play: for games without snaps yet, count anyone who ran, caught or threw
    pos = players.drop_duplicates('gsis_id').set_index('gsis_id')
    miss = pbp[~pbp.game_id.isin(set(s.game_id))]
    if not miss.empty:
        parts = pd.concat([miss[['game_id', 'week', 'posteam', c]].rename(columns={c: 'gsis'}) for c in ['rusher_player_id', 'receiver_player_id', 'passer_player_id']]).dropna().drop_duplicates(['game_id', 'gsis'])
        parts['position'] = parts.gsis.map(pos.position); parts['player'] = parts.gsis.map(pos.display_name)
        parts = parts[parts.position.isin(SKILL)].rename(columns={'posteam': 'team'})
        parts['offense_pct'] = np.nan; parts['offense_snaps'] = np.nan
        s = pd.concat([s, parts[['game_id', 'week', 'team', 'gsis', 'position', 'player', 'offense_pct', 'offense_snaps']]], ignore_index=True)
    gm = pbp.dropna(subset=['posteam']).groupby(['game_id', 'posteam']).defteam.first()
    rz = pbp[pbp.yardline_100 <= 10]
    rc = rz[rz.play_type == 'run'].groupby(['game_id', 'rusher_player_id']).size()
    rt = rz[rz.play_type == 'pass'].groupby(['game_id', 'receiver_player_id']).size()
    td = pbp[(pbp.touchdown == 1) & pbp.td_player_id.notna()].groupby(['game_id', 'td_player_id']).size()
    rct = rz[(rz.play_type == 'run') & (rz.touchdown == 1) & (rz.td_player_id == rz.rusher_player_id)].groupby(['game_id', 'rusher_player_id']).size()
    rtt = rz[(rz.play_type == 'pass') & (rz.touchdown == 1) & (rz.td_player_id == rz.receiver_player_id)].groupby(['game_id', 'receiver_player_id']).size()
    keys = list(zip(s.game_id, s.gsis))
    s['rz_carries'] = [rc.get(k, 0) for k in keys]
    s['rz_targets'] = [rt.get(k, 0) for k in keys]
    s['tds'] = [td.get(k, 0) for k in keys]
    s['rzc_td'] = [rct.get(k, 0) for k in keys]
    s['rzt_td'] = [rtt.get(k, 0) for k in keys]
    s['td'] = (s.tds > 0).astype(int)
    s['opp'] = [gm.get((g, t), None) for g, t in zip(s.game_id, s.team)]
    s['snap_pct'] = s.offense_pct
    return s[['gsis', 'player', 'position', 'team', 'opp', 'week', 'game_id', 'snap_pct', 'rz_carries', 'rz_targets', 'rzc_td', 'rzt_td', 'tds', 'td']]

P = dict(k_long=32.0, recent_w=1.0, opp_exp=0.0, k_opp=6.0)   # fit by walk-forward backtest, weeks 4 to 8

def model_week(logs, W, p=P):
    """Expected touchdowns per game for every player, using only weeks before W."""
    h = logs[logs.week < W]
    if h.empty: return pd.DataFrame()
    rz_c, rz_t = h.rz_carries.sum(), h.rz_targets.sum()
    # league conversion: touchdowns per inside-10 carry and per inside-10 target
    conv_c = h.rzc_td.sum() / max(1, rz_c)
    conv_t = h.rzt_td.sum() / max(1, rz_t)
    # long touchdowns: everything not scored on an inside-10 carry or target
    h = h.assign(long_td=(h.tds - h.rzc_td - h.rzt_td).clip(lower=0))
    hs = h[h.snap_pct.notna()]
    pos_long = hs.groupby('position').long_td.sum() / hs.groupby('position').snap_pct.sum()   # long touchdowns per full game of snaps
    lastw = h.groupby('gsis').week.transform('max')
    h = h.assign(w=np.where(h.week > lastw - 3, p['recent_w'], 1.0))
    g = h.groupby('gsis')
    agg = pd.DataFrame({
        'player': g.player.last(), 'position': g.position.last(), 'team': g.team.last(),
        'games': g.size(), 'td_games': g.td.sum(), 'tds': g.tds.sum(),
        'rzc_pg': g.apply(lambda x: np.average(x.rz_carries, weights=x.w)),
        'rzt_pg': g.apply(lambda x: np.average(x.rz_targets, weights=x.w)),
        'long_pg': g.long_td.sum() / g.size(),
        'snap_season': g.snap_pct.mean(),
        'snap_recent': g.apply(lambda x: x.sort_values('week').snap_pct.dropna().tail(3).mean()),
        'last_week': g.week.max(),
        'l5': g.apply(lambda x: x.sort_values('week').td.tail(5).mean()),
    })
    agg['snap_season'] = agg.snap_season.fillna(0.5); agg['snap_recent'] = agg.snap_recent.fillna(agg.snap_season)
    pl = agg.position.map(pos_long).fillna(0.02) * agg.snap_recent      # prior scales with the role he actually plays
    agg['long_lam'] = (agg.long_pg * agg.games + p['k_long'] * pl) / (agg.games + p['k_long'])
    agg['lam'] = agg.rzc_pg * conv_c + agg.rzt_pg * conv_t + agg.long_lam
    # defense: touchdowns allowed per game to each position, relative to league, shrunk
    d = h.groupby(['opp', 'position', 'game_id']).tds.sum().reset_index()
    dg = d.groupby(['opp', 'position']).agg(t=('tds', 'sum'), n=('game_id', 'nunique')).reset_index()
    lg = dg.groupby('position').apply(lambda x: x.t.sum() / max(1, x.n.sum())).to_dict()
    dg['factor'] = dg.apply(lambda r: ((r.t + p['k_opp'] * lg.get(r.position, 0.5)) / (r.n + p['k_opp'])) / max(1e-6, lg.get(r.position, 0.5)), axis=1)
    agg.attrs['def'] = {(r.opp, r.position): r.factor for r in dg.itertuples()}
    agg.attrs['conv'] = (conv_c, conv_t)
    return agg

def def_rank(agg):
    """1 = allows the most touchdowns to that position (softest), 32 = fewest."""
    out = {}
    df = pd.DataFrame([(k[0], k[1], v) for k, v in agg.attrs['def'].items()], columns=['opp', 'pos', 'f'])
    for pos, x in df.groupby('pos'):
        for i, r in enumerate(x.sort_values('f', ascending=False).itertuples(), 1): out[(r.opp, pos)] = i
    return out

def prob(agg, gsis, opp, p=P):
    r = agg.loc[gsis]
    f = agg.attrs['def'].get((opp, r.position), 1.0) ** p['opp_exp']
    return 1 - math.exp(-r.lam * f)

CAL_A, CAL_B = -0.213, 0.755          # logistic recalibration fit on the backtest (1,367 player games, all roles)
INJ_PTS = {'Out': 0, 'Doubtful': 2, 'Questionable': 8}
GAMES_URL = 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv'
def implied_factors(cache, season=2026):
    """Implied team points for each team's next unplayed game, divided by the league average so far.
    Passed the backtest gate Nov 2 2026: weeks 4 to 8 Brier 0.1360 vs 0.1371, bootstrap CI excludes zero.
    Any failure returns {} and the model runs exactly as before."""
    try:
        p = os.path.join(cache, 'games.csv')
        urllib.request.urlretrieve(GAMES_URL, p)
        g = pd.read_csv(p); g = g[(g.season == season) & (g.game_type == 'REG') & g.spread_line.notna() & g.total_line.notna()]
        rows = []
        for r in g.itertuples():   # spread_line > 0 means the home team is favored
            rows.append((r.week, r.home_team, r.total_line / 2 + r.spread_line / 2, pd.isna(r.result)))
            rows.append((r.week, r.away_team, r.total_line / 2 - r.spread_line / 2, pd.isna(r.result)))
        t = pd.DataFrame(rows, columns=['week', 'team', 'imp', 'open'])
        nxt = t[t.open].sort_values('week').groupby('team').first()
        out = {}
        for team, r in nxt.iterrows():
            avg = t[t.week <= r.week].imp.mean()
            out[team] = dict(factor=float(r.imp / avg), pts=round(float(r.imp), 1))
        return out
    except Exception as e:
        print('implied points unavailable, model runs without them:', e); return {}

def stats_ctx(cache='nflcache', season=2026):
    paths = fetch(cache, season)
    pbp, snaps, players, inj = load_nfl(paths)
    logs = game_logs(pbp, snaps, players)
    agg = model_week(logs, 99)
    names = {}
    for g, r in agg.iterrows(): names.setdefault(norm(r.player), []).append(g)
    for r in players.dropna(subset=['gsis_id']).itertuples():
        if r.gsis_id in agg.index:
            k = norm(r.display_name)
            if r.gsis_id not in names.setdefault(k, []): names[k].append(r.gsis_id)
    lastw = inj.week.max()
    injd = {r.gsis_id: r.report_status for r in inj[inj.week == lastw].itertuples() if isinstance(r.report_status, str)}
    return dict(agg=agg, names=names, inj=injd, inj_week=int(lastw), drank=def_rank(agg), logs=logs, imp=implied_factors(cache, season))
def match(ctx, name, game):
    teams = [TEAM_FIX.get(t, t) for t in game.split(' @ ')]
    c = ctx['names'].get(norm(name), [])
    c = [g for g in c if ctx['agg'].loc[g].team in teams] or c
    return c[0] if len(c) == 1 else (c[0] if c and len(set(ctx['agg'].loc[c].team)) == 1 else None)
def stats_prob(ctx, g):
    a = ctx['agg'].loc[g]
    f = ctx.get('imp', {}).get(a.team, {}).get('factor', 1.0)   # implied team points scale expected touchdowns (k = 1.0)
    lam_p = 1 - math.exp(-a.lam * f)
    hit = (a.td_games + 8 * 0.2 * min(1, a.snap_recent / 0.6)) / (a.games + 8)
    m = min(0.995, max(0.005, 0.8 * lam_p + 0.2 * hit)); z = math.log(m / (1 - m))
    return 1 / (1 + math.exp(-(CAL_A + CAL_B * z))), hit, a
def model_v3(p, ctx):
    g = match(ctx, p['player'], p['game']) if ctx else None
    if g is None:      # no 2026 stats (rookie, return from injury, name mismatch): no read, the market stands
        r = model(p); price = r['price']; ip = 1 / price; fair = ip * (1 - min(0.35, 0.05 + 0.01 * price))
        r.update(our_pct=round(fair * 100), cut=round((fair - ip) * 100, 1), carat=0, grade='No read', clarity='Cloudy', clarity_x=0.55,
                 stats_match=False, model='no stats match'); return r
    bk = p['books']; price = bk.get('DraftKings') or max(bk.values())
    book = 'DraftKings' if 'DraftKings' in bk else max(bk, key=bk.get)
    ip = 1 / price
    hold = min(0.35, 0.05 + 0.01 * price)              # books juice long shots hardest (favorite long shot bias)
    fair = ip * (1 - hold)
    ps, hit, a = stats_prob(ctx, g)
    w = (0.5 if a.games >= 4 else 0.3) * min(1, 8 / (price + 4))   # long shots need more proof before we leave the market
    est = w * ps + (1 - w) * fair
    s1 = 40 * min(1, a.games * max(ip, est) / 3)       # sample: touchdowns we would expect to have seen
    s2 = 30 * (1 - min(1, abs(ps - hit) / 0.25))       # consistency: red zone usage and touchdown history agree
    if len(bk) >= 2:
        ips = [1 / v for v in bk.values()]; s3 = 15 * (1 - min(1, ((max(ips) - min(ips)) / (sum(ips) / len(ips))) / 0.25))
    else: s3 = 7
    st = ctx['inj'].get(g)
    s4 = INJ_PTS.get(st, 15) - (5 if a.snap_recent < 0.8 * a.snap_season else 0)
    s4 = max(0, s4)
    cs = round(s1 + s2 + s3 + s4)
    tier, f = (('Clear', 1.0) if cs >= 80 else ('Slight haze', .85) if cs >= 65 else ('Hazy', .7) if cs >= 50 else ('Cloudy', .55))
    cut = round((est - ip) * 100, 1); ct = round(cut * price * f)
    teams = [TEAM_FIX.get(t, t) for t in p['game'].split(' @ ')]
    opp = teams[1] if a.team == teams[0] else teams[0]
    pct = lambda v: '' if v is None else str(round(v * 100))
    return dict(price=price, book=book, books_txt=' · '.join(f"{SHORT[b]} {v:g}" for b, v in bk.items()),
        book_pct=round(ip * 100), our_pct=round(est * 100), stats_pct=round(ps * 100), cut=cut, clarity_score=cs, clarity=tier, clarity_x=f,
        carat=ct, grade=grade_stone(ct, price), c_sample=round(s1), c_consistency=round(s2), c_market=round(s3), c_setup=s4,
        l5=pct(a.l5), l10='', y2026=pct(a.td_games / a.games), y2025=pct(p['y25']), opp_rank=p['opp_rank'], injury_flag=bool(st),
        stats_match=True, model='v3 nflverse', gsis=g, position=a.position, team=a.team, opp=opp, games=int(a.games), td_games=int(a.td_games),
        rz_pg=round(float(a.rzc_pg + a.rzt_pg), 1), snap_recent=round(float(a.snap_recent) * 100), snap_season=round(float(a.snap_season) * 100),
        inj_status=st or '', def_rank=ctx['drank'].get((opp, a.position)))

def first(n): return n.split()[0]
BANDS = [('Diamond', 5.0, None), ('Ruby', 2.5, 4.99), ('Emerald', 1.67, 2.49), ('Sapphire', 1.25, 1.66), ('Quartz', None, 1.24)]
def stone_of(price): return 'Diamond' if price >= 5 else 'Ruby' if price >= 2.5 else 'Emerald' if price >= 1.67 else 'Sapphire' if price >= 1.25 else 'Quartz'
def explain_parts(r):
    """Cut, Color, Clarity: one plain paragraph each, plus the carat formula. Built only from the row's fields."""
    n = first(r['player']); price = r['price']; bk = r['book_pct']; us = r['our_pct']; cut = r['cut']; f = r.get('clarity_x') or 0.55
    cut_s = (f"{cut:+.0f}" if abs(cut) >= 9.5 else f"{cut:+.1f}")
    formula = f"{r['carat']} ct = {cut_s} cut × {price:.2f} color × {f:g} clarity"
    st = r.get('stats_pct'); g = r.get('games')
    if not r.get('stats_match'):
        cut_why = f"No 2026 stats, so we take the book's price at face value. After removing the house cut that leaves {us}%, below the book's {bk}%."
    else:
        w = (0.5 if (g or 0) >= 4 else 0.3) * min(1, 8 / (price + 4))
        lean = ("we give his usage half the say" if w >= 0.45 else f"long shots need more proof, so his usage gets about {round(w * 100)}% of the say and the market the rest")
        gap = (f"right on the book's price" if us == bk else f"{abs(us - bk)} point{'s' if abs(us - bk) > 1 else ''} {'above' if us > bk else 'below'} the book")
        fair = round(100 / price * (1 - min(0.35, 0.05 + 0.01 * price)))
        cut_why = f"His usage says {st}%. The price says {bk}%, or about {fair}% once the book's cut is taken out. {lean[0].upper() + lean[1:]}, which lands at {us}%, {gap}."
    stone = stone_of(price)
    band = {'Diamond': '5.00 and up', 'Ruby': '2.50 to 4.99', 'Emerald': '1.67 to 2.49', 'Sapphire': '1.25 to 1.66', 'Quartz': 'under 1.25'}[stone]
    nb = len([x for x in (r.get('books_txt') or '').split(' · ') if x])
    books = f"{nb} books posted" if nb > 1 else "One book posted so far"
    color_why = f"{price:.2f} sits in the {stone.lower()} band, {band}. The odds multiply the cut, so the same edge is worth more at longer odds and swings harder. {books}: {r.get('books_txt')}."
    if not r.get('stats_match'):
        formula = "No read · the market stands"
        clarity_why = "No 2026 games to measure, so the read is cloudy by default."
    elif r.get('c_sample') is None:
        clarity_why = f"{r.get('clarity')}."
    else:
        parts = [('sample', r['c_sample'], 40), ('consistency', r['c_consistency'], 30), ('books agreeing', r['c_market'], 15), ('setup', r['c_setup'], 15)]
        weak = min(parts, key=lambda p: p[1] / p[2])
        why_weak = {'sample': f"at his touchdown rate, {g} games is too few to have seen many touchdowns",
                    'consistency': "his touchdowns and his red zone usage tell different stories",
                    'books agreeing': ("only one book has posted a price" if nb <= 1 else "the books disagree on his price"),
                    'setup': (f"he is listed {r.get('inj_status','').lower()} on the injury report" if r.get('inj_status') else "his snap share is falling")}[weak[0]]
        clarity_why = (f"{r['clarity_score']} of 100, {r['clarity'].lower()}. Sample {r['c_sample']} of 40, consistency {r['c_consistency']} of 30, "
                       f"books {r['c_market']} of 15, setup {r['c_setup']} of 15. Soft spot: {why_weak}.")
    return dict(formula=formula, cut_why=cut_why, color_why=color_why, clarity_why=clarity_why, stone=stone)

def explain(r):
    """Plain sentences: why this prop got its grade. Built only from the row's fields."""
    n = first(r['player']); bk = r['book_pct']; us = r['our_pct']; st = r.get('stats_pct'); ct = r['carat']
    if not r.get('stats_match'):
        out = dict(headline='No read', why=f"{n} has no game stats this season yet, so there is nothing to weigh against the book. Pass.")
        out.update(explain_parts(r)); return out
    rz = r.get('rz_pg') or 0; sn = r.get('snap_recent'); g = r.get('games'); tg = r.get('td_games'); inj = r.get('inj_status')
    if rz >= 0.95: usage = f"gets about {round(rz)} touch{'es' if round(rz) > 1 else ''} a game near the goal line"
    elif rz >= 0.3: usage = f"gets the ball near the goal line about {round(rz * 10)} times every 10 games"
    elif rz > 0: usage = f"gets the ball near the goal line only about once every {round(1 / rz)} games"
    else: usage = "has not touched the ball near the goal line this season"
    role = f", playing {sn}% of snaps" if sn is not None else ""
    if ct >= 5:
        head = 'Underpriced'
        why = (f"{n} {usage}{role}, and has scored in {tg} of {g} games. Players used like that score about {st}% of the time. "
               f"The book prices him at {bk}%. We settle at {us}%, still above the book.")
    elif ct >= 0:
        head = 'Fair price'
        if g and tg / g > (st or 0) / 100 + 0.15:
            why = f"{n} has scored in {tg} of {g} games, but {usage}{role}. His role supports about {st}%, close to the book's {bk}%, so there is no gem here."
        else:
            why = f"{n} {usage}{role}, and has scored in {tg} of {g} games. The book's {bk}% matches that, so there is no gem here."
    else:
        head = 'Overpriced'
        if g and tg / g > (st or 0) / 100 + 0.15:
            why = f"{n} has scored in {tg} of {g} games, but {usage}{role}. The streak is running ahead of his role. The book says {bk}%, his role supports about {st}%."
        else:
            why = f"{n} {usage}{role}. The book says {bk}%, his role supports about {st}%."
    if inj: why += f" Listed {inj.lower()} on the injury report."
    if r.get('clarity') in ('Hazy', 'Cloudy') and ct >= 5: why += " His history is thin or uneven, so treat it as a small lean."
    out = dict(headline=head, why=why)
    out.update(explain_parts(r))
    return out
def autograde(pf, cache='nflcache'):
    paths = fetch(cache, refresh=True)
    pbp, snaps, players, inj = load_nfl(paths)
    pfr = players.dropna(subset=['pfr_id']).drop_duplicates('pfr_id').set_index('pfr_id')['gsis_id']
    played = set(zip(snaps.game_id, snaps.pfr_player_id.map(pfr)))
    snap_games = set(snaps.game_id)
    for c in ['rusher_player_id', 'receiver_player_id', 'passer_player_id']:
        played |= set(zip(pbp.game_id, pbp[c]))
    scorers = set(zip(pbp[pbp.touchdown == 1].game_id, pbp[pbp.touchdown == 1].td_player_id))
    games = set(pbp.game_id)
    d = json.load(open(pf)); n = 0; miss = []
    for r in d['rows']:
        if r['source'] != 'Board' or r.get('result') or not r.get('gsis'): continue
        aw, hm = [TEAM_FIX.get(t, t) for t in r['game'].split(' @ ')]
        gid = f"2026_{int(r['week']):02d}_{aw}_{hm}"
        if gid not in games: miss.append(r['game']); continue
        hit = (gid, r['gsis']) in scorers
        if not hit and (gid, r['gsis']) not in played:
            if gid not in snap_games: miss.append(r['game'] + ' (snap counts pending)'); continue   # can't tell inactive from quiet yet
            r['result'] = 'Void'; r['pl'] = 0.0; r['status'] = 'void'; n += 1; continue
        r['result'] = 'Hit' if hit else 'Miss'
        r['pl'] = round(10 * (r['price'] - 1), 2) if hit else -10.0; r['status'] = 'graded'
        n += 1
    json.dump(d, open(pf, 'w'), indent=0)
    print('graded', n, '| not in nflverse yet:', sorted(set(miss)))
NFL_ABBR = {'Arizona Cardinals':'ARI','Atlanta Falcons':'ATL','Baltimore Ravens':'BAL','Buffalo Bills':'BUF','Carolina Panthers':'CAR','Chicago Bears':'CHI',
 'Cincinnati Bengals':'CIN','Cleveland Browns':'CLE','Dallas Cowboys':'DAL','Denver Broncos':'DEN','Detroit Lions':'DET','Green Bay Packers':'GB',
 'Houston Texans':'HOU','Indianapolis Colts':'IND','Jacksonville Jaguars':'JAC','Kansas City Chiefs':'KC','Las Vegas Raiders':'LV','Los Angeles Chargers':'LAC',
 'Los Angeles Rams':'LAR','Miami Dolphins':'MIA','Minnesota Vikings':'MIN','New England Patriots':'NE','New Orleans Saints':'NO','New York Giants':'NYG',
 'New York Jets':'NYJ','Philadelphia Eagles':'PHI','Pittsburgh Steelers':'PIT','San Francisco 49ers':'SF','Seattle Seahawks':'SEA','Tampa Bay Buccaneers':'TB',
 'Tennessee Titans':'TEN','Washington Commanders':'WAS'}
def feed(files, pf, week, now):
    """Shadow price feed from The Odds API (free tier). Stores each book's price and slip link on matching rows under r['feed'],
    never touching the Outlier price, the frozen read or the opening price. Used to decide whether Outlier can be cancelled."""
    d = load(pf); byg = {}
    for r in d['rows']:
        if r.get('week') == week and r.get('source') == 'Board': byg.setdefault(r['game'], {})[slug(r['player'])] = r
    n = miss = 0
    for f in files:
        ev = load(f)
        game = NFL_ABBR.get(ev.get('away_team'), '?') + ' @ ' + NFL_ABBR.get(ev.get('home_team'), '?')
        rows = byg.get(game, {})
        for b in ev.get('bookmakers', []):
            for m in b.get('markets', []):
                if m.get('key') != 'player_anytime_td': continue
                for o in m.get('outcomes', []):
                    if o.get('name') != 'Yes': continue
                    r = rows.get(slug(o.get('description', '')))
                    if not r: miss += 1; continue
                    fd = r.setdefault('feed', {})
                    link = o.get('link')
                    if link and not link.startswith('http') and b['key'] == 'draftkings':   # compact form: outcome id only
                        link = 'https://sportsbook.draftkings.com/?outcomes=' + link.replace('#', '%23')
                    fd[b['key']] = dict(price=o.get('price'), link=link, at=now)
                    n += 1
    d['updated'] = now; save(pf, d)
    print('feed', n, 'prices matched,', miss, 'not on the Outlier board')

def load(f): return json.load(open(f))
def save(f,d): json.dump(d,open(f,'w'),indent=0)
def main():
    cmd=sys.argv[1]
    if cmd in('freeze','open','close','snap'):
        raw,pf,week,now=sys.argv[2],sys.argv[3],int(sys.argv[4]),sys.argv[5]
        sched=load(sys.argv[6]) if len(sys.argv)>6 else {}
        tnow=datetime.fromisoformat(now)
        d=load(pf); idx={r['id']:r for r in d['rows']}; n=0; skipped=0
        ctx=None if cmd in('close','snap') else stats_ctx()
        for line in open(raw):
            p=parse(line)
            if not p: continue
            k=sched.get(p['game'])
            if k and datetime.fromisoformat(k)<=tnow: skipped+=1; continue    # game already started
            rid=slug(p['player'])+'-'+slug(p['game'])+'-w'+str(week); r=idx.get(rid)
            m=model(p) if cmd in('close','snap') else model_v3(p,ctx)
            if cmd=='close':
                if r and r['status'] in('frozen','opening'):
                    r['close_price']=m['price']; r['close_at']=now
                    r['clv']=round((r['price']/m['price']-1)*100,1); n+=1
                continue
            if cmd=='snap':   # appraisal line point: logs the price only, never changes the frozen read, status or opening price
                if r and r['status'] in('frozen','opening'):
                    r.setdefault('snaps',[]).append({'at':now,'price':m['price']}); n+=1
                continue
            if r and r['status'] not in('opening',): continue      # never re-freeze a frozen or graded row
            base=dict(id=rid,week=week,game=p['game'],player=p['player'],market='Anytime TD',source='Board',
                      kick=k,kick_label=klabel(k) if k else '',
                      status='frozen' if cmd=='freeze' else 'opening',snap=now,group=slug(p['player'])+'|'+p['game']+'|w'+str(week),
                      open_price=((r or {}).get('open_price') or (r or {}).get('price')) if r else None,snaps=(r or {}).get('snaps',[]),close_price=None,close_at=None,clv=None,result=None,pl=None)
            base.update(m); base.update(explain(base)); idx[rid]=base; n+=1
        d['rows']=list(idx.values()); d['updated']=now; save(pf,d); print(cmd,n,'rows,',skipped,'skipped (already kicked off)')
    elif cmd=='grade':
        res,pf=load(sys.argv[2]),sys.argv[3]; d=load(pf); n=0
        for r in d['rows']:
            if r['source']=='Board' and r['result'] is None and r['group'] in res:
                v=res[r['group']]
                if v is None: r['result']='Void'; r['pl']=0.0; r['status']='void'; n+=1; continue   # player inactive
                hit=bool(v); r['result']='Hit' if hit else 'Miss'
                r['pl']=round(10*(r['price']-1),2) if hit else -10.0; r['status']='graded'; n+=1
        save(pf,d); print('graded',n)
    elif cmd=='explain':
        pf=sys.argv[2]; d=load(pf)
        for r in d['rows']:
            if r['source']=='Board': r.update(explain(r))
        save(pf,d); print('explained')
    elif cmd=='feed':   # python3 hgs.py feed picks.json WEEK NOW event1.json event2.json ...
        feed(sys.argv[5:], sys.argv[2], int(sys.argv[3]), sys.argv[4])
    elif cmd=='autograde':
        autograde(sys.argv[2])
if __name__=='__main__': main()
