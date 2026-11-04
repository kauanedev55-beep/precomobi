import { Link } from "react-router-dom";
import { Icon } from "./Icon";

export type PhotoCardProps = {
  src: string; alt: string; title: string; eyebrow: string; description: string;
  action: string; to: string; credit: string; source: string; className?: string; eager?: boolean;
};

/** The whole photograph opens its destination in a single action. */
export function PhotoCard({src,title,eyebrow,action,to,className="",eager=false}: PhotoCardProps) {
  return <Link to={to} className={`photo-card ${className}`} aria-label={`${action}: ${title}`}>
    <img src={src} alt="" width="900" height="900" loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"}/>
    <span className="photo-card-top"><span>{eyebrow}</span><i aria-hidden="true"><Icon name="arrow" size={24}/></i></span>
    <span className="photo-card-copy"><strong>{title}</strong><span>{action}<Icon name="arrow" size={18}/></span></span>
  </Link>;
}
