# Avatar
> Source: https://vercel.com/geist/avatar (captured 2026-11-02)

## Purpose
Represents a person, group or organization. A stacked group represents several.

## Anatomy
- `Avatar` (`src`, `username`, `letter`, `placeholder`, `size`, `title`). Circle with a subtle alpha border overlay (measured on entity page).
- `AvatarGroup` (`members`, `size`, `limit`, `reverse`, `overlap`).
- `AvatarWithIcon` (`icon`, `iconBackground`). Provider avatars: `GitHubAvatar`, `GitLabAvatar`, `BitbucketAvatar`.

## Variants & sizes
- `size`: number in px. Demos: 16, 24, 30, 32, 48, 50, 90.
- `overlap`: `"auto"` (default, scales with size) or a number in px (lower = looser).
- `limit`: caps visible members (overflow indicator inferred).
- `reverse`: last member on top. Default is first on top.
- `letter` (1–2 uppercase characters) with `placeholder`.

## States
Loaded image, letter fallback, placeholder (loading shell).

## Tokens
Inferred: `--ds-gray-alpha-*` border ring, `--ds-gray-*` placeholder fill.

## Rules
- Use a single Avatar for one entity. Use AvatarGroup for two or more (correct overlap and one accessible label).
- `src` first, fall back to `letter`. `placeholder` is only for loading, never a permanent fallback.
- `title` is the literal entity name. The reference already prefixes initials for screen readers.
- Letters are uppercase from the name. No emoji or punctuation.
- Size follows nearby type: 20–24px with `text-label-14`, 32px with `text-label-16`, 48–64px in headers.

## In practice
- **Account marks** as avatars (20–24px next to `text-label-14` account names in board rows), letter fallback `NW`, `HF`.
- **Owner photos** at 32px in the Sheet header.
- **Source marks** as AvatarGroup (`limit={4}`) showing which sources feed an account.
