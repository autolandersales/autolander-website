// The /dealership-websites/ illustrations as responsive images. A module of its own, apart from page-images.js, so
// no other route's chunk carries this page's alt text (the same split as ai-images.js).
import { ILLUSTRATIONS } from './dealer-websites-content.js';
import { imageFromSlot } from './page-images.js';

export const WEBSITE_IMAGES = {
  hero: imageFromSlot(ILLUSTRATIONS.hero),
  vehicle: imageFromSlot(ILLUSTRATIONS.vehicle),
  readable: imageFromSlot(ILLUSTRATIONS.readable),
};
