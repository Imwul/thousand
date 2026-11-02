const paths={
  question:'M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5m0 4h.01 M5 3h14v18H5z',
  scene:'M3 5h18v14H3z M3 10h18 M8 5l3 5 M14 5l3 5',
  area:'M3 3h7v7H3z M14 14h7v7h-7z M10 6h7v8 M6 10v7h8',
  arrival:'M12 3l9 17H3z M12 9v5m0 3h.01',
  npc:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M4 21v-2a8 8 0 0 1 16 0v2',
  travel:'M3 12h18 M14 5l7 7-7 7 M3 5h4M3 19h4',
  surprise:'M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8 3 3M19 5l-3 3M8 16l-3 3 M12 9l3 3-3 3-3-3z',
  inspiration:'M12 3l3 6 6 3-6 3-3 6-3-6-6-3 6-3z',
  door:'M5 21V3h14v18 M2 21h20 M14 12h.01',
  resolution:'M5 3h14l2 9-9 9-9-9z M3 12h18M5 3l7 18 7-18',
  book:'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3z M12 6v16',
  history:'M3 4v5h5 M3 9a9 9 0 1 1 1 10 M12 7v6l4 2',
  save:'M5 3h12l4 4v14H3V3z M7 3v6h10V3 M7 21v-8h10v8',
  search:'M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12 M15 15l6 6',
  close:'M5 5l14 14M19 5 5 19',
  pin:'M8 3h8l-1 6 4 4H5l4-4z M12 13v9',
  arrow:'M4 12h16M14 6l6 6-6 6',
  dice:'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z',
  hex:'m12 2 8.7 5v10L12 22l-8.7-5V7z M8 15l3-6 2 4 2-2 2 4z',
  combat:'m4 3 3 1 13 13-3 3L4 7z M14 17l6-6 M14 3l-3 3 M7 14l-4 4 3 3 4-4 M4 11l6 6',
  stress:'M9 21v-4H6v-5H3l3-5a7 7 0 0 1 14 2c0 3-1 5-3 7v5 M9 10h2l1-3 2 6 1-3h2',
  copy:'M8 8h13v13H8z M16 8V3H3v13h5',
  download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  chevron:'M5 9l7 7 7-7',
  plus:'M12 4v16M4 12h16',
  check:'M4 12l5 5L20 6'
};
export function icon(name,size=20){
  const key=Object.hasOwn(paths,name)?name:'dice';
  const pips=key==='dice'?'<g fill="currentColor" stroke="none"><circle cx="7.5" cy="7.5" r="1.35"/><circle cx="16.5" cy="7.5" r="1.35"/><circle cx="12" cy="12" r="1.35"/><circle cx="7.5" cy="16.5" r="1.35"/><circle cx="16.5" cy="16.5" r="1.35"/></g>':'';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[key]}"/>${pips}</svg>`;
}
export function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
