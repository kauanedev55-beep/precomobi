const paths = {
  basket: "M3 9h18l-2 12H5L3 9Zm4 0 3-6m7 6-3-6M9 13v4m6-4v4",
  store: "M3 10h18l-2-7H5l-2 7Zm2 0v11h14V10M9 21v-7h6v7M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0",
  home: "m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7",
  list: "M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1",
  tag: "M20 13 11 22 2 13V3h10l8 8a1.5 1.5 0 0 1 0 2ZM7 8h.01",
  people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM16 3a4 4 0 0 1 0 8",
  search: "m21 21-5-5M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  plus: "M12 5v14M5 12h14",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  check: "m4 12 5 5L20 6",
} as const;
export function Icon({ name, size = 22 }: { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
