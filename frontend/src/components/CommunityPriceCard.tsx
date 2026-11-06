import {Link} from "react-router-dom";
import type {PriceReport} from "../services/api";
import {formatDateTime,formatPrice} from "../lib/format";
import {saleLabel} from "../lib/quantities";
import {ConfirmPriceButton} from "./ConfirmPriceButton";
export function CommunityPriceCard({report,mine=false,onConfirmed}: {report:PriceReport;mine?:boolean;onConfirmed?:()=>void}) {
  return <article className="community-price-card"><strong><Link to={`/produtos/${report.product_id}`}>{report.product_name}</Link></strong><p>{report.market_name}</p><p className="community-card-price">{formatPrice(report.price)} <small>/ {saleLabel(report.sale_unit)}</small></p><p>{formatDateTime(report.reported_at)}</p><p>{report.is_mine ? "Compartilhado por você" : "Compartilhado por outra pessoa"} · {report.confirmations_count} confirmações</p>{report.notes && <p>{report.notes}</p>}{!mine && <ConfirmPriceButton reportId={report.id} count={report.confirmations_count} confirmedByMe={report.confirmed_by_me} isMine={report.is_mine} onConfirmed={()=>onConfirmed?.()}/>}</article>;
}
