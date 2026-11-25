/** `blind=1` (gold-set rating, spec §5.3): hide the app's verdict — band, display score,
 *  reasons, grades, badges and advice — and leave the chart itself. Additive URL flag. */
export const BLIND = typeof location !== 'undefined' && new URLSearchParams(location.search).get('blind') === '1';
