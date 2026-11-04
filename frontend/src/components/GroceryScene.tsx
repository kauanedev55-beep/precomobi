/** Original vector artwork: decorative groceries, never product or price data. */
export function GroceryScene({className=""}: {className?: string}) {
  return <svg className={`grocery-scene ${className}`} viewBox="0 0 560 440" fill="none" aria-hidden="true" focusable="false">
    <ellipse cx="292" cy="391" rx="199" ry="22" fill="#d4c3ac" opacity=".45"/>
    <path d="M70 235C70 116 157 44 283 51c129 8 211 68 210 187-1 106-90 148-217 144C150 378 70 340 70 235Z" fill="#f1d7ac"/>
    <path d="M106 226c-21-50 3-115 60-139" stroke="#fffcf7" strokeWidth="3" strokeLinecap="round" opacity=".65"/>
    {/* Loaf, greens and a milk carton behind the bag. */}
    <g transform="rotate(-20 205 196)"><rect x="173" y="72" width="60" height="225" rx="30" fill="#b87a3e"/><rect x="168" y="68" width="60" height="218" rx="30" fill="#e6b66e"/><path d="m185 104 24 14m-29 22 24 14m-29 22 24 14m-29 22 24 14" stroke="#f8dbac" strokeWidth="9" strokeLinecap="round"/></g>
    <path d="M322 254c12-57 12-101-1-155" stroke="#537048" strokeWidth="7" strokeLinecap="round"/>
    <path d="M322 181c-54-1-75-41-48-65 32 1 52 22 48 65Z" fill="#6e8d59"/>
    <path d="M326 151c-22-52-4-87 23-90 26 22 15 60-23 90Z" fill="#8da66a"/>
    <path d="M328 190c5-51 38-75 70-56 0 30-27 55-70 56Z" fill="#58794e"/>
    <path d="M330 213c21-31 56-39 78-17-10 29-42 39-78 17Z" fill="#91a96e"/>
    <g transform="rotate(9 365 215)"><path d="m337 157 20-27h38l20 27v145h-78V157Z" fill="#fffcf7"/><path d="m337 157 20-27h38l-19 27h-39Z" fill="#c6d6e5"/><path d="m376 157 19-27 20 27v145h-39V157Z" fill="#d9e5ee"/><path d="M337 190h39v56h-39z" fill="#6688a7"/><path d="M344 217c10-14 18-14 26 0-8 14-16 14-26 0Z" fill="#fff8ed"/><rect x="361" y="122" width="25" height="10" rx="3" fill="#29466c"/></g>
    <path d="M207 252v-63c0-38 28-63 61-63s61 25 61 63v63" stroke="#966036" strokeWidth="12"/>
    <path d="m150 222 224-8-13 169c-1 12-10 20-23 20H174c-13 0-22-8-23-20l-1-161Z" fill="#bb7d49"/>
    <path d="m150 222 189 6 22 155c2 12-9 20-23 20H174c-13 0-22-8-23-20l-1-161Z" fill="#d39b65"/>
    <path d="m339 228 35-14-13 169-22-155Z" fill="#a76b3f"/>
    <path d="m150 222 17-17 189-5 18 14-35 14-189-6Z" fill="#e5b47e"/>
    <path d="M199 240v-52c0-36 27-61 60-61s60 25 60 61v52" stroke="#f0c58f" strokeWidth="10" strokeLinecap="round"/>
    <rect x="206" y="277" width="83" height="84" rx="20" fill="#fff4df" transform="rotate(-4 206 277)"/>
    <path d="m224 309 49-3-4 28-40 3-5-28Zm9-3 6-15m19 14-7-15m-12 25 1 12m14-13 1 12" stroke="#29466c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Fresh produce on the countertop. */}
    <path d="M106 321c-30-20-66 6-60 37 5 32 31 45 51 36 23 10 50-10 52-38 3-27-20-42-43-35Z" fill="#cf6752"/>
    <path d="m101 325 2-21m-2 12c14-20 28-18 34-12-9 14-20 18-34 12Z" stroke="#52704b" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M63 349c2-10 8-15 15-17" stroke="#eaa08c" strokeWidth="6" strokeLinecap="round"/>
    <circle cx="417" cy="354" r="42" fill="#e6a147"/><path d="M409 314c3-17 16-22 29-16-4 14-15 20-29 16Z" fill="#6e8d59"/>
    <path d="M393 341c3-6 7-9 12-10" stroke="#f5c678" strokeWidth="6" strokeLinecap="round"/>
    <g transform="rotate(15 457 218)"><path d="M427 192h49l20 26-20 26h-49v-52Z" fill="#f8eee0"/><circle cx="441" cy="207" r="4" fill="#d0b690"/><path d="m448 222 8 7 14-16" stroke="#29466c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></g>
    <path d="M118 126v18m-9-9h18m309-48v18m-9-9h18" stroke="#bf8a4c" strokeWidth="3" strokeLinecap="round"/>
  </svg>;
}
