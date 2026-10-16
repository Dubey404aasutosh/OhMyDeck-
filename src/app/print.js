/* ============================================================
   PRINT / PDF — renders every slide as one 16:9 page and opens
   the browser print dialog ("Save as PDF").
   ============================================================ */

import { renderSlide } from './render.js';
import { h, toast } from './util.js';

export async function printDeck(deck) {
  document.querySelector('#print-root')?.remove();
  const root = h('div#print-root');
  for (const slide of deck.slides) {
    const canvas = renderSlide(slide, deck);
    root.append(h('div.print-page', null, canvas));
  }
  document.body.append(root);

  toast('Preparing PDF… choose “Save as PDF” in the print dialog.');
  await Promise.all(
    [...root.querySelectorAll('img')].map((img) => (img.complete ? null : img.decode().catch(() => null)))
  );
  await document.fonts?.ready;

  const cleanup = () => {
    root.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}
