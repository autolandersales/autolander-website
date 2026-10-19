import { useEffect, useId, useRef, useState } from 'react';
import { CarFront, ChevronDown, Menu } from 'lucide-react';

const SECTION_LINKS = [
  ['how-it-works', 'How It Works'],
  ['features', 'Features'],
  ['pricing', 'Pricing'],
  ['studio', 'AI Studio'],
];

const SERVICES = [
  ['/aeo-geo-for-car-dealers/', 'AEO & GEO'],
  ['/team/', 'Team Plans'],
  ['/meta-ads-for-car-dealers/', 'Paid Ads & AI Commercials'],
  ['/dealership-websites/', 'Dealership Websites'],
];

const navLinkClass = 'text-xs font-semibold text-slate-400 transition-all hover:text-white lg:text-sm';
const menuLinkClass = 'block rounded-xl px-3 py-2 text-sm font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white focus-visible:outline-none';

function ServiceLinks({ onNavigate }) {
  return SERVICES.map(([href, label]) => (
    <a key={href} href={href} onClick={onNavigate} className={menuLinkClass} role="menuitem">
      {label}
    </a>
  ));
}

/**
 * Shared navigation for the homepage and focused landing pages.
 *
 * Homepage section links retain their deferred-section click handlers. On every
 * other route the same links point back to the corresponding homepage anchors.
 */
export default function SiteNav({
  page = 'home',
  isMobileNavVisible = true,
  onSectionNavigate,
  showDownloadButtons = false,
  onDownload,
  onPrimaryAction,
  onPrimaryWarm,
}) {
  const [desktopServicesHovered, setDesktopServicesHovered] = useState(false);
  const [desktopServicesPinned, setDesktopServicesPinned] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef(null);
  const desktopServicesButtonRef = useRef(null);
  const mobileServicesButtonRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  const idPrefix = useId().replace(/:/g, '');
  const desktopServicesId = `${idPrefix}-desktop-services`;
  const mobileServicesId = `${idPrefix}-mobile-services`;
  const mobileMenuId = `${idPrefix}-mobile-menu`;
  const isHome = page === 'home';
  const isAiVisibility = page === 'ai-visibility';
  const isPaidAds = page === 'paid-ads';
  const isDealerWebsites = page === 'dealer-websites';
  // Pages whose primary action is an in-page form: a real link, so it works before hydration and without JS.
  const primaryHref = isAiVisibility ? '#scan-form' : isPaidAds ? '#apply-form' : isDealerWebsites ? '#website-request-form' : '';
  const desktopServicesOpen = desktopServicesHovered || desktopServicesPinned;

  const closeMenus = () => {
    setDesktopServicesHovered(false);
    setDesktopServicesPinned(false);
    setMobileServicesOpen(false);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const onOutsidePointer = (event) => {
      if (!navRef.current?.contains(event.target)) closeMenus();
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      const focusTarget = desktopServicesOpen
        ? desktopServicesButtonRef.current
        : mobileServicesOpen
          ? mobileServicesButtonRef.current
          : mobileMenuOpen
            ? mobileMenuButtonRef.current
            : null;
      closeMenus();
      focusTarget?.focus();
    };
    document.addEventListener('pointerdown', onOutsidePointer);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onOutsidePointer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [desktopServicesOpen, mobileMenuOpen, mobileServicesOpen]);

  const primaryLabel = isAiVisibility
    ? 'Get my free scan'
    : isPaidAds
      ? 'Apply now'
    : isDealerWebsites
      ? 'Plan my website'
    : page === 'team'
      ? 'Book Team Demo'
      : 'Book Demo';

  const primaryClass = 'whitespace-nowrap rounded-xl bg-white px-3 py-2 text-xs font-bold text-black shadow-lg transition-all hover:bg-blue-500 hover:text-white active:scale-95 sm:px-4 sm:py-2.5 md:px-2 lg:px-4 lg:text-sm xl:px-6';
  const demoIntentHandlers = primaryHref ? {} : {
    'data-demo-application-trigger': 'true',
    onPointerEnter: onPrimaryWarm,
    onPointerDown: onPrimaryAction,
    onFocus: onPrimaryWarm,
    onTouchStart: onPrimaryWarm,
  };

  return (
    <nav
      ref={navRef}
      aria-label="Main navigation"
      className={`fixed top-0 z-50 w-full px-4 py-4 transition-transform duration-300 ease-out motion-reduce:transition-none sm:px-6 ${isMobileNavVisible ? 'translate-y-0' : '-translate-y-full md:translate-y-0'}`}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between rounded-2xl border border-white/10 bg-black/80 px-3 shadow-2xl sm:h-16 sm:px-4 md:bg-black/40 md:px-2 md:backdrop-blur-xl lg:px-4 xl:px-6">
        <button
          type="button"
          aria-label="Back to top"
          className="group flex shrink-0 cursor-pointer items-center space-x-2 border-0 bg-transparent p-0 text-left sm:space-x-3"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <span className="hidden h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 transition-transform duration-300 group-hover:scale-110 xl:flex">
            <CarFront className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          </span>
          <img
            src="/autolander-logo-240.webp"
            srcSet="/autolander-logo-200.webp 200w, /autolander-logo-240.webp 240w, /autolander-logo.png 400w"
            sizes="(min-width: 640px) 187px, 107px"
            alt="AutoLander"
            width="400"
            height="120"
            decoding="async"
            className="h-8 w-auto transition-transform duration-300 group-hover:scale-105 sm:h-9 xl:h-14"
          />
        </button>

        <div className="hidden items-center space-x-1.5 md:flex lg:space-x-4 xl:space-x-8">
          {SECTION_LINKS.map(([sectionId, label]) => (
            <a
              key={sectionId}
              href={isHome ? `#${sectionId}` : `/#${sectionId}`}
              onClick={isHome ? onSectionNavigate?.(sectionId) : undefined}
              className={navLinkClass}
            >
              {label}
            </a>
          ))}
          <div
            className="relative"
            onPointerEnter={() => setDesktopServicesHovered(true)}
            onPointerLeave={() => setDesktopServicesHovered(false)}
          >
            <button
              ref={desktopServicesButtonRef}
              type="button"
              aria-expanded={desktopServicesOpen}
              aria-controls={desktopServicesId}
              aria-haspopup="menu"
              onClick={() => setDesktopServicesPinned((open) => !open)}
              className={`${navLinkClass} flex items-center gap-1 border-0 bg-transparent p-0`}
            >
              Services
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${desktopServicesOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            <div
              id={desktopServicesId}
              role="menu"
              aria-hidden={!desktopServicesOpen}
              className={`absolute left-1/2 top-full w-56 -translate-x-1/2 pt-3 transition ${desktopServicesOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'}`}
            >
              <div className="rounded-2xl border border-white/10 bg-black/80 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl">
                <ServiceLinks onNavigate={closeMenus} />
              </div>
            </div>
          </div>
          <a href="/guide/how-to-sell-cars-on-facebook-marketplace/" className={`${navLinkClass} hidden xl:inline`}>Dealer Guide</a>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-1 lg:gap-2 xl:gap-4">
          {/* At phone widths one compact menu prevents Blog, Training and Services from overflowing. */}
          <div className="relative sm:hidden">
            <button
              ref={mobileMenuButtonRef}
              type="button"
              aria-label="Open site links"
              aria-expanded={mobileMenuOpen}
              aria-controls={mobileMenuId}
              aria-haspopup="menu"
              onClick={() => {
                setMobileMenuOpen((open) => !open);
                setMobileServicesOpen(false);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
            <div
              id={mobileMenuId}
              role="menu"
              aria-hidden={!mobileMenuOpen}
              className={`absolute right-0 top-full w-56 pt-3 transition ${mobileMenuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'}`}
            >
              <div className="rounded-2xl border border-white/10 bg-black/90 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl">
                <a href="/blog/" onClick={closeMenus} className={menuLinkClass} role="menuitem">Blog</a>
                <a href="/training/" onClick={closeMenus} className={menuLinkClass} role="menuitem">Training</a>
                <p className="mb-1 mt-2 px-3 font-mono text-[9px] font-bold uppercase tracking-widest text-slate-500">Services</p>
                <ServiceLinks onNavigate={closeMenus} />
              </div>
            </div>
          </div>

          <a href="/blog/" className="hidden whitespace-nowrap text-xs font-bold text-slate-400 transition-colors hover:text-white sm:inline lg:text-sm">Blog</a>
          <a href="/training/" className="hidden whitespace-nowrap text-xs font-bold text-slate-400 transition-colors hover:text-white sm:inline lg:text-sm">Training</a>

          <div className="relative hidden sm:block md:hidden">
            <button
              ref={mobileServicesButtonRef}
              type="button"
              aria-expanded={mobileServicesOpen}
              aria-controls={mobileServicesId}
              aria-haspopup="menu"
              onClick={() => setMobileServicesOpen((open) => !open)}
              className="flex items-center gap-1 whitespace-nowrap text-xs font-bold text-slate-400 transition-colors hover:text-white lg:text-sm"
            >
              Services
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${mobileServicesOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            <div
              id={mobileServicesId}
              role="menu"
              aria-hidden={!mobileServicesOpen}
              className={`absolute right-0 top-full w-56 pt-3 transition ${mobileServicesOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'}`}
            >
              <div className="rounded-2xl border border-white/10 bg-black/90 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl">
                <ServiceLinks onNavigate={closeMenus} />
              </div>
            </div>
          </div>

          {showDownloadButtons && (
            <button
              type="button"
              onClick={onDownload}
              className="whitespace-nowrap text-xs font-bold text-slate-400 transition-colors hover:text-white lg:text-sm"
            >
              Download
            </button>
          )}

          {primaryHref ? (
            <a href={primaryHref} onClick={onPrimaryAction} className={primaryClass}>{primaryLabel}</a>
          ) : (
            <button
              type="button"
              {...demoIntentHandlers}
              onClick={onPrimaryAction}
              className={primaryClass}
            >
              {primaryLabel}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export { SERVICES as SITE_SERVICES };
