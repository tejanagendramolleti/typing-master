/**
 * The prices.
 *
 * The money is in paise everywhere in the application — an amount is never
 * held as a fraction — and it is turned into a string at the last moment,
 * where it is shown.
 */

/**
 * Formats a price in paise as rupees.
 *
 * The whole amount has no decimals, and a part amount has two.
 */
export function formatPrice(paise: number, currency: string): string {
  const amount = paise / 100
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : ''
  return `${symbol}${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`
}
