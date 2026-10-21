// Shared by React, the static mirrors and page-specific image preloads.
export const IMAGE_CLASS = 'block h-auto w-full rounded-3xl border border-white/10 shadow-2xl shadow-blue-950/50';
export const IMAGE_SIZES = {
  aiHero: '(min-width: 1280px) 584px, (min-width: 1024px) calc(49vw - 43px), calc(100vw - 48px)',
  aiCard: '(min-width: 1280px) 602px, (min-width: 1024px) calc(50vw - 36px), calc(100vw - 48px)',
  aiReport: '(min-width: 1280px) 544px, (min-width: 1024px) calc(45vw - 32px), calc(100vw - 48px)',
  aiResults: '(min-width: 1280px) 797px, (min-width: 1024px) calc(66vw - 48px), calc(100vw - 48px)',
  teamHero: '(min-width: 1280px) 566px, (min-width: 1024px) calc(47.5vw - 42px), calc(100vw - 48px)',
  teamAutopilot: '(min-width: 944px) 896px, calc(100vw - 48px)',
  teamDashboard: '(min-width: 1280px) 814px, (min-width: 1024px) calc(67.5vw - 49px), calc(100vw - 48px)',
  adsPoster: '(min-width: 1024px) 340px, min(100vw - 48px, 340px)',
  adsClose: '(min-width: 1024px) 388px, min(100vw - 80px, 328px)',
  teamAccess: '(min-width: 1280px) 735px, (min-width: 1024px) calc(64vw - 84px), (min-width: 640px) calc(100vw - 106px), calc(100vw - 90px)',
  websitesHero: '(min-width: 1344px) 650px, (min-width: 1101px) calc(53vw - 63px), (min-width: 851px) calc(53vw - 50px), (min-width: 541px) min(640px, calc(100vw - 64px)), calc(100vw - 40px)',
  websitesBuild: '(min-width: 1344px) 608px, (min-width: 1101px) calc(50vw - 64px), (min-width: 851px) calc(50vw - 52px), (min-width: 541px) min(640px, calc(100vw - 64px)), calc(100vw - 40px)',
  websitesWide: '(min-width: 1024px) 960px, (min-width: 541px) calc(100vw - 64px), calc(100vw - 40px)',
};

export const imageSrcSet = (image, format) => image.widths.map((width) => `${image.base}-${width}.${format} ${width}w`).join(', ');

export function responsiveImageProps(image, { sizes, eager = false, className = IMAGE_CLASS } = {}) {
  if (!sizes) throw new Error(`Explicit sizes required for ${image.base}`);
  return {
    sources: ['avif', 'webp'].map((format) => ({ type: `image/${format}`, srcSet: imageSrcSet(image, format), sizes })),
    img: { src: `${image.base}-${image.widths.includes(960) ? 960 : image.widths[0]}.webp`, width: image.width, height: image.height,
      alt: image.alt, loading: eager ? 'eager' : 'lazy', decoding: 'async', fetchPriority: eager ? 'high' : undefined, className },
  };
}

const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll("'", '&#39;');
const attributes = (values) => Object.entries(values).filter(([, value]) => value !== undefined)
  .map(([key, value]) => `${({ srcSet: 'srcset', fetchPriority: 'fetchpriority', className: 'class' })[key] || key}="${escape(value)}"`).join(' ');

export function responsiveImageHtml(image, options) {
  const { sources, img } = responsiveImageProps(image, options);
  return `<picture>${sources.map((source) => `<source ${attributes(source)} />`).join('')}<img ${attributes(img)} /></picture>`;
}

export function imagePreloadHtml(image, sizes) {
  return `<link rel="preload" as="image" type="image/avif" imagesrcset="${escape(imageSrcSet(image, 'avif'))}" imagesizes="${escape(sizes)}" fetchpriority="high" />`;
}
