"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createExpense } from "@/app/actions/expenses";

type Option={id:string;name:string};
export function ExpenseForm({eventId,eventDate,categories,staff,quoteItems,suggestedPaidByStaffId}:{eventId:string;eventDate:string;categories:Option[];staff:Option[];quoteItems:Option[];suggestedPaidByStaffId?:string|null}){
 const [categoryId,setCategoryId]=useState("");
 const quick=["Combustible","Peajes","Comida post fiesta","CO2","Papelitos","Otros"];
 return <form action={createExpense.bind(null,eventId)} className="form expense-form">
  <div className="quick-expenses" aria-label="Categorías frecuentes">{quick.map(name=>{const item=categories.find(c=>c.name===name);return item?<button key={name} type="button" className={categoryId===item.id?"quick-chip selected":"quick-chip"} onClick={()=>setCategoryId(item.id)}>+ {name.replace(" post fiesta","")}</button>:null})}</div>
  <div className="form-grid">
   <div className="field"><label htmlFor="expense-category">Categoría</label><select id="expense-category" name="categoryId" value={categoryId} onChange={e=>setCategoryId(e.target.value)} required><option value="">Seleccionar</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
   <div className="field"><label htmlFor="expense-description">Descripción</label><input id="expense-description" name="description" placeholder="Ej. Nafta para el traslado" required/></div>
   <div className="field"><label htmlFor="expense-amount">Importe</label><input id="expense-amount" name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required/></div>
   <div className="field"><label htmlFor="expense-currency">Moneda</label><select id="expense-currency" name="currency" defaultValue="ARS"><option>ARS</option><option>USD</option></select></div>
   <div className="field"><label htmlFor="expense-date">Fecha</label><input id="expense-date" name="expenseDate" type="date" defaultValue={eventDate} required/></div>
   <div className="field"><label htmlFor="expense-paid-by">Pagó de su bolsillo (genera reintegro)</label><select id="expense-paid-by" name="paidByStaffId" defaultValue={suggestedPaidByStaffId||""}><option value="">No aplica</option>{staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
   <div className="field"><label htmlFor="expense-method">Medio</label><select id="expense-method" name="paymentMethod" defaultValue=""><option value="">Sin informar</option><option value="CASH">Efectivo</option><option value="TRANSFER">Transferencia</option><option value="DEBIT_CARD">Débito</option><option value="CREDIT_CARD">Crédito</option><option value="MERCADO_PAGO">Mercado Pago</option><option value="OTHER">Otro</option></select></div>
   <div className="field"><label htmlFor="expense-item">Ítem comercial (opcional)</label><select id="expense-item" name="quoteItemId" defaultValue=""><option value="">Costo sin asignar</option>{quoteItems.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
   <div className="field span-2"><label htmlFor="expense-notes">Nota</label><input id="expense-notes" name="notes" placeholder="Opcional"/></div>
  </div>
  <details><summary>Agregar URL de comprobante</summary><div className="field"><label htmlFor="expense-receipt">URL del comprobante</label><input id="expense-receipt" name="receiptUrl" type="url" placeholder="https://…"/></div></details>
  <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()}/><SubmitExpense/>
 </form>
}
function SubmitExpense(){const {pending}=useFormStatus();return <button className="btn btn-primary" disabled={pending}>{pending?"Guardando…":"Guardar gasto"}</button>}
