/** A real stock photograph, decorative and unrelated to any specific market. */
export function ShoppingPhoto({className=""}: {className?: string}) {
  return <div className={`shopping-photo ${className}`}><img src="/photos/sacolas-compras.jpg" alt="" width="900" height="900" loading="lazy"/><span>Da lista para a sua casa</span></div>;
}
