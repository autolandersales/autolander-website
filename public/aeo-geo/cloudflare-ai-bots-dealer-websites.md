# Cloudflare AI bot blocking on dealer websites: how to keep AI search crawlers in

> How Cloudflare’s AI bot blocking can hide a dealer website from AI search, what its Search, Agent and Training bot categories mean, and what to allow.

Source: https://autolander.ai/aeo-geo/cloudflare-ai-bots-dealer-websites/  
Author: Michael Garber, Co-founder, AutoLander  
Published: October 12, 2026  
Updated: October 12, 2026

**Short answer:** Does Cloudflare block AI crawlers on dealer websites? It can: Cloudflare announced in July 2025 that it would block, by default, AI crawlers that take content without permission or compensation, and ask every new domain whether to allow AI crawlers. The fix is to keep Cloudflare’s Search category allowed, allow OAI-SearchBot, Claude-SearchBot and PerplexityBot by name, and make the training decision separately. The Cloudflare account often sits with your website vendor, so send them a short, testable change request and ask for screenshots back.

## Does Cloudflare block AI crawlers on dealer websites?

It can. Cloudflare sits in front of many websites as a security layer, and [it announced on July 1, 2025](https://www.cloudflare.com/press/press-releases/2025/cloudflare-just-changed-how-ai-crawlers-scrape-the-internet-at-large/) that it would block, by default, AI crawlers that take content without permission or compensation, and ask every new domain whether to allow AI crawlers. If its settings turn away OAI-SearchBot or Claude-SearchBot, a permissive robots.txt does not help.

The two layers work independently. [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html), the robots.txt standard, says its rules are not a form of access authorization: robots.txt is a request a crawler reads and chooses to follow. Cloudflare is a gate that decides whether the request reaches your server at all. [OpenAI’s help center](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt) says ChatGPT search eligibility needs both: OAI-SearchBot allowed in robots.txt, and your host or CDN letting through traffic from OpenAI’s published search bot IP addresses. Understanding [what ChatGPT looks at before it recommends a store](https://autolander.ai/aeo-geo/how-chatgpt-recommends-car-dealerships/) starts with that door being open.

For a dealer, being readable is the starting line for [AEO for car dealerships](https://autolander.ai/aeo-geo-for-car-dealers/): an assistant cannot quote your hours, name your store for a model you stock or cite your service page if its crawler never gets a page back. Cloudflare framed its defaults around publishers whose content gets used without permission or pay. A dealership usually wants the opposite for its public pages.

## What did Cloudflare change in July 2025?

On July 1, 2025, [Cloudflare said](https://www.cloudflare.com/press/press-releases/2025/cloudflare-just-changed-how-ai-crawlers-scrape-the-internet-at-large/) it had become the first internet infrastructure provider to block AI crawlers that access content without permission or compensation by default, and that every new domain would be asked whether to allow AI crawlers. Cloudflare says it helps manage and protect traffic for 20% of the web.

Cloudflare framed the change around publishers getting paid for their work. In [a post the same day](https://blog.cloudflare.com/content-independence-day-no-ai-crawl-without-compensation/), Cloudflare’s CEO estimated that getting traffic from OpenAI was 750 times harder, and from Anthropic 30,000 times harder, than from the Google of old. Those are Cloudflare’s own mid-2025 estimates, and they explain why its defaults lean toward blocking.

A dealer’s position is different. Your site exists to be found, and an assistant that reads your inventory, hours and service pages is doing the job your website was built for: putting your store in front of a local buyer. Search crawlers that surface and cite pages are the ones to keep. Training is a separate choice, and Cloudflare’s newer controls let you make it on its own.

## What are Cloudflare’s Search, Agent and Training bot categories?

Cloudflare sorts AI bots by what they do. Search bots index content, Agent bots carry out automated tasks in real time, and Training bots collect content for model training. The table maps the crawlers a dealer cares about to the closest category, using each company’s own description of its bot.

| Crawler | What its owner says it does | Closest Cloudflare category | Usual dealer choice |
| --- | --- | --- | --- |
| OAI-SearchBot (OpenAI) | Surfaces websites in ChatGPT search; not used for training | Search | Allow |
| ChatGPT-User (OpenAI) | Certain actions a ChatGPT user starts | Agent | Allow |
| GPTBot (OpenAI) | Collects content that may train OpenAI’s models | Training | Business choice |
| Claude-SearchBot (Anthropic) | Crawls to improve Claude’s search results | Search | Allow |
| Claude-User (Anthropic) | Fetches pages when a Claude user asks a question | Agent | Allow |
| ClaudeBot (Anthropic) | Collects content that may train Anthropic’s models | Training | Business choice |
| PerplexityBot (Perplexity) | Surfaces and links sites in Perplexity results; not used to train foundation models | Search | Allow |

_Owner descriptions come from OpenAI, Anthropic and Perplexity documentation as of September 2026. Cloudflare assigns each bot’s category itself, so confirm the label in your own dashboard before changing a rule._

## What does Cloudflare’s managed robots.txt add?

[Cloudflare’s managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/) adds Disallow rules for a list of AI crawlers, including GPTBot, ClaudeBot, Google-Extended and Applebot-Extended, plus a content signal that reads search=yes, ai-train=no. Cloudflare itself notes that obeying robots.txt is voluntary, so the file states your wishes rather than enforcing them.

For a store that wants to opt out of training while staying readable, this is a sensible middle setting, because the crawlers Cloudflare lists as examples are mostly training crawlers, and its signal says search use is welcome. Three cautions. Google-Extended covers more than training: [Google says](https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers) it also controls grounding in Gemini Apps, though it does not affect inclusion in Google Search, so weigh that line on its own. The list is Cloudflare’s and can change, so read the live file instead of assuming what it contains. And if your vendor also maintains its own robots.txt, find out how the two combine, because two people editing the same rules is how a store ends up blocking what it meant to allow.

## What did Cloudflare announce for new domains from September 15, 2026?

[Cloudflare’s documentation announced](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/) that from September 15, 2026, new domains would get updated defaults: bots classed as Training or Agent blocked on pages that display ads, with Search bots still allowed. The same page marked the older Block AI bots option as deprecating that day. Check your own dashboard for what applies.

If your vehicle pages do not display ads, the ad-page rule may not touch them. The part that matters is the direction: Cloudflare keeps moving toward separate controls for search, agents and training. For a dealer that is good news, because it makes the right setting, search on and training your call, easier to express.

## Dated notice

Everything in this article reflects Cloudflare’s public documentation as read in September 2026, and the September 15, 2026 change is described as Cloudflare announced it. Before your vendor changes anything, have them read the current page and your live dashboard, and date the screenshot.

## How do you see which AI bots reach your site?

Use Cloudflare’s AI Crawl Control. [Cloudflare says](https://developers.cloudflare.com/ai-crawl-control/) it shows which AI services access your content and lets you set allow or block rules per crawler, and that it is available on all plans. Whoever holds the Cloudflare login can open it, which is often your website vendor rather than the store.

Ask for three things from that screen: the AI crawlers that visited over a recent period, whether each one is allowed or blocked, and whether any search crawler shows challenges or blocks. A search crawler that keeps visiting and keeps getting blocked is the clearest sign of a setting working against you.

If your site does not use Cloudflare, the same question applies to whatever security service fronts it. Many bot managers and firewalls can challenge automated visitors, and each has its own controls. Ask your vendor the same questions in the same words, and ask for a screenshot rather than a yes.

## What should a dealer ask the website vendor to set?

Ask the vendor to keep Cloudflare’s Search category allowed, allow the named AI search crawlers and OpenAI’s published IP ranges, set training separately, and send proof back. Five changes, each testable, cover the usual problems for a dealer site behind Cloudflare or a similar security service.

1. **Keep the Search category allowed** — In Cloudflare’s AI bot controls, Search should stay allowed for the whole site. If anything in the dashboard blocks all AI bots at once, ask the vendor to replace it with per-category or per-crawler rules.
2. **Allow the AI search crawlers by name** — Ask for explicit allow rules for OAI-SearchBot, Claude-SearchBot and PerplexityBot, plus Claude-User and ChatGPT-User for pages a buyer asks an assistant to open. Named rules make your intent explicit if a default changes later.
3. **Let OpenAI’s published IP ranges through** — [OpenAI asks](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt) sites to allow traffic from its published search bot IP addresses at the host or CDN. Ask the vendor to confirm no firewall rule, rate limit or challenge page stands between those addresses and your vehicle pages.
4. **Decide on training separately** — Blocking Training bots such as GPTBot and ClaudeBot is a business decision, and it can sit alongside open search access. Put the decision in writing so the next person at the vendor does not undo it.
5. **Get proof back, then test it yourself** — Ask for dated screenshots of the AI Crawl Control settings and the live robots.txt. Then [test whether AI crawlers can read your site](https://autolander.ai/aeo-geo/can-chatgpt-see-my-dealer-website/) with the 15-minute routine, and repeat it after any redesign or security change.

## Sources

Every Cloudflare, OpenAI, Anthropic, Perplexity and Google claim in this article comes from that company’s own pages or from the robots.txt standard, listed below. Cloudflare updates its bot settings over time, so re-read the live page before anyone changes a setting on your site.

- [Cloudflare press release, July 1, 2025](https://www.cloudflare.com/press/press-releases/2025/cloudflare-just-changed-how-ai-crawlers-scrape-the-internet-at-large/)
- [Cloudflare blog: Content Independence Day, July 1, 2025](https://blog.cloudflare.com/content-independence-day-no-ai-crawl-without-compensation/)
- [Cloudflare Docs: block AI bots](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/)
- [Cloudflare Docs: AI bot categories](https://developers.cloudflare.com/bots/concepts/bot/#ai-bots)
- [Cloudflare Docs: managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)
- [Cloudflare Docs: AI Crawl Control](https://developers.cloudflare.com/ai-crawl-control/)
- [OpenAI Help Center: Searching the web with ChatGPT](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt)
- [OpenAI: Overview of OpenAI crawlers](https://developers.openai.com/api/docs/bots)
- [Anthropic: how Anthropic crawls the web](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- [Perplexity: Perplexity crawlers](https://docs.perplexity.ai/guides/bots)
- [Google Search Central: Google’s common crawlers (Google-Extended)](https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers)
- [RFC 9309: Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309.html)

## Frequently asked questions

### How do I know if my dealer website uses Cloudflare?

Ask your website vendor, who can answer in one reply. You can also open your browser’s developer tools, load your homepage and look for cloudflare in the server line of the response headers. The vendor’s answer is the one to trust, since some sites sit behind more than one service.

### Can Cloudflare block training bots and still allow AI search?

Yes. [Cloudflare sorts AI bots](https://developers.cloudflare.com/bots/concepts/bot/#ai-bots) into Search, Agent and Training categories, and its managed robots.txt targets training crawlers such as GPTBot and ClaudeBot with a search=yes, ai-train=no signal. You can block Training while leaving Search allowed, and add named allow rules for the search crawlers you care about.

### Does Cloudflare’s managed robots.txt block ChatGPT search?

The managed file Cloudflare documents targets training crawlers, including OpenAI’s GPTBot, and its content signal says search=yes. OAI-SearchBot, the crawler behind ChatGPT search, is a separate bot. Read your live robots.txt to confirm, because the list can change and your vendor may add its own rules.

### Who at my dealership can change Cloudflare settings?

Often nobody at the store. The Cloudflare account frequently belongs to the website vendor or an IT contractor, so your job is a clear written request. If the account is in the dealership’s name, find out who has the login before you need it, and keep that person on the vendor thread.

**Get my free scan:** https://autolander.ai/aeo-geo-for-car-dealers/#scan-form

## Related

- [AEO and GEO for car dealers: free AI Visibility Scan and plans](https://autolander.ai/aeo-geo-for-car-dealers/)
- [AI for car dealerships: what actually works](https://autolander.ai/guide/ai-for-car-dealerships/)
- [Car dealership marketing: the 2026 playbook](https://autolander.ai/guide/car-dealership-marketing/)
- [About AutoLander — who we are and how our data is produced](https://autolander.ai/about/)
- [Can ChatGPT and Claude read your dealership website? A 15-minute check](https://autolander.ai/aeo-geo/can-chatgpt-see-my-dealer-website/)
- [How ChatGPT decides which car dealerships to recommend](https://autolander.ai/aeo-geo/how-chatgpt-recommends-car-dealerships/)
- [How car buyers use ChatGPT and other AI tools to shop, and what it means for dealers](https://autolander.ai/aeo-geo/how-car-buyers-use-chatgpt/)
- [Dealership reviews and AI recommendations: volume, recency and what the words say](https://autolander.ai/aeo-geo/dealership-reviews-ai-recommendations/)

---
AutoLander: AEO and GEO for car dealers. https://autolander.ai/aeo-geo-for-car-dealers/
