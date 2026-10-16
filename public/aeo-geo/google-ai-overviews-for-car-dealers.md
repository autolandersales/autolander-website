# Google AI Overviews and car dealerships: when they show and whose pages get cited

> How Google AI Overviews work for car dealers: when they appear, how Google picks the pages it cites, and what a dealership can and can’t control.

Source: https://autolander.ai/aeo-geo/google-ai-overviews-for-car-dealers/  
Author: Michael Garber, Co-founder, AutoLander  
Published: October 15, 2026  
Updated: October 15, 2026

**Short answer:** Google AI Overviews are the AI summaries Google shows in its results for some searches, and for a car dealership the pages they cite come out of the same index and quality systems as ordinary search. [Google says](https://developers.google.com/search/docs/appearance/ai-features) there are no extra requirements or AI-only markup: a page has to be indexed and eligible for a snippet, and Google’s guide says [unique, first-hand content](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) is likely to matter most. In [Pew Research Center’s March 2025 data](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/), the summaries showed up most on question-style and long searches, and people clicked a link inside them on just 1% of visits.

## How do Google AI Overviews pick the pages they cite?

Google AI Overviews pick pages through Google’s core ranking systems, which retrieve relevant, up-to-date pages from the Search index; the model then reviews them and shows prominent, clickable links to supporting pages. [Google’s AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) says these features are rooted in the same ranking and quality systems as regular results.

[Google also says](https://developers.google.com/search/docs/appearance/ai-features) AI Overviews may use a technique it calls query fan-out, running several related searches across subtopics and data sources to build one answer, which lets them show a wider set of links than a classic results page. So a dealer page may not need to rank first for the buyer’s exact words to be cited; it needs to be a strong answer to one of the pieces.

Chat assistants take a different road. ChatGPT runs its own web search and cites what it finds, which we cover in [what ChatGPT looks at before it recommends a store](https://autolander.ai/aeo-geo/how-chatgpt-recommends-car-dealerships/). The overlap is large, though: crawlable pages, facts in plain text and content only your store could write help on both, and getting a dealership read and trusted across Google and the chat assistants is the work of [AEO and GEO for car dealers](https://autolander.ai/aeo-geo-for-car-dealers/).

## What does a page need to be eligible for AI Overviews?

To be eligible for AI Overviews, Google says a page must be indexed and eligible to show in Google Search with a snippet, and the site must be included in the Search generative AI features setting in Search Console, which is on by default. Everything past that is ordinary technical SEO and useful content.

- Indexed. The page has to be in Google’s index, per [Google’s AI features documentation](https://developers.google.com/search/docs/appearance/ai-features). For a dealer site, check that vehicle pages, service pages and model research pages are indexed, along with the homepage.
- Snippet-eligible. A nosnippet tag, or a max-snippet setting of zero, keeps a page’s text out of snippets, and Google uses those same preview controls for its AI features.
- Included in Search generative AI features. [Google’s guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) makes inclusion a condition, and [Search Console Help](https://support.google.com/webmasters/answer/16908024) says it is the default control for all properties unless an owner opts the site out.
- Crawlable by Googlebot. A CDN or bot-protection rule that challenges Googlebot can keep pages out of the index, and therefore out of AI Overviews as well.
- Worth retrieving. Google says its core ranking and quality systems do the retrieving, so thin, duplicated vehicle descriptions start at a disadvantage against a page with real detail.
- No certainty either way. [Google says](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) indexing and serving aren’t guaranteed even when a page meets every requirement, and no one outside Google can change that.

## Are there special optimizations for AI Overviews?

No. [Google says](https://developers.google.com/search/docs/appearance/ai-features) there are no additional requirements or special optimizations needed to appear in AI Overviews or AI Mode, and site owners do not need new machine-readable files, AI text files or special markup. [Structured data isn’t required](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) for generative AI search either, though it still matters for rich results.

That should change how a dealer hears some sales pitches. An “AI Overviews package” built around an llms.txt file or special schema is selling something Google says its Search does without: [Google says](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) Google Search does not use llms.txt, and it warns that no third-party tool has access to its internal ranking or AI systems.

What Google does ask for is familiar: pages its crawler can reach, text that answers the question, and content people find useful. Schema.org markup such as AutoDealer on your site and vehicle offers on each vehicle page is still worth having, since [Google says](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) it uses structured data to understand what a page is about. Just make sure nobody sells it to you as a ticket into the AI summary.

## Which searches trigger AI Overviews?

[Pew Research Center](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/) analyzed browsing data from 900 US adults and found that about 18% of their Google searches in March 2025 produced an AI summary. The share rose to 60% for searches phrased as questions and 53% for searches of ten or more words. We found no public source that gives the rate for car-shopping searches.

The pattern points a dealer toward research questions more than store names. Questions like “How does a trade-in work if I still owe money on my car?” or “Is a hybrid worth it for a 40-mile commute?” are long and phrased as questions, the kind Pew found most likely to get a summary. Your sales, finance and service teams answer those every day, which makes them good raw material for pages Google can cite.

The audience is large. At Google I/O in May 2026, [Sundar Pichai said](https://blog.google/innovation-and-ai/sundar-pichai-io-2026/) AI Overviews has over 2.5 billion monthly active users, a figure Google reports about its own product.

## Do shoppers click the links in AI Overviews?

Rarely, in Pew’s data. [Pew Research Center](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/) found users clicked a link inside the AI summary on just 1% of visits, and clicked a traditional result on 8% of visits with a summary versus 15% without one. [Google says](https://developers.google.com/search/docs/appearance/ai-features) clicks from pages with AI Overviews are higher quality, with visitors more likely to stay longer.

Pew also found people ended their browsing session on 26% of pages with an AI summary, compared with 16% of pages without one. Put together, a citation in an AI Overview works partly as exposure: a buyer may read your service explainer inside the summary and then call, or search your name later, without ever clicking the link.

So judge the work on more than clicks. Watch calls, direct visits and searches for your store’s name alongside Search Console, and read the Pew figures for what they are: a March 2025 sample of 900 adults across every kind of search, rather than a measure of car shoppers.

## Can a dealership keep its pages out of AI Overviews?

Yes. Google says the controls for how a page appears in its AI features are the normal Search preview controls, and Search Console now offers a setting that excludes a whole site from its generative AI features. Most preview controls also change how a page shows in regular results, so use them with care.

- nosnippet keeps a page’s text out of search snippets and out of AI Overviews, and it also blanks the snippet under the page’s regular listing. Use it rarely.
- data-nosnippet marks one part of a page, such as a legal disclaimer or a payment calculator’s fine print, as off-limits while the rest of the page stays eligible.
- max-snippet caps how many characters Google may show from the page.
- noindex removes the page from Google Search entirely, AI features included. [Google’s AI features documentation](https://developers.google.com/search/docs/appearance/ai-features) lists all four controls.
- The Search Console setting that excludes your site’s links and content from Search generative AI features covers AI Overviews, AI Mode and generative AI features in Discover. [Search Console Help](https://support.google.com/webmasters/answer/16908024) says exclusion generally takes a few days and does not affect AI training.
- Google-Extended is a different lever. [Google says](https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers) this robots.txt token controls whether your content may train Gemini models and ground answers in Gemini Apps and Vertex AI, and that it does not affect inclusion in Google Search, which is where AI Overviews live.
- For most dealers the better choice is to stay included, since AI Overviews answer exactly the research questions a store wants to be the source for.

## What kind of dealer content do AI Overviews use?

[Google says](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) unique, non-commodity content is likely to influence presence in its generative AI features more than any other suggestion in its guide, and it names first-hand experience as the model. For a dealership, that means pages only your store could write, drawn from your lot, your service lane and your customers’ real questions.

Google’s own example of commodity content is a post called “7 Tips for First-Time Homebuyers,” and it warns against recycling what others have already said. The dealer version is a “10 tips for buying a used car” article that could sit on any site. First-hand versions look different. A store might explain how its techs inspect a trade before appraisal, compare two midsize trucks it stocks with real towing notes, or state how long a typical brake job takes in its service department and whether loaners are available.

The format that fits is one buyer question per page, answered in the first sentence and backed by your own facts. Our guide to [answer pages for car dealerships](https://autolander.ai/aeo-geo/answer-pages-for-car-dealerships/) shows how to write one, and model comparisons and service answers follow the same pattern.

## How do you see AI Overviews impressions?

Search Console’s generative AI performance report shows organic impressions from AI Overviews and AI Mode over time, filterable by page, country, date and device, and [Google says](https://support.google.com/webmasters/answer/16984139) it reached all websites worldwide by August 31, 2026. The regular Performance report also counts this traffic, mixed into the Web search type totals.

The generative AI report is built on impressions and needs enough of them to show data, so a single rooftop may see little at first. Look at which pages appear: service explainers and model research pages are the ones most likely to match the long, question-style searches where Pew found summaries most often.

For the full picture, including the chat assistants Google’s tools cannot see, read [a repeatable way to measure AI visibility](https://autolander.ai/aeo-geo/measure-dealership-ai-visibility/). Our free scan does not measure AI Overviews; it asks ChatGPT and Claude your buyers’ questions, and its crawler and vehicle-page fixes are the same basics Google’s guidance asks for.

## Sources

- [Google Search Central: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google Search Central: Optimizing your website for generative AI features on Google Search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Search Console Help: the Search generative AI features setting](https://support.google.com/webmasters/answer/16908024)
- [Search Console Help: the generative AI performance report](https://support.google.com/webmasters/answer/16984139)
- [Google Search Central: Google’s common crawlers, including Google-Extended](https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers)
- [Google Search Central: Introduction to structured data markup](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [Pew Research Center: Google users are less likely to click on links when an AI summary appears, July 22, 2025](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/)
- [Google: Sundar Pichai at Google I/O 2026, May 19, 2026](https://blog.google/innovation-and-ai/sundar-pichai-io-2026/)

## Frequently asked questions

### Does blocking Google-Extended remove my site from AI Overviews?

No. [Google says](https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers) Google-Extended controls whether content it crawls may be used to train future Gemini models and to ground answers in Gemini Apps and Vertex AI, and that it does not affect a site’s inclusion in Google Search. AI Overviews are part of Search, so the preview controls and the Search Console setting are the levers there.

### Do I need schema markup to show in AI Overviews?

No. [Google says](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) structured data isn’t required for generative AI search and there is no special schema.org markup to add. AutoDealer and vehicle markup can still help machines read your pages, and on its own it will not get a page cited.

### Can AI Overviews show my dealership’s hours or address?

They can. [Google says](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) AI responses can include information about local businesses and that Business Profiles can help businesses show up in them. Keep hours and address current on the profile and the website alike, and check what AI Overviews say about your store now and then, since Google tells searchers they can make mistakes.

### Why doesn’t the free scan measure Google AI Overviews?

The free scan checks ChatGPT and Claude only, each with web search on, and it does not measure Google AI Overviews, AI Mode or Gemini. Google’s own generative AI report in Search Console shows your impressions there. The fixes the scan finds, such as crawler access and prices and VINs as page text, are basics Google’s guidance asks for too.

**Get my free scan:** https://autolander.ai/aeo-geo-for-car-dealers/#scan-form

## Related

- [AEO and GEO for car dealers: free AI Visibility Scan and plans](https://autolander.ai/aeo-geo-for-car-dealers/)
- [AI for car dealerships: what actually works](https://autolander.ai/guide/ai-for-car-dealerships/)
- [Car dealership marketing: the 2026 playbook](https://autolander.ai/guide/car-dealership-marketing/)
- [About AutoLander — who we are and how our data is produced](https://autolander.ai/about/)
- [How ChatGPT decides which car dealerships to recommend](https://autolander.ai/aeo-geo/how-chatgpt-recommends-car-dealerships/)
- [Google Business Profile in AI answers: what AI reads about your dealership](https://autolander.ai/aeo-geo/google-business-profile-ai-answers/)
- [Vehicle detail pages AI can read: price, mileage and VIN as text](https://autolander.ai/aeo-geo/vehicle-detail-page-ai-readable/)
- [Can ChatGPT and Claude read your dealership website? A 15-minute check](https://autolander.ai/aeo-geo/can-chatgpt-see-my-dealer-website/)

---
AutoLander: AEO and GEO for car dealers. https://autolander.ai/aeo-geo-for-car-dealers/
