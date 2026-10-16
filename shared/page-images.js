import manifest from './responsive-image-manifest.json' with { type: 'json' };

export const imageFromSlot = (slot) => ({ ...manifest[slot.image], slug: slot.image, alt: slot.alt });
export const TEAM_IMAGES = {
  hero: imageFromSlot({ image: 'sales-hub', alt: 'AutoLander Sales Hub showing vehicle inventory and Marketplace posting tools' }),
  dashboard: imageFromSlot({ image: 'dashboard', alt: 'AutoLander Manager Dashboard showing team posts, active listings and sold vehicles' }),
  access: imageFromSlot({ image: 'team-access', alt: 'AutoLander Team Access screen with posting seats and Manager Dashboard access set per person, with names hidden' }),
  autopilot: imageFromSlot({ image: 'autopilot', alt: 'AutoLander AutoPilot controls for scheduling Marketplace vehicle posts' }),
};
export const ADS_IMAGES = {
  poster: imageFromSlot({ image: 'commercial-poster', alt: 'A frame of AutoLander’s Slow Day commercial: a salesperson in a showroom, captioned, as it runs on Facebook and Instagram Reels' }),
  close: imageFromSlot({ image: 'commercial-close', alt: 'The closing frame of the Slow Day commercial: a salesperson hands keys to a buyer in a showroom' }),
};
