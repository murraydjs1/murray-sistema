import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { LoaderCircle, Inbox } from "lucide-react";
import clsx from "clsx";
import { humanLabel } from "@/lib/ui/labels";

export function Button({variant="primary",className,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:"primary"|"secondary"|"ghost"|"danger"}){return <button className={clsx("btn",`btn-${variant}`,className)} {...props}/>}
export function Input(props:InputHTMLAttributes<HTMLInputElement>){return <input {...props}/>}
export function Select(props:SelectHTMLAttributes<HTMLSelectElement>){return <select {...props}/>}
export function Textarea(props:TextareaHTMLAttributes<HTMLTextAreaElement>){return <textarea {...props}/>}
export function Card({interactive=false,className,...props}:HTMLAttributes<HTMLElement>&{interactive?:boolean}){return <section className={clsx("card",interactive&&"card-interactive",className)} {...props}/>}
export function Badge({tone="neutral",className,...props}:HTMLAttributes<HTMLSpanElement>&{tone?:"neutral"|"brand"|"success"|"warning"|"danger"}){return <span className={clsx("badge",tone==="brand"&&"badge-brand",tone==="success"&&"badge-green",tone==="warning"&&"badge-warn",tone==="danger"&&"badge-danger",className)} {...props}/>}
export function StatusBadge({status}:{status:string}){const tone=status==="REALIZADO"||status==="ACTIVE"?"success":status==="PENDIENTE"||status.includes("ESPERANDO")?"warning":status==="CANCELADO"||status==="VOID"?"danger":status==="CONFIRMADO"?"brand":"neutral";return <Badge tone={tone}>{humanLabel(status)}</Badge>}
export function PageHeader({eyebrow,title,description,action}:{eyebrow?:string;title:string;description?:string;action?:ReactNode}){return <header className="topbar"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description&&<p className="muted">{description}</p>}</div>{action}</header>}
export function StatCard({label,value,tone}:{label:string;value:ReactNode;tone?:"success"|"warning"}){return <Card className={clsx("metric",tone&&`metric-${tone}`)}><span>{label}</span><strong>{value}</strong></Card>}
export function MoneyDisplay({currency,value,label}:{currency:"ARS"|"USD";value:string;label?:string}){return <span className="money-display">{label&&<small>{label}</small>}<b><i>{currency}</i>{value}</b></span>}
export function MobileCard(props:HTMLAttributes<HTMLElement>){return <article {...props} className={clsx("card mobile-card",props.className)}/>}
export function EmptyState({title,description,action}:{title:string;description?:string;action?:ReactNode}){return <div className="card empty"><Inbox size={28} aria-hidden/><strong>{title}</strong>{description&&<p>{description}</p>}{action}</div>}
export function LoadingState({label="Cargando…"}:{label?:string}){return <div className="loading-state" role="status"><LoaderCircle className="spin" size={20}/>{label}</div>}
export function Table({children,className,...props}:HTMLAttributes<HTMLDivElement>){return <div className={clsx("table-wrap",className)} {...props}>{children}</div>}
