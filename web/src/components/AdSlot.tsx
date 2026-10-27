/**
 * AdSlot (v1: renders nothing).
 *
 * The layout reserves space for ads in v2 without shifting content today:
 * this component returns null until AdSense is enabled. When ready:
 *  1. Paste the AdSense script into index.html (see the commented block).
 *  2. Fill in public/ads.txt with your publisher snippet.
 *  3. Make this component render the <ins class="adsbygoogle"> unit.
 * Keeping the component mounted (as null) means page structure and SEO
 * selectors stay stable between v1 and v2.
 */
export function AdSlot({ slot, label }: { slot: string; label: string }) {
  void slot
  void label
  return null
}
