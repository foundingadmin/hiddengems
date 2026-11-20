# Chat
> Facet `[F]`. CSS in `css/components.css`.

## Purpose
A conversation with an assistant that explains the app's numbers: what it is looking at, the transcript, a few suggested questions and the composer.

## Anatomy
```html
<ul class="fc-chat-context" aria-label="Looking at">
  <li><span class="fc-badge" data-size="sm" data-contrast="low">About Northwind</span></li>
  <li><span class="fc-badge" data-size="sm" data-contrast="low">Week 9</span></li>
</ul>
<div class="fc-chat" role="log" aria-label="Conversation with the assistant">
  <div class="fc-msg text-copy-14" data-from="user"><p class="fc-visually-hidden">You</p><p>Why is Northwind scored above Cobalt Health?</p></div>
  <div class="fc-msg text-copy-14" data-from="assistant">
    <p class="fc-msg-by text-label-12"><svg aria-hidden="true">product mark</svg>Assistant</p>
    <p>Both beat the forecast by 4 points or more…</p>
  </div>
</div>
<ul class="fc-suggest" aria-label="Suggested questions">
  <li><button type="button" class="fc-button" data-variant="secondary" data-size="small" data-shape="rounded"><span>What could change before renewal?</span></button></li>
</ul>
<form class="fc-composer">
  <input class="fc-input" type="text" placeholder="Ask about an account or a score" aria-label="Ask the assistant">
  <button type="submit" class="fc-button" data-shape="square" aria-label="Send">send icon</button>
</form>
```
| Part | Class | Role |
|---|---|---|
| Context | `.fc-chat-context` | Low-contrast small badges naming what the assistant can see. Wraps |
| Transcript | `.fc-chat` | `role="log"`, 20px between messages |
| Your message | `.fc-msg[data-from="user"]` | Right-aligned bubble on `--fc-surface-fill`, 12px radius. Starts with a visually hidden "You" |
| Answer | `.fc-msg[data-from="assistant"]` | Left-aligned plain text under a byline (`.fc-msg-by`: 14px gray icon and the assistant's name) |
| Suggestions | `.fc-suggest` | Rounded small secondary buttons that send their question as written. Wrap; a label too long for the row truncates |
| Composer | `.fc-composer` | A flexible `.fc-input` and a square primary send button |

Messages are at most 88% of the column (and 40rem), so who said what reads from the edge they hang from.

## Rules
- The assistant explains, it never acts: no buttons in answers that change or send anything.
- Answers cite the numbers the app shows, with the same precision.
- Two or three suggestions, each a whole question under about 40 characters. Replace them after each answer.
- Gray only. The byline icon is the product mark in gray, never the brand accent.
- The send button names itself (`aria-label="Send"`); the input keeps its label even with a placeholder.

## In practice
A right sheet on desktop (sheet header, context in `.fc-sheet-badges` or `.fc-chat-context`, suggestions and composer in the sheet footer) and a tab on phone.
