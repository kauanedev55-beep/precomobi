import {Link} from "react-router-dom";
import type {PriceReport} from "../services/api";
import {formatDateTime,formatPrice} from "../lib/format";
import {saleLabel} from "../lib/quantities";
import {ConfirmPriceButton} from "./ConfirmPriceButton";
import {ProductArt} from "./ProductArt";
import {SourceBadge} from "./SourceBadge";
export function CommunityPriceCard({report,mine=false,onConfirmed}: {report:PriceReport;mine?:boolean;onConfirmed?:(updated:{confirmations_count:number;confirmed_by_me:boolean})=>void}) {
  const contribution=`/contribuir?${new URLSearchParams({produto:String(report.product_id),mercado:String(report.market_id)})}`;
  return <article className="community-price-card">
    <div className="community-product"><ProductArt category={null} imageUrl={report.image_url} name={report.product_name} size={64}/><div><strong><Link to={`/produtos/${report.product_id}`}>{report.product_name}</Link></strong><p>{report.market_name}{report.market_city?` · ${report.market_city}`:""}</p></div></div>
    <p className="community-card-price">{formatPrice(report.price)} <small>/ {saleLabel(report.sale_unit)}</small></p>
    <p className="community-observed">Informado em {formatDateTime(report.reported_at)}</p>
    {report.source_type==="community"?<small>{report.is_mine?"Compartilhado por você":"Compartilhado por outra pessoa"}</small>:<SourceBadge sourceType={report.source_type}/>}
    {report.notes&&<details className="community-notes"><summary>Ver observação</summary><p>{report.notes}</p></details>}
    <div className="community-actions">{!mine&&report.source_type==="community"&&<ConfirmPriceButton reportId={report.id} count={report.confirmations_count} confirmedByMe={report.confirmed_by_me} isMine={report.is_mine} onConfirmed={updated=>onConfirmed?.(updated)}/>}<Link className="text-button" to={contribution}>{mine?"Informar novo preço":"Encontrou outro valor?"}</Link></div>
    {mine&&<small>{report.confirmations_count} {report.confirmations_count===1?"pessoa confirmou":"pessoas confirmaram"}</small>}
  </article>;
}
