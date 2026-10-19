// Build-time entry (scripts/prerender.mjs bundles it for Node): the exact element trees main.jsx hydrates.
import { renderToString } from 'react-dom/server';
import { aiVisibilityElement } from './ai/AiVisibilityApp.jsx';
import { teamElement } from './team/TeamApp.jsx';
import { paidAdsElement } from './ads/PaidAdsApp.jsx';
import { dealerWebsitesElement } from './websites/DealerWebsitesApp.jsx';

export const renderAiVisibility = ({ restHtml = '' } = {}) => renderToString(aiVisibilityElement({ prerendered: true, restHtml }));
export const renderTeam = ({ restHtml = '', variant = 'a' } = {}) => renderToString(teamElement({ prerendered: true, variant, restHtml }));
export const renderPaidAds = ({ restHtml = '', variant = 'a' } = {}) => renderToString(paidAdsElement({ prerendered: true, variant, restHtml }));
export const renderDealerWebsites = ({ restHtml = '' } = {}) => renderToString(dealerWebsitesElement({ prerendered: true, restHtml }));
