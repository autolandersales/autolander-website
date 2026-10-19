# Search Console’s generative AI report for dealers: reading AI Overviews and AI Mode impressions

> How car dealers read Search Console’s generative AI report: AI Overviews and AI Mode impressions by page, and what the report leaves out.

Source: https://autolander.ai/aeo-geo/search-console-ai-report-dealers/  
Author: Michael Garber, Co-founder, AutoLander  
Published: October 19, 2026  
Updated: October 19, 2026

**Short answer:** The Search Console generative AI report shows how often your dealership’s pages appeared as links in Google AI Overviews and Google AI Mode, and Google says it reached every website worldwide as of Aug 31, 2026. You can slice it by page, country, date and device. Google’s help page lists impressions as its measure and does not list clicks or search terms, and the report covers Google only. Its best use for a dealer is plain: find which pages Google’s AI features already show, then build more pages like them.

## What does Search Console’s generative AI report show?

Search Console’s generative AI report shows organic impressions your site earned in Google AI Overviews and Google AI Mode, filterable by page, country, date and device. [Google’s help page for the report](https://support.google.com/webmasters/answer/16984139) says it excludes Search Labs experiments, groups data by canonical URL and was rolled out to all websites worldwide as of Aug 31, 2026.

An impression here means a link to one of your pages appeared in an AI answer on a searcher’s results page. Picture a franchise store with a busy service drive. A shopper asks Google how often a certain SUV needs its transmission fluid changed, the AI Overview links the store’s service page, and that counts as an impression for that page. Add up the model research, financing and service questions and you get a map of where Google’s AI features already treat your site as a useful source.

Because the report uses canonical URLs, a page that points its canonical tag at another URL reports under that other URL. If your vehicle pages carry tracking parameters or several URL versions, the numbers roll up to whichever address the canonical tag names, so check that before you compare pages.

Why Google links one page and skips another is its own topic, covered in [how Google AI Overviews cite dealer pages](https://autolander.ai/aeo-geo/google-ai-overviews-for-car-dealers/). This guide sticks to reading the numbers.

## How is it different from the regular Performance report?

The regular Performance report already counts AI feature traffic, but blends it into your totals. [Google’s AI features documentation](https://developers.google.com/search/docs/appearance/ai-features) says AI Overviews and AI Mode are counted under the Web search type, and [Google’s updates log](https://developers.google.com/search/updates) says AI Mode data has counted toward the totals since June 16, 2025. The new report separates the AI impressions.

That separation matters when numbers move. Say a used-car store in a metro area sees total impressions on its financing page jump in one month. Before, nobody could tell whether regular results or an AI answer did it. Now the internet manager can open the generative AI report, filter to that page and see whether the AI share moved with the total.

The Performance report stays the place for search terms and clicks across all of Google Search. Use the two side by side: the Performance report for the whole picture, the generative AI report for the AI slice of it.

Both reports see Google and nothing else. For ChatGPT and Claude, which Search Console never sees, an [AI visibility scan for car dealers](https://autolander.ai/aeo-geo-for-car-dealers/#scan-form) asks those two assistants directly; the scan does not measure AI Overviews or AI Mode, which is exactly what this report is for.

## Which dealer pages should you look for in it?

Filter the report by page and sort your site into groups: model research and comparison pages, service pages, FAQ and answer pages, vehicle detail pages and the homepage. The useful question is which groups earn AI impressions and which never do, because that shows the kind of page Google’s AI features already link.

- Model research and comparison pages. If a trim comparison or a “which SUVs have a third row” page earns AI impressions, it is your template. Write the next one the same way: a direct answer first, then the detail.
- Service and parts pages. Fixed ops questions such as maintenance intervals, recall appointments and what a brake job includes are natural fits for an AI answer. A service page with impressions shows your service department can be a source for Google’s AI features.
- FAQ and answer pages. Financing, trade-in and what-to-bring pages each exist to answer one question. If one shows nothing after a few months, check whether the answer sits in the first sentence or three paragraphs down.
- Vehicle detail pages. VDPs come and go with the inventory, so read them as a group. Impressions on the VDP of a car you sold weeks ago mean the page is still live and still read, which is a sold-car handling problem to fix.
- The homepage and about page. Questions about the store itself, such as hours, location and the brands you sell, should land here. Make sure those facts match your Google Business Profile word for word.
- Pages with no AI impressions at all. Put one next to a page that earns them and look for the differences in structure: a clear question, a direct answer, facts written as text.

## Why might your site show no data?

Your site may show no data for two reasons. Google’s help page says the report needs enough impressions to show data, so a smaller store may see an empty chart at first. And [Google’s guide to its generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) says a site must be included in Search generative AI features in Search Console to be eligible for them.

That setting is on by default for every property, according to [Google’s help page for the control](https://support.google.com/webmasters/answer/16908024), so no opt-in is needed. It is still worth a look if an agency or a past website vendor had owner access to your Search Console, because an exclusion someone else set would keep the report empty.

Two more checks. Make sure you are in the property for the host name your pages actually live on; if your inventory is served from a different host name than the main site, it needs to be covered by the property you are reading. And remember that data rolls up to canonical URLs, so a page that names another URL as canonical will look empty on its own.

## What is the Search generative AI setting, and should you change it?

The Search generative AI setting is a Search Console control, on by default for every property, that decides whether your site is eligible for Google’s generative AI features. Excluding removes your links and content from AI Overviews, AI Mode and generative AI features in Discover. Google says exclusion generally takes a few days and does not affect AI training.

Most dealers should leave it on. Buyers ask Google about trims, financing, trade-ins and service, and excluding your site takes your pages out of those answers while every other store in town stays in them. Few dealership situations make that trade worth it.

Note what the setting leaves alone. Since it does not affect AI training, it is the wrong tool for a store that wants its content kept out of model training. That choice lives in robots.txt and in the security service in front of your site, and it is separate from whether Google’s AI features may link you.

Google says the control was rolled out to all websites worldwide as of Aug 31, 2026, the same date it gives for the report.

## How do you use the Search Console generative AI report alongside GA4 and Bing?

Give each free report its own question. Search Console’s generative AI report shows how often Google’s AI features showed your pages. GA4’s AI Assistant channel shows visits that came from chat assistants. Bing Webmaster Tools’ AI Performance report, a public preview since February 2026, shows when Microsoft Copilot and Bing’s AI summaries cited your site.

| Tool | What it tells a dealer | What it leaves out |
| --- | --- | --- |
| Search Console generative AI report | Impressions your pages earned in Google AI Overviews and Google AI Mode, by page, country, date and device | Clicks, search terms and every assistant outside Google |
| GA4 AI Assistant channel | Sessions from recognized AI assistants such as ChatGPT, Gemini and Claude, marked with the medium ai-assistant | Visits from AI Overviews and AI Mode, which GA4 counts as Organic Search, and answers that named you without a click |
| Bing Webmaster Tools AI Performance | Citations of your site across Microsoft Copilot, AI-generated summaries in Bing and select partner integrations, with grounding queries and page-level counts | Google, ChatGPT and Claude |
| Asking the assistants yourself | Whether ChatGPT and Claude name your store for local buyer questions, and which sources they cite | Any assistant you don’t ask |

_Report descriptions from Google Search Console Help, Google Analytics Help and the Bing Webmaster Blog, read September 30, 2026. Google and Microsoft rename menus and reports from time to time._

## What does the report not show?

It shows Google AI impressions and little else. Google’s help page lists impressions as the measure and page, country, date and device as the filters, so read it as a count of how often Google’s AI features showed your links. It says nothing about clicks, search terms or any assistant outside Google.

- Clicks. The help page lists impressions as the report’s metric. For visits, use GA4 and the regular Performance report.
- Search terms. No query filter is listed, so you can’t see which questions produced an AI Overview that linked you.
- Search Labs experiments, which Google leaves out of the report.
- Mentions without a link. The report counts your pages, so an AI answer that names your store without linking your site leaves it nothing to count.
- ChatGPT, Claude, Perplexity and Microsoft Copilot. None of them report into Search Console. GA4 catches some of their visits, Bing’s AI Performance report covers Copilot citations, and the rest takes asking the assistants.
- For a method that covers all of these, see [a repeatable way to measure AI visibility](https://autolander.ai/aeo-geo/measure-dealership-ai-visibility/): repeated questions to the assistants on one side, these traffic reports on the other.

## Sources

- [Google Search Console Help: Generative AI performance report](https://support.google.com/webmasters/answer/16984139)
- [Google Search Console Help: the Search generative AI control](https://support.google.com/webmasters/answer/16908024)
- [Google Search Central: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google Search Central: documentation updates log (AI Mode in Performance totals, June 16, 2025)](https://developers.google.com/search/updates)
- [Google Search Central: optimizing for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google Analytics Help: What’s new (AI Assistant channel)](https://support.google.com/analytics/answer/9164320)
- [Google Analytics Help: default channel group definitions](https://support.google.com/analytics/answer/9756891)
- [OpenAI Help Center: publishers and developers FAQ (utm_source=chatgpt.com)](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)
- [Bing Webmaster Blog: AI Performance in Bing Webmaster Tools, February 10, 2026](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview)

## Frequently asked questions

### Can I see AI Overviews impressions for a single vehicle page?

Yes, when that page has earned enough impressions: the report filters by page and groups data by canonical URL. Vehicle pages sell and change quickly, so most stores learn more from model, service and finance pages that stay live for months.

### Do I need to opt in to see the generative AI report?

No. Google says the Search generative AI setting is on by default for every property, and that the report rolled out to all websites as of Aug 31, 2026. If yours is empty, the likely causes are too few AI impressions so far or a setting someone changed to exclude the site.

### Does Search Console show ChatGPT visibility?

No. Search Console covers Google Search only. GA4’s AI Assistant channel shows visits that came from ChatGPT and other assistants, and OpenAI says ChatGPT adds utm_source=chatgpt.com to the links it sends. To see whether ChatGPT names your store when nobody clicks, you have to ask it, which our free scan does for ChatGPT and Claude.

### How often should a dealer check the generative AI report?

Monthly suits most stores: the same pages and the same date range, so each month compares cleanly with the last. Look again after any big change, such as a redesign, a new inventory platform or a change to the Search generative AI setting.

**Get my free scan:** https://autolander.ai/aeo-geo-for-car-dealers/#scan-form

## Related

- [AEO and GEO for car dealers: free AI Visibility Scan and plans](https://autolander.ai/aeo-geo-for-car-dealers/)
- [AI for car dealerships: what actually works](https://autolander.ai/guide/ai-for-car-dealerships/)
- [Car dealership marketing: the 2026 playbook](https://autolander.ai/guide/car-dealership-marketing/)
- [About AutoLander — who we are and how our data is produced](https://autolander.ai/about/)
- [How to measure your dealership’s AI visibility: questions, repeat runs and margins](https://autolander.ai/aeo-geo/measure-dealership-ai-visibility/)
- [Vehicle detail pages AI can read: price, mileage and VIN as text](https://autolander.ai/aeo-geo/vehicle-detail-page-ai-readable/)
- [Can ChatGPT and Claude read your dealership website? A 15-minute check](https://autolander.ai/aeo-geo/can-chatgpt-see-my-dealer-website/)
- [How ChatGPT decides which car dealerships to recommend](https://autolander.ai/aeo-geo/how-chatgpt-recommends-car-dealerships/)

---
AutoLander: AEO and GEO for car dealers. https://autolander.ai/aeo-geo-for-car-dealers/
