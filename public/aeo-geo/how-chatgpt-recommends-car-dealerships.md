# How ChatGPT decides which car dealerships to recommend

> How ChatGPT decides which car dealerships to recommend: web search, location, OAI-SearchBot, cited sources, and what OpenAI says about placement.

Source: https://autolander.ai/aeo-geo/how-chatgpt-recommends-car-dealerships/  
Author: Michael Garber, Co-founder, AutoLander  
Published: October 2, 2026  
Updated: October 2, 2026

**Short answer:** How does ChatGPT recommend dealerships? When a buyer asks a local question, ChatGPT can search the web, may use the buyer’s general location to localize the search, ranks what it finds on several factors meant to surface relevant, reliable information, and can cite the pages it used. [OpenAI’s help page](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt) says placement is not guaranteed, and no one outside OpenAI can sell or promise a spot in the answer. What a dealership controls is whether OAI-SearchBot can read its site, whether store and vehicle facts sit in plain page text, and whether every public source tells the same story about the store.

## How does ChatGPT decide which dealerships to recommend?

ChatGPT decides which dealerships to recommend by searching the web when a question needs current local information, ranking the results on multiple factors meant to find relevant, reliable sources, and citing the pages it used. [OpenAI’s help page on ChatGPT search](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt) does not list those factors, and it says placement is not guaranteed.

Here is an illustrative case. A buyer in a mid-size metro types, “Which used truck dealers near me have a good reputation?” ChatGPT turns “near me” into a place, runs one or more searches, reads what comes back, and writes a short answer that names a few stores and shows its sources. Because the answer is assembled from a live search, it can reflect whatever public pages about stores in that market the search turns up that day, such as dealer websites, review pages, listing sites, local news and forum threads.

The audience is why this matters to a store. OpenAI says ChatGPT has [1.2 billion weekly users](https://openai.com/index/devday-2026-recap/), and a [Pew Research Center survey](https://www.pewresearch.org/internet/2026/06/17/americans-and-ai-2026-chatbots-smart-devices-and-views-on-impact/) of 5,119 US adults in February 2026 found 44% use ChatGPT, with searching for information as the top reason people use AI chatbots.

Making a store easy for ChatGPT to find, read and trust is the core of [AEO and GEO for car dealers](https://autolander.ai/aeo-geo-for-car-dealers/): an open door for its search crawler, store and vehicle facts on the page as text, and the same store details on every site it might cite. Nothing on that list buys a mention, and the rest of this guide sticks to what OpenAI itself documents.

## When does ChatGPT search the web?

ChatGPT can search the web on its own when a question would benefit from current information, and it can use location information to find local results. [OpenAI says](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt) web search works on the Free, Go, Plus, Pro, Business, Enterprise and Edu plans, and people who are not signed in can use it too.

Local car-buying questions are the kind that call for current information: which stores carry a model, who is open on Sunday, which dealer people trust for service. So when your buyer asks one, the answer is likely to be built from what ChatGPT finds on the web that day.

Two practical consequences follow. First, the buyer needs no account and no paid plan to get a sourced, local answer, so the audience is anyone with a browser or the app. Second, a change you make on the web, such as opening your site to OpenAI’s search crawler or fixing wrong hours on a directory, can reach answers without waiting for a new version of the model.

## How does ChatGPT know where the buyer is?

ChatGPT may estimate a buyer’s general location from their IP address and share that general area with search providers to localize results. [OpenAI’s example](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt) rewrites “good restaurants near me” into “top restaurants San Francisco.” Sharing precise device location is optional and off by default, so unless a buyer turns it on, the search works from an approximate area.

For a dealer, “near me” becomes a place name. If your store sits in a suburb 15 miles from the city your metro is named after, the rewritten search can use the big city, your town, or both. Your site should say in plain sentences where you are and which nearby communities you serve, for example: “We are on Route 9 in Riverton, about 20 minutes from downtown Springfield.”

Keep it honest and short: one clear sentence on your homepage, contact page and vehicle pages. A block of 40 town names pasted into the footer helps no reader and gives a search nothing it can quote.

## Does ChatGPT use Google or Bing?

[OpenAI says](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt) ChatGPT search sometimes partners with other search providers, rewriting the buyer’s question into targeted queries sent to them, and its help page links the privacy statements of Microsoft and Shopify. OpenAI does not publish a complete list of providers, so treat any claim that ChatGPT simply uses one engine as unproven.

Plenty of marketing pages state it as settled fact anyway. For a dealership the question matters less than it seems, because you cannot optimize for an index nobody will name. What holds no matter which provider supplies the results is the page itself: whether a crawler can reach it, whether its facts load as text, and whether it answers the question the buyer asked. Pages that are crawlable, indexed and clearly written are the raw material every search system works from.

## What does OAI-SearchBot need from your website?

OAI-SearchBot is the crawler OpenAI uses to surface websites in ChatGPT search. OpenAI says a site must allow it to crawl and must make sure its host or CDN lets traffic through from OpenAI’s published search bot IP addresses. The points below decide whether ChatGPT can read a dealer site at all.

- Allow it in robots.txt. [OpenAI’s help page](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt) makes crawl access the condition for inclusion in ChatGPT search results, and its [publisher FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq) says any public website can appear in ChatGPT search and tells site owners to make sure they are not blocking OAI-SearchBot.
- Let it through the security layer. Many dealer websites sit behind a CDN or bot-protection service that challenges automated visitors. Ask your website vendor to confirm in writing that OpenAI’s search bot IP ranges are allowed, because a robots.txt that says yes does nothing if the firewall says no.
- Expect about a day. [OpenAI’s crawler overview](https://developers.openai.com/api/docs/bots) says OAI-SearchBot is used to surface websites in search, is not used for training, respects robots.txt, and reflects a robots.txt change in about 24 hours.
- Decide on GPTBot separately. GPTBot collects content that may be used to train OpenAI’s models, and disallowing it signals that your content should stay out of training. OpenAI treats it as separate from OAI-SearchBot, so a store can block training and still allow search.
- Know what ChatGPT-User does. It fetches pages for actions a ChatGPT user starts, and OpenAI says robots.txt rules may not apply to it because a person asked for the page. Search visibility is managed through OAI-SearchBot.
- Put facts where a crawler can see them. A [2024 analysis by Vercel](https://vercel.com/blog/the-rise-of-the-ai-crawler) of traffic on its network found that OpenAI’s crawlers, OAI-SearchBot included, did not render JavaScript at the time, so prices and VINs that only appear after scripts run may never be read.
- Not sure where your site stands? Start with the walkthrough to [test whether AI crawlers can read your site](https://autolander.ai/aeo-geo/can-chatgpt-see-my-dealer-website/), which covers robots.txt, the firewall or CDN, JavaScript and what to send your website vendor.

## Which sources does ChatGPT cite about dealers?

ChatGPT answers that use web search may include citations, and a Sources view lists the pages it cited plus other relevant links. [OpenAI](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt) does not say which kinds of sites it favors for dealer questions, and it warns that search results and citations can be incomplete, outdated or incorrect.

That sources list is the most useful part of a ChatGPT answer for a dealer. It shows which pages shaped the recommendation: your own site, a review page, your profile on a listing site, a local news story, a forum thread, or a competitor’s page. If a cited page is wrong about you, with old hours or a location you closed, fix it at the source, because that page can keep feeding answers until it changes.

Answers change from run to run, so one check proves little. Our [free scan](https://autolander.ai/aeo-geo-for-car-dealers/#scan-form) asks ChatGPT and Claude, each with web search on, up to 20 questions a local buyer would ask, 3 times each, and lists the sources behind every answer, so you can see which sites the assistants lean on in your market.

## What OpenAI does not publish

OpenAI documents its crawlers, how it handles location and how citations appear. It does not publish its ranking factors, a full list of its search providers, or any list of sources it prefers for local businesses. Be wary of anyone who claims to know them, and of any offer that promises a spot in ChatGPT’s answers: OpenAI itself says placement is not guaranteed, so no one can deliver one.

## How can a dealership become easier for ChatGPT to recommend?

A dealership becomes easier for ChatGPT to recommend by removing the reasons to skip it: a crawler that cannot get in, facts hidden in images or scripts, store details that disagree from site to site, and buyer questions nobody has answered. None of these steps buys placement, and every one is under your control.

1. **Open the door to OAI-SearchBot** — Check robots.txt and your CDN or bot-protection settings with your website vendor, and get the answer in writing. Allow OAI-SearchBot even if you decide to block GPTBot for training.
2. **Put the facts in page text** — Price, mileage, VIN, trim, hours, address and the brands you sell should be readable text in the page itself, not only inside photos, PDFs or widgets that load after the page opens.
3. **Make your store details match everywhere** — Use the same name, address, phone and hours on your website, Google Business Profile, Bing Places, Apple Business Connect, Yelp, Facebook and your listing-site profiles. When sources agree, an assistant has less reason to doubt which store it is describing.
4. **Earn reviews and answer them** — Ask every sold customer for a review with one neutral request, never with incentives and never only the happy ones, and reply to reviews in plain, specific words. Reviews and replies are public text that any search can find.
5. **Publish answer pages** — Write pages on your own site that each answer one buyer question in the first sentence, using only your store’s facts: how a trade-in works when you still owe money, what a first-time buyer needs for financing, when the service lane opens.

## How do you track visits from ChatGPT?

ChatGPT adds utm_source=chatgpt.com to the links it sends people through, according to [OpenAI’s publisher FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq), so those visits show up under that source in Google Analytics and most other analytics tools. Filter your reports by that source to see which pages buyers land on and what they do next.

Google Analytics 4 also added an AI Assistant channel in May 2026, and [Google’s announcement](https://support.google.com/analytics/answer/9164320) names ChatGPT, Gemini and Claude as examples, so referrals from AI assistants can be grouped in one place.

Visit counts tell only part of the story. A buyer who reads a ChatGPT answer that names your store and then searches your name on Google arrives as a search visit, or calls without visiting at all. Pair the traffic numbers with a regular check of what ChatGPT actually says when your buyers ask.

## Sources

- [OpenAI Help Center: Searching the web with ChatGPT](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt)
- [OpenAI Help Center: Publishers and developers FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)
- [OpenAI: Overview of OpenAI crawlers](https://developers.openai.com/api/docs/bots)
- [OpenAI: Our approach to advertising and expanding access, January 16, 2026](https://openai.com/index/our-approach-to-advertising-and-expanding-access/)
- [OpenAI: DevDay 2026 recap, September 29, 2026](https://openai.com/index/devday-2026-recap/)
- [Pew Research Center: Americans and AI 2026, June 17, 2026](https://www.pewresearch.org/internet/2026/06/17/americans-and-ai-2026-chatbots-smart-devices-and-views-on-impact/)
- [Vercel: The rise of the AI crawler, December 17, 2024](https://vercel.com/blog/the-rise-of-the-ai-crawler)
- [Google Analytics Help: What’s new in Google Analytics](https://support.google.com/analytics/answer/9164320)

## Frequently asked questions

### Can I pay ChatGPT to recommend my dealership?

No. OpenAI’s [ads principles](https://openai.com/index/our-approach-to-advertising-and-expanding-access/) say ads do not influence the answers ChatGPT gives, and that ads are always separate and clearly labeled. OpenAI also says placement in its search results is not guaranteed, so no one can sell you a spot inside the answer.

### How long does a robots.txt change take to reach ChatGPT?

About 24 hours, according to [OpenAI’s crawler overview](https://developers.openai.com/api/docs/bots). That covers OAI-SearchBot picking up the new rule. Whether and when your pages then show up in answers depends on the questions buyers ask and what else the search finds, and OpenAI publishes no timeline for that.

### Does ChatGPT search work without logging in?

Yes. [OpenAI says](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt) people who are not signed in can use web search, and it is available on the Free, Go, Plus, Pro, Business, Enterprise and Edu plans. A buyer needs no account to get a local dealer answer with sources.

### Why does ChatGPT recommend a competitor instead of my store?

There is no published answer, because OpenAI does not list its ranking factors. The practical way to find out is to read the sources under the answer: they show which pages the search found and trusted for that question. Then check the basics on your side, starting with whether OAI-SearchBot can reach your site and whether your facts are on the page as text.

**Get my free scan:** https://autolander.ai/aeo-geo-for-car-dealers/#scan-form

## Related

- [AEO and GEO for car dealers: free AI Visibility Scan and plans](https://autolander.ai/aeo-geo-for-car-dealers/)
- [AI for car dealerships: what actually works](https://autolander.ai/guide/ai-for-car-dealerships/)
- [Car dealership marketing: the 2026 playbook](https://autolander.ai/guide/car-dealership-marketing/)
- [About AutoLander — who we are and how our data is produced](https://autolander.ai/about/)
- [Google AI Overviews for car dealers: when they show and who gets cited](https://autolander.ai/aeo-geo/google-ai-overviews-for-car-dealers/)
- [How car buyers use ChatGPT and other AI tools to shop, and what it means for dealers](https://autolander.ai/aeo-geo/how-car-buyers-use-chatgpt/)
- [Dealership reviews and AI recommendations: volume, recency and what the words say](https://autolander.ai/aeo-geo/dealership-reviews-ai-recommendations/)
- [Answer pages for car dealerships: what they are and how to write one](https://autolander.ai/aeo-geo/answer-pages-for-car-dealerships/)

---
AutoLander: AEO and GEO for car dealers. https://autolander.ai/aeo-geo-for-car-dealers/
