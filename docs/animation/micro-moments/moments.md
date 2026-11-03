# Moments

Timing comes from the scene files. Open the proof to see it.

| Moment | Proof | Scene | Trigger | What happens | Timing |
|---|---|---|---|---|---|
| Add a gem | `add` | `add` | Check a gem | Card takes its selected state. Slips tab glints along its edge from the tab, and the count pops. | Glint 820ms, pop 220ms |
| Remove a leg | `remove` | `remove` | Click × | A cloud sweeps the row into dust, the row closes, totals update, and Undo shows. | Sweep 660ms, close 220ms, Undo 5s |
| Swipe, soft pull | `swipe` | `swipe` | Short swipe on phone | Reveals a red Remove and stays open. A second pull removes. | Same as remove |
| Swipe, hard pull | `swipe-hard` | `swipe` | Long swipe on phone | Goes straight through to remove. | Same as remove |
| Erase the slip | `erase` | `erase` | Clear slip | One large cloud sweeps every leg as it passes, then the empty slip and Undo show. | Sweep 640ms, Undo 5s |
| Send | `send` | `flow` | Send the slip | The slip dissolves, dots fill the screen, form one huge gem, then swirl out through the edges. | Gather 1.8s, hold 1s, out 860ms |
| New connection | `connect` | `connect` | Connect a sportsbook | Gray dots drift while searching, turn brand color, fall in line, and a pulse loops into the gem. | Search 2.6s, settle 700ms, pulse 1.5s |
| Unread gems | `newest` | `newest` | Gem is unread | Purple card with a slow sheen. Six dots circle the newest. | Sheen 4.2s, circle 5.2s |
| Unread to read | `mark` | `markread` | Open a gem or Mark all read | A small cloud sweeps the shine off each card, and the count drops. | Sweep 420ms, 170ms apart |
| Drawer, phone | `drawer-m` | `drawer` | Open a gem | A spring open with dots rippling along the top edge. The gem row stays active under the tint. | Open 460ms, ripple 760ms, close 300ms |
| Drawer, desktop | `drawer-d` | `drawer` | Open a gem | The same from the right, with the ripple starting level with the row. | Same as phone |

The drawer spring is `cubic-bezier(.2, 1.22, .36, 1)`, and the close has no spring.
