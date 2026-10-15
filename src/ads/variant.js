// ?v=a (default, the build prerenders it) = the free-commercial headline; ?v=b = the free ad review headline, for
// the ad set that sells the review. Anything else is 'a'.
export function paidAdsVariantFromSearch(search) {
  const value = new URLSearchParams(search || '').get('v');
  return value && /^b$/i.test(value) ? 'b' : 'a';
}
