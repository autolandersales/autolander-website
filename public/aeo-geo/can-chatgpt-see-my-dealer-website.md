# Can ChatGPT and Claude read your dealership website? A 15-minute check

> A 15-minute check of whether ChatGPT, Claude and other AI tools can read your dealership website: robots.txt, firewalls, JavaScript and VDP text.

Source: https://autolander.ai/aeo-geo/can-chatgpt-see-my-dealer-website/  
Author: Michael Garber, Co-founder, AutoLander  
Published: October 1, 2026  
Updated: October 1, 2026

**Short answer:** Can ChatGPT see my website? That depends on four doors you can check in about 15 minutes with a browser: your robots.txt, the security service or CDN in front of the site, whether pages need JavaScript to show content, and whether price, mileage and VIN appear as plain text on vehicle pages. OpenAI’s and Anthropic’s search crawlers need every door open to read your pages, and anything that fails goes on a short fix list for your website vendor.

## Can ChatGPT see my website, and can Claude?

ChatGPT and Claude can read a dealership website only when their search crawlers are let in and the key facts sit in the page text. [OpenAI says](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt) ChatGPT search needs OAI-SearchBot allowed and your host or CDN open to its published IP addresses. [Anthropic runs](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) Claude-SearchBot and Claude-User for search and retrieval.

Think of it as four doors, and a crawler has to get through every one of them. The first is robots.txt, the plain text file that tells each bot what it may read. The second is the security service or CDN in front of the site, which can turn a bot away even when robots.txt says yes. The third is JavaScript: if a page shows its content only after scripts run, some crawlers see an empty shell. The fourth is the vehicle page itself, where price, mileage and VIN need to be readable as text. Anthropic says blocking Claude-SearchBot prevents indexing for search and reduces visibility in its search results, so a closed door has a real cost.

None of this needs a developer to check. A browser, a notepad and one of your own vehicle pages are enough, and the steps below take about 15 minutes. Making your store easy for AI tools to read, trust and cite is the work of [AEO and GEO for car dealers](https://autolander.ai/aeo-geo-for-car-dealers/), and crawler access comes first, because an assistant can only quote what its crawler was allowed to read.

## How do you check your robots.txt in two minutes?

Open your robots.txt in a browser and read the rules for each AI search crawler by name. If OAI-SearchBot, Claude-SearchBot, Claude-User and PerplexityBot are not blocked, and the catch-all group does not shut everything, this door is open. The steps below show exactly where to look.

1. **Open the file** — Type your domain followed by /robots.txt into a browser, for example yourstore.com/robots.txt. If the file is empty or the address returns a not-found error, robots.txt blocks no one, and you can move on to the firewall check. A server error is different, so report that to your vendor.
2. **Find the AI search crawlers by name** — Search the page with Ctrl+F (Cmd+F on a Mac) for OAI-SearchBot, Claude-SearchBot, Claude-User and PerplexityBot. Each one, if present, sits on a line that starts with User-agent, and the Allow and Disallow lines right under it apply to that crawler.
3. **Read the catch-all group** — Find the line User-agent: * (an asterisk). Its rules apply to every crawler that has no group of its own. A Disallow: / under the asterisk tells every unnamed bot to stay out of the whole site, so a search crawler without its own group is shut out too.
4. **Know what Disallow means** — Disallow: / blocks the entire site for that user agent. Disallow: /inventory/ blocks only that folder, which on some dealer sites is where the vehicle pages live. An empty Disallow: line blocks nothing. Write down every AI search crawler that is blocked and which folders it cannot reach.
5. **Note the date, then re-check** — [OpenAI says](https://developers.openai.com/api/docs/bots) its systems reflect a robots.txt change in about 24 hours. After your vendor edits the file, open it again the next day to confirm the new rules are live.

## Could your firewall or CDN be blocking AI search bots?

Yes. Your firewall, bot protection or CDN can turn AI search bots away even when robots.txt welcomes them, and nothing in robots.txt will show it. [OpenAI asks](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt) sites to let its published search bot IP addresses through at the host or CDN, on top of allowing OAI-SearchBot in robots.txt.

Security services exist to stop scrapers and attacks, and many challenge any automated visitor they do not recognize, often with a check a person can pass and a crawler cannot. That is the right call for a login page and the wrong one for your inventory. The defaults are shifting too: [Cloudflare announced on July 1, 2025](https://www.cloudflare.com/press/press-releases/2025/cloudflare-just-changed-how-ai-crawlers-scrape-the-internet-at-large/) that it would block, by default, AI crawlers that access content without permission or compensation, and ask every new domain whether to allow AI crawlers.

The trap is that nobody at the store sees the block. Your site loads fine for you and for buyers, robots.txt looks right, and the crawler gets a challenge page instead of your inventory. For Claude, [Anthropic says](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) its bots honor robots.txt and that blocking them by IP address may not work correctly, which is one more reason to manage access by bot name. Ask your vendor which security service fronts the site and how it treats AI search crawlers, in writing.

## Do AI crawlers run JavaScript?

Some do not. [A 2024 analysis by Vercel and MERJ](https://vercel.com/blog/the-rise-of-the-ai-crawler) of traffic on Vercel’s network found that none of the major AI crawlers rendered JavaScript at the time, including OpenAI’s and Anthropic’s, while Gemini, through Googlebot, and Applebot did. Content that appears only after scripts run may be invisible to the rest.

Treat that as a dated snapshot, since crawlers change. The safe position does not depend on who renders what: put the facts a buyer needs in the HTML the server sends. [Google says](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) it can process content inside JavaScript as long as it is not blocked, and [Bing’s webmaster guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a) warn against hiding critical content behind client-side rendering, because content that cannot be reliably rendered may not be indexed or used to ground answers.

Some dealer websites load inventory results, prices or payment calculators with scripts after the page opens. A page like that can look perfect to a shopper and still hand a crawler a photo carousel with no price. The next check shows you which kind of page you have.

## Are your prices, mileage and VINs readable as text?

Open one of your own vehicle pages and look at the raw HTML the server sends, then search it for the price, the mileage and the VIN. If all three appear as plain text, this door is open. If they are missing, a crawler that does not run scripts sees none of them.

1. **Pick a typical used unit** — Choose a vehicle page for a unit that has been in stock a few weeks, with a real price and mileage. A brand-new arrival may still show placeholder text and give you a false alarm.
2. **View the page source** — In Chrome or Edge, press Ctrl+U (Cmd+Option+U on a Mac), or type view-source: in front of the address. This shows the HTML the server sent before any scripts ran, which is close to what a crawler that skips JavaScript receives.
3. **Search for the three facts** — Press Ctrl+F and search for the price digits, the mileage digits and the last six characters of the VIN. Try the price with and without the comma. Each one you find in the source is readable as text.
4. **Compare with scripts turned off** — For a second opinion, turn JavaScript off for your site in the browser settings and reload the page. What still shows is roughly what a crawler that does not render scripts gets. Turn it back on afterward.
5. **Write down what was missing** — [Bing says](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a) pages are more likely to be selected for grounding and citations when important information is visible on the URL itself. If price, mileage or VIN only appear after scripts run, note which one and on which page type. That is usually a template fix your vendor makes once for every unit.

## Does blocking AI training bots hurt your AI search visibility?

Blocking training bots does not have to touch AI search, as long as you block bot by bot. OpenAI and Anthropic each run separate crawlers for search and for model training, so a store can opt out of training and still let the search and retrieval bots read its pages.

| Company | Search and retrieval bots | Training bot | What blocking the training bot does |
| --- | --- | --- | --- |
| OpenAI | OAI-SearchBot surfaces sites in ChatGPT search; ChatGPT-User handles some actions a user starts | GPTBot | Signals your content should not be used to train OpenAI’s models; OpenAI treats it separately from OAI-SearchBot |
| Anthropic | Claude-SearchBot indexes for Claude’s search; Claude-User fetches pages when a Claude user asks | ClaudeBot | Signals exclusion from future training data; Anthropic says blocking the other two reduces visibility |

_From OpenAI’s crawler overview and Anthropic’s help center as of September 2026. Both sources are linked at the end of this article._

## What should you send your website vendor?

Send your website vendor a short list of testable changes, one per line, each with the way you will confirm it. A precise request is easier for a support team to act on than a general worry about AI. Here is a starting list, adapted to whatever your four checks found.

- Allow OAI-SearchBot, Claude-SearchBot, Claude-User and PerplexityBot in robots.txt, and make sure no catch-all Disallow: / shuts them out. Test: open /robots.txt the next day.
- Allow OpenAI’s published search bot IP ranges at the CDN or firewall, as [OpenAI’s help center](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt) asks, and confirm the security service does not challenge AI search crawlers. Test: ask for a dated screenshot of the bot settings.
- Render price, mileage and the full VIN in the HTML of every vehicle page, so they do not depend on scripts. Test: view source on three vehicle pages and search for each value.
- Keep training decisions separate. If the store wants to opt out of model training, block GPTBot and ClaudeBot by name instead of blocking everything. Test: read the robots.txt group for each name.
- Tell the store before any security setting or template changes, including a redesign, and reply in writing with what changed and the date, so the store can re-check it.

## How does the free scan check your website?

The free scan reads only your robots.txt, your homepage, your sitemap when needed and up to five vehicle pages. It checks whether AI search crawlers are allowed, whether the security service in front of your site challenges automated visitors, and whether price, mileage and VIN are readable. If our check gets blocked, that block becomes a finding.

The website check is one part of the scan. It also asks ChatGPT and Claude, each with web search on, up to 20 questions a buyer in your town would ask, 3 times each, because answers change from run to run. The report shows who gets named, which sources are cited, a score out of 100 with a margin, and the 3 fixes to make first, written plainly enough to hand to your vendor.

A person on our team checks every report and walks you through it in 20 minutes. No logins are needed and nothing gets installed. You can [request the free scan](https://autolander.ai/aeo-geo-for-car-dealers/#scan-form) with your store name, website and city, and the 3 fixes are yours to keep whether or not you hire us.

## Sources

Every claim above about OpenAI, Anthropic, Google, Microsoft Bing, Cloudflare and Vercel comes from that company’s own published pages, listed here. Crawler rules and security defaults change, so re-read the source before you change a setting, and write down the date of your own checks.

- [OpenAI Help Center: Searching the web with ChatGPT](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt)
- [OpenAI: Overview of OpenAI crawlers](https://developers.openai.com/api/docs/bots)
- [Anthropic: how Anthropic crawls the web and how site owners can block the crawler](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- [Google Search Central: optimizing for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Microsoft Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a)
- [Cloudflare press release, July 1, 2025](https://www.cloudflare.com/press/press-releases/2025/cloudflare-just-changed-how-ai-crawlers-scrape-the-internet-at-large/)
- [Vercel: The rise of the AI crawler, December 2024](https://vercel.com/blog/the-rise-of-the-ai-crawler)

## Frequently asked questions

### Is my dealership website blocking ChatGPT?

It might be, and you can find out in a few minutes. Open yourstore.com/robots.txt and look for OAI-SearchBot or a catch-all Disallow: / line, then ask your website vendor whether the security service in front of the site challenges AI search crawlers. [OpenAI says](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt) a site needs both doors open to be eligible for ChatGPT search results.

### How long after I fix robots.txt will ChatGPT see my site?

[OpenAI says](https://developers.openai.com/api/docs/bots) its systems reflect a robots.txt change in about 24 hours. That covers the crawl rule only. Whether ChatGPT then names or cites your store depends on many other signals, and no one can promise when or whether that happens. Re-check the file the next day, then test a few buyer questions over the following weeks.

### Does ChatGPT-User follow my robots.txt?

Not always. [OpenAI says](https://developers.openai.com/api/docs/bots) ChatGPT-User handles certain actions a person starts inside ChatGPT, and because those are user actions, robots.txt rules may not apply to it. Whether your store can appear in ChatGPT search depends on OAI-SearchBot, so that is the crawler to check first.

### What if my website vendor controls robots.txt?

Many dealers are in that spot. Send the vendor a written request naming the exact crawlers to allow, the CDN or firewall setting to check, and how you will test it, then open robots.txt again the next day. Keep the reply in writing so you can show what changed and when.

**Get my free scan:** https://autolander.ai/aeo-geo-for-car-dealers/#scan-form

## Related

- [AEO and GEO for car dealers: free AI Visibility Scan and plans](https://autolander.ai/aeo-geo-for-car-dealers/)
- [AI for car dealerships: what actually works](https://autolander.ai/guide/ai-for-car-dealerships/)
- [Car dealership marketing: the 2026 playbook](https://autolander.ai/guide/car-dealership-marketing/)
- [About AutoLander — who we are and how our data is produced](https://autolander.ai/about/)
- [Cloudflare AI bot blocking on dealer websites: what to allow](https://autolander.ai/aeo-geo/cloudflare-ai-bots-dealer-websites/)
- [How ChatGPT decides which car dealerships to recommend](https://autolander.ai/aeo-geo/how-chatgpt-recommends-car-dealerships/)
- [How car buyers use ChatGPT and other AI tools to shop, and what it means for dealers](https://autolander.ai/aeo-geo/how-car-buyers-use-chatgpt/)
- [Dealership reviews and AI recommendations: volume, recency and what the words say](https://autolander.ai/aeo-geo/dealership-reviews-ai-recommendations/)
- [AEO vs SEO for car dealers: what changes and what stays the same](https://autolander.ai/aeo-geo/aeo-vs-seo-for-car-dealers/)

---
AutoLander: AEO and GEO for car dealers. https://autolander.ai/aeo-geo-for-car-dealers/
