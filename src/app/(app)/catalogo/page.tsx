import { createCatalogItem, updateCatalogItem } from "@/app/actions/catalog";
import { formatMoney } from "@/lib/money/format";
import { requireManagement } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";

type CatalogItem = { id: string; name: string; category: string; description: string | null; listPrice: unknown; currency: "ARS" | "USD"; active: boolean };

export default async function Catalog() {
  await requireManagement();
  const [services, addOns] = await Promise.all([prisma.service.findMany({ orderBy: { name: "asc" } }), prisma.addOn.findMany({ orderBy: { name: "asc" } })]);
  return <>
    <div className="topbar"><div><h1>Servicios y adicionales</h1><p className="muted">Precios base utilizados para crear nuevas versiones de presupuestos.</p></div></div>
    <section className="catalog-layout"><CatalogColumn title="Servicios" description="Propuestas principales de Murray DJs." items={services} kind="service" /><CatalogColumn title="Adicionales" description="Producción y complementos opcionales." items={addOns} kind="addOn" /></section>
  </>;
}

function CatalogColumn({ title, description, items, kind }: { title: string; description: string; items: CatalogItem[]; kind: "service" | "addOn" }) {
  return <section className="catalog-column">
    <header><div><h2>{title}</h2><p>{description}</p></div><span>{items.filter((item) => item.active).length} activos</span></header>
    <div className="catalog-rows">{items.map((item) => <details className="catalog-row" key={item.id}>
      <summary><span><strong>{item.name}</strong><small>{item.category}{!item.active ? " · Inactivo" : ""}</small></span><strong>{formatMoney(String(item.listPrice), item.currency)}</strong></summary>
      <form action={updateCatalogItem.bind(null, kind, item.id)} className="form edit-panel"><div className="form-grid"><div className="field"><label>Nombre</label><input name="name" defaultValue={item.name} required /></div><div className="field"><label>Categoría</label><input name="category" defaultValue={item.category} required /></div><div className="field"><label>Moneda</label><select name="currency" defaultValue={item.currency}><option>ARS</option><option>USD</option></select></div><div className="field"><label>Precio de lista</label><input name="listPrice" type="number" min="0" step="0.01" defaultValue={String(item.listPrice)} required /></div><div className="field span-2"><label>Descripción</label><textarea name="description" defaultValue={item.description || ""} /></div></div><label className="check"><input type="checkbox" name="active" defaultChecked={item.active} /> Disponible para nuevos presupuestos</label><button className="btn btn-primary">Guardar cambios</button></form>
    </details>)}</div>
    <details className="catalog-create"><summary>+ Agregar {kind === "service" ? "servicio" : "adicional"}</summary><form action={createCatalogItem.bind(null, kind)} className="form edit-panel"><div className="field"><label>Nombre</label><input name="name" required /></div><div className="form-grid"><div className="field"><label>Categoría</label><input name="category" required /></div><div className="field"><label>Moneda</label><select name="currency"><option>ARS</option><option>USD</option></select></div><div className="field span-2"><label>Precio de lista</label><input name="listPrice" type="number" min="0" step="0.01" required /></div></div><button className="btn btn-primary">Guardar</button></form></details>
  </section>;
}
