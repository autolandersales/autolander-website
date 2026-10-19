import { useEffect, useRef, useState } from 'react';
import { CarFront } from 'lucide-react';

const MailLink = ({ email = 'sales@autolander.ai', subject = 'AutoLander support', children, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);
  const encodedSubject = encodeURIComponent(subject);
  const options = [
    { label: 'Gmail', href: `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodedSubject}` },
    { label: 'Outlook', href: `https://outlook.office.com/mail/deeplink/compose?to=${email}&subject=${encodedSubject}` },
    { label: 'Default mail app', href: `mailto:${email}?subject=${encodedSubject}` },
  ];

  useEffect(() => {
    if (!open) return undefined;
    const onDocumentClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, [open]);

  const copy = () => {
    navigator.clipboard?.writeText(email)?.catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={{ font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', color: 'inherit' }}
        className={`cursor-pointer border-0 bg-transparent p-0 ${className}`}
      >
        {children}
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 z-[60] mb-2 w-48 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d12] p-1.5 text-left shadow-2xl shadow-blue-950/50">
          <p className="px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest text-slate-500">Email {email}</p>
          {options.map((option) => (
            <a
              key={option.label}
              href={option.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-xs font-bold normal-case tracking-normal text-slate-200 transition hover:bg-white/10"
            >
              {option.label}
            </a>
          ))}
          <button
            type="button"
            onClick={copy}
            className="block w-full rounded-xl px-3 py-2 text-left text-xs font-bold normal-case tracking-normal text-slate-200 transition hover:bg-white/10"
          >
            {copied ? 'Copied' : 'Copy address'}
          </button>
        </div>
      )}
    </span>
  );
};

const FOOTER_LINK = 'block py-1 transition-colors hover:text-blue-500';

// `columns` replaces the site-wide link columns with a page's own (e.g. the AEO and GEO page keeps
// its footer on topic). Each column: { heading, links: [{ label, href, mail? }] }.
function PageColumns({ columns }) {
  return columns.map((column) => (
    <nav key={column.heading} aria-label={column.heading} className="flex flex-col items-start gap-1 text-[13px] font-semibold text-slate-400">
      <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{column.heading}</h3>
      {column.links.map((link) => (link.mail
        ? <MailLink key={link.label} className={FOOTER_LINK}>{link.label}</MailLink>
        : <a key={link.label} href={link.href} className={FOOTER_LINK}>{link.label}</a>))}
    </nav>
  ));
}

export default function SiteFooter({ extraLine = '', mobileCtaPadding = false, columns = null }) {
  return (
    <footer className={`border-t border-white/5 bg-black py-12 sm:py-16 lg:py-20 ${mobileCtaPadding ? 'pb-28 md:pb-16 lg:pb-20' : ''}`}>
      <div className="mx-auto max-w-7xl px-6">
        <div className={`grid grid-cols-2 gap-x-6 gap-y-8 sm:gap-x-8 sm:gap-y-10 ${columns ? 'sm:grid-cols-4' : 'sm:grid-cols-4 lg:grid-cols-5'}`}>
          <div className="col-span-2 flex items-center space-x-3 sm:col-span-4 lg:col-span-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <CarFront className="h-6 w-6 text-white" />
            </div>
            <img
              src="/autolander-logo-240.webp"
              srcSet="/autolander-logo-200.webp 200w, /autolander-logo-240.webp 240w, /autolander-logo.png 400w"
              sizes="160px"
              alt="AutoLander"
              width="400"
              height="120"
              loading="lazy"
              decoding="async"
              className="h-12 w-auto"
            />
          </div>

          {columns ? <PageColumns columns={columns} /> : (<>
          <nav aria-label="Product" className="flex flex-col items-start gap-1 text-[13px] font-semibold text-slate-400">
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Product</h3>
            <a href="/facebook-marketplace-auto-poster/" className="block py-1 transition-colors hover:text-blue-500">Auto Poster</a>
            <a href="/facebook-marketplace-listing-software/" className="block py-1 transition-colors hover:text-blue-500">Listing Software</a>
            <a href="/facebook-marketplace-automation/" className="block py-1 transition-colors hover:text-blue-500">Automation</a>
            <a href="/facebook-marketplace-assistant/" className="block py-1 transition-colors hover:text-blue-500">Assistant</a>
            <a href="/facebook-autoposter/" className="block py-1 transition-colors hover:text-blue-500">Autoposter</a>
            <a href="/facebook-marketplace-inventory-sync/" className="block py-1 transition-colors hover:text-blue-500">Inventory Sync</a>
            <a href="/bulk-post-cars-to-facebook-marketplace/" className="block py-1 transition-colors hover:text-blue-500">Bulk Posting</a>
            <a href="/ai-chat-for-car-dealers/" className="block py-1 transition-colors hover:text-blue-500">AI Chat</a>
            <a href="/ai-car-photo-editor/" className="block py-1 transition-colors hover:text-blue-500">AI Photo Editor</a>
            <a href="/rv-dealer-software/" className="block py-1 transition-colors hover:text-blue-500">RV Dealers</a>
            <a href="/safest-facebook-marketplace-auto-poster/" className="block py-1 transition-colors hover:text-blue-500">Account Safety</a>
            <a href="/facebook-marketplace-auto-poster-pricing/" className="block py-1 transition-colors hover:text-blue-500">Pricing</a>
            <a href="/training/" className="block py-1 transition-colors hover:text-blue-500">Training</a>
          </nav>

          <nav aria-label="Integrations" className="flex flex-col items-start gap-1 text-[13px] font-semibold text-slate-400">
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Integrations</h3>
            <a href="/integrations/" className="block py-1 transition-colors hover:text-blue-500">All Integrations</a>
            <a href="/integrations/cargurus-facebook-marketplace/" className="block py-1 transition-colors hover:text-blue-500">CarGurus</a>
            <a href="/integrations/vauto-facebook-marketplace/" className="block py-1 transition-colors hover:text-blue-500">vAuto</a>
            <a href="/integrations/dealer-com-facebook-marketplace/" className="block py-1 transition-colors hover:text-blue-500">Dealer.com</a>
            <a href="/integrations/dealercenter-facebook-marketplace/" className="block py-1 transition-colors hover:text-blue-500">DealerCenter</a>
          </nav>

          <nav aria-label="Compare" className="flex flex-col items-start gap-1 text-[13px] font-semibold text-slate-400">
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Compare</h3>
            <a href="/compare/" className="block py-1 transition-colors hover:text-blue-500">All Tools</a>
            <a href="/compare/autobook/" className="block py-1 transition-colors hover:text-blue-500">vs AutoBook</a>
            <a href="/compare/shiftly/" className="block py-1 transition-colors hover:text-blue-500">vs Shiftly</a>
            <a href="/guide/how-to-sell-cars-on-facebook-marketplace/" className="block py-1 transition-colors hover:text-blue-500">How to Sell Cars</a>
            <a href="/guide/facebook-marketplace-automation/" className="block py-1 transition-colors hover:text-blue-500">Automation Guide</a>
            <a href="/facebook-ai-tools/" className="block py-1 transition-colors hover:text-blue-500">AI Tools</a>
            <a href="/facebook-listing-software/" className="block py-1 transition-colors hover:text-blue-500">Facebook Listing</a>
            <a href="/facebook-marketplace-for-car-dealers/" className="block py-1 transition-colors hover:text-blue-500">For Car Dealers</a>
            <a href="/guide/car-dealership-marketing/" className="block py-1 transition-colors hover:text-blue-500">Marketing Playbook</a>
            <a href="/guide/ai-for-car-dealerships/" className="block py-1 transition-colors hover:text-blue-500">AI for Dealerships</a>
            <a href="/aeo-geo-for-car-dealers/" className="block py-1 transition-colors hover:text-blue-500">AEO & GEO for Dealers</a>
            <a href="/meta-ads-for-car-dealers/" className="block py-1 transition-colors hover:text-blue-500">Paid Ads & AI Commercials</a>
            <a href="/dealership-websites/" className="block py-1 transition-colors hover:text-blue-500">Dealership Websites</a>
            <a href="/dealer-inventory-management/" className="block py-1 transition-colors hover:text-blue-500">Inventory Management</a>
            <a href="/why-facebook-marketplace-only/" className="block py-1 transition-colors hover:text-blue-500">Why Marketplace Only</a>
            <a href="/why-we-dont-answer-your-buyers/" className="block py-1 transition-colors hover:text-blue-500">Why No Auto-Reply</a>
          </nav>

          <nav aria-label="Company" className="flex flex-col items-start gap-1 text-[13px] font-semibold text-slate-400">
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Company</h3>
            <a href="/blog/" className="block py-1 transition-colors hover:text-blue-500">Blog</a>
            <a href="/contact/" className="block py-1 transition-colors hover:text-blue-500">Contact</a>
            <MailLink className="block py-1 transition-colors hover:text-blue-500">Support</MailLink>
            <a href="/privacy.html" className="block py-1 transition-colors hover:text-blue-500">Privacy</a>
            <a href="/terms.html" className="block py-1 transition-colors hover:text-blue-500">Terms</a>
          </nav>
          </>)}
        </div>

        <div className="mt-8 border-t border-white/5 pt-6 sm:mt-10 sm:pt-8">
          {extraLine && <p className="mb-3 max-w-4xl text-xs leading-relaxed text-slate-400">{extraLine}</p>}
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 sm:text-left">© 2026 AutoLander. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
