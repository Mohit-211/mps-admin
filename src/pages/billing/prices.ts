import { CURRENCIES, type Currency, type PlanPrice, type Subscription } from "../../api/billing";

/** A plan's dated prices for one currency, split into history / the price in effect now / scheduled ones. */
export function pricesByCurrency(prices: PlanPrice[], now = new Date()) {
  return CURRENCIES.map((currency: Currency) => {
    const list = prices
      .filter((p) => p.currency === currency)
      .sort((a, b) => new Date(a.effective_from).getTime() - new Date(b.effective_from).getTime());
    const past = list.filter((p) => new Date(p.effective_from) <= now);
    const current = past.length ? past[past.length - 1] : null;
    return {
      currency,
      current,
      upcoming: list.filter((p) => new Date(p.effective_from) > now),
      history: past.slice(0, -1).reverse(),
    };
  });
}

/** A subscription's monthly amount: first + (paid − 1) × additional. */
export function monthlyAmount(s: Pick<Subscription, "price" | "paid_quantity">) {
  return s.price.first + Math.max(0, s.paid_quantity - 1) * s.price.additional;
}
