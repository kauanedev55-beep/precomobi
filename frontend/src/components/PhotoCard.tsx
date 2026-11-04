import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./Icon";

export type PhotoCardProps = {
  src: string; alt: string; title: string; eyebrow: string; description: string;
  action: string; to: string; credit: string; source: string; className?: string; eager?: boolean;
};

export function PhotoCard({src,alt,title,eyebrow,description,action,to,credit,source,className="",eager=false}: PhotoCardProps) {
  const dialog=useRef<HTMLDialogElement>(null);
  const opener=useRef<HTMLButtonElement>(null);
  const [open,setOpen]=useState(false);
  const id=useId();
  useEffect(() => {
    if(!open) return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return () => {document.body.style.overflow=previous;};
  }, [open]);
  function show() {if(dialog.current && !dialog.current.open) {dialog.current.showModal();setOpen(true);}}
  function close() {dialog.current?.close();}
  return <>
    <button ref={opener} type="button" className={`photo-card ${className}`} onClick={show} aria-haspopup="dialog" aria-label={`Expandir: ${title}`}>
      <img src={src} alt="" width="900" height="900" loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"}/>
      <span className="photo-card-top"><span>{eyebrow}</span><i aria-hidden="true"><Icon name="plus" size={24}/></i></span>
      <span className="photo-card-copy"><strong>{title}</strong><span>Toque para conhecer <Icon name="arrow" size={18}/></span></span>
    </button>
    <dialog ref={dialog} className="photo-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onClose={() => {setOpen(false);opener.current?.focus();}} onClick={e => {if(e.target===e.currentTarget) close();}}>
      <div className="photo-dialog-toolbar"><button className="photo-dialog-close" type="button" onClick={close} autoFocus>Fechar <span aria-hidden="true">×</span></button></div>
      <div className="photo-dialog-layout"><div className="photo-dialog-picture"><img src={src} alt={alt} width="900" height="900"/><span>Fotografia ilustrativa</span></div><div className="photo-dialog-content"><span className="photo-eyebrow">{eyebrow}</span><h2 id={`${id}-title`}>{title}</h2><p id={`${id}-description`}>{description}</p><Link className="primary-button" to={to} onClick={close}>{action}<Icon name="arrow" size={18}/></Link><p className="photo-dialog-note">A imagem não identifica uma unidade cadastrada. Foto: <a href={source} target="_blank" rel="noopener noreferrer">{credit}</a>.</p></div></div>
    </dialog>
  </>;
}
