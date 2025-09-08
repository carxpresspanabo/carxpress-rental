import React, { useEffect, useMemo, useState } from "react";

// CarXpress Rental Organizer — BETA (clean single-file JSX)
// • Matches the mock: Topbar (Download leads) → Overview → Bookings → Vehicles → Customers
// • Starts EMPTY (no demo data). Data persists to localStorage.
// • No Settings tab, no Import/Export JSON, no Delete buttons.
// • Driver rate is editable inside the New Booking form.

// -------------------- Utils --------------------
const STORAGE_KEY = "carxpress_rental_v3";
const PHP = "\u20B1"; // peso symbol

const fmtMoney = (n) => `${PHP}${Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
const pad2 = (x) => String(x).padStart(2, "0");
const toDTLocal = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const parseDT = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d; };
const daysBetween = (a,b) => Math.max(1, Math.ceil(Math.max(0, b - a) / 86400000));
const overlaps = (a1,a2,b1,b2) => a1 < b2 && b1 < a2;
const uid = (p) => `${p}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;

function download(filename, text, type = "text/plain;charset=utf-8") {
  try {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none"; a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch (e) { console.error(e); alert("Download failed."); }
}

// -------------------- Persistent state --------------------
function useStore() {
  const [state, setState] = useState(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch {}
    return { vehicles: [], customers: [], bookings: [], settings: { driverRatePerDay: 800 } };
  });
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  return [state, setState];
}

// -------------------- Tiny UI atoms --------------------
const Badge = ({children, tone="slate"}) => {
  const tones = { slate:"bg-slate-100 text-slate-700", green:"bg-green-100 text-green-700", amber:"bg-amber-100 text-amber-700", blue:"bg-blue-100 text-blue-700", red:"bg-red-100 text-red-700" };
  return <span className={`px-2 py-0.5 text-xs rounded-full ${tones[tone]}`}>{children}</span>;
};
const Card = ({title, actions, children}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <div className="flex gap-2">{actions}</div>
    </div>
    <div className="p-4">{children}</div>
  </div>
);
const TextInput = ({label, value, onChange, type="text", placeholder, required, ...props}) => (
  <label className="block text-sm">
    <span className="text-slate-700">{label}</span>
    <input type={type} className="mt-1 w-full rounded-xl border-slate-200 focus:border-slate-400 focus:ring-0 border px-3 py-2" value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} required={required} {...props}/>
  </label>
);
const Select = ({label, value, onChange, options=[], required, ...props}) => (
  <label className="block text-sm">
    <span className="text-slate-700">{label}</span>
    <select className="mt-1 w-full rounded-xl border-slate-200 focus:border-slate-400 focus:ring-0 border px-3 py-2 bg-white" value={value} onChange={(e)=>onChange(e.target.value)} required={required} {...props}>
      <option value="" disabled hidden>Select...</option>
      {options.map((o,i)=>(<option key={o.value ?? i} value={o.value ?? o.label}>{o.label ?? String(o.value)}</option>))}
    </select>
  </label>
);
const Toggle = ({label, checked, onChange}) => (
  <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" className="rounded" checked={checked} onChange={(e)=>onChange(e.target.checked)}/><span>{label}</span></label>
);
const SectionHeader = ({title, subtitle}) => (
  <div className="mb-4"><h2 className="text-xl font-semibold text-slate-800">{title}</h2>{subtitle && <p className="text-slate-500 text-sm">{subtitle}</p>}</div>
);

// -------------------- Main App --------------------
export default function App(){
  const [store, setStore] = useStore();
  const { vehicles, customers, bookings } = store;

  const totalFleet = vehicles.length;
  const outUnits = bookings.filter(b => b.status === "Ongoing" || b.status === "Reserved").length;
  const availableUnits = Math.max(0, totalFleet - outUnits);

  // CRUD helpers
  const save = (fn) => setStore(prev => ({ ...prev, ...fn(prev) }));
  const addVehicle = (v) => save(p => ({ vehicles: [...p.vehicles, v] }));
  const updateVehicle = (id, patch) => save(p => ({ vehicles: p.vehicles.map(x => x.id === id ? { ...x, ...patch } : x) }));
  const addCustomer = (c) => save(p => ({ customers: [...p.customers, c] }));
  const updateCustomer = (id, patch) => save(p => ({ customers: p.customers.map(x => x.id === id ? { ...x, ...patch } : x) }));
  const addBooking = (b) => save(p => ({ bookings: [b, ...p.bookings] }));
  const updateBooking = (id, patch) => save(p => ({ bookings: p.bookings.map(x => x.id === id ? { ...x, ...patch } : x) }));

  // Leads export (names + phones from customers + bookings)
  function downloadLeads(){
    const map = new Map();
    customers.forEach(c => { const key = (c.phone||"").replace(/\s+/g,"") || (c.name||"").toLowerCase(); if (key) map.set(key,{name:c.name||"", phone:c.phone||""}); });
    bookings.forEach(b => { const key = (b.customerPhone||"").replace(/\s+/g,"") || (b.customerName||"").toLowerCase(); if (key && !map.has(key)) map.set(key,{name:b.customerName||"", phone:b.customerPhone||""}); });
    const rows = [...map.values()].filter(r => r.name || r.phone);
    if(!rows.length){ alert("No leads to download yet."); return; }
    const csv = [["Name","Phone"], ...rows].map(r => [`"${String(r.name).replace(/"/g,'""')}"`,`"${String(r.phone).replace(/"/g,'""')}"`].join(",")).join("\n");
    download(`leads_${new Date().toISOString().slice(0,10)}.csv`, csv, "text/csv;charset=utf-8");
  }

  // Overview upcoming pickups
  const upcoming = useMemo(() => {
    const today = new Date();
    return bookings.filter(b => new Date(b.pickup) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
      .sort((a,b)=> new Date(a.pickup) - new Date(b.pickup)).slice(0,5);
  }, [bookings]);

  // Filters for bookings table
  const [bookingQuery, setBookingQuery] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const filtered = bookings.filter(b => {
    const q = bookingQuery.toLowerCase();
    const matchQ = !q || [b.id, b.vehicleId, b.vehiclePlate, b.customerName, b.customerPhone, b.customerEmail].some(x => String(x).toLowerCase().includes(q));
    const matchV = !vehicleFilter || b.vehicleId === vehicleFilter;
    const matchS = !statusFilter || b.status === statusFilter;
    return matchQ && matchV && matchS;
  });

  // Modal
  const [showBookingForm, setShowBookingForm] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white grid place-content-center font-bold">CX</div>
            <div>
              <div className="font-semibold">Rental Organizer</div>
              <div className="text-xs text-slate-500">CarXpress <Badge tone="blue">v1.2025</Badge></div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={downloadLeads} className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50">Download leads</button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Overview */}
        <section>
          <SectionHeader title="Overview" />
          <div className="grid md:grid-cols-2 gap-4">
            <Card title="Available Units" actions={<Badge tone="green">Live</Badge>}>
              <div className="text-4xl font-bold">{availableUnits}</div>
              <p className="text-slate-500 text-sm mt-1">Out of {vehicles.length} total vehicles</p>
            </Card>
            <Card title="Active/Reserved Bookings">
              <div className="text-4xl font-bold">{bookings.filter(b => ["Ongoing","Reserved"].includes(b.status)).length}</div>
              <p className="text-slate-500 text-sm mt-1">Now + upcoming</p>
            </Card>
          </div>
          <Card title="Next 5 Pickups">
            {upcoming.length === 0 ? (
              <div className="text-slate-500">No upcoming pickups yet.</div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500"><th className="py-2 pr-4">Date/Time</th><th className="py-2 pr-4">Vehicle</th><th className="py-2 pr-4">Customer</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-0 text-right">Total</th></tr>
                  </thead>
                  <tbody>
                    {upcoming.map(b => (
                      <tr key={b.id} className="border-t">
                        <td className="py-2 pr-4">{new Date(b.pickup).toLocaleString()}</td>
                        <td className="py-2 pr-4">{b.vehicleId} <span className="text-slate-400">({b.vehiclePlate})</span></td>
                        <td className="py-2 pr-4">{b.customerName}</td>
                        <td className="py-2 pr-4"><Badge tone={b.status==="Reserved"?"blue":b.status==="Ongoing"?"amber":"slate"}>{b.status}</Badge></td>
                        <td className="py-2 pr-0 text-right">{fmtMoney(b.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>

        {/* Bookings */}
        <section>
          <SectionHeader title="Bookings" />
          <div className="flex flex-wrap gap-2 items-end">
            <TextInput label="Search" value={bookingQuery} onChange={setBookingQuery} placeholder="ID, customer, plate..." />
            <Select label="Vehicle" value={vehicleFilter} onChange={setVehicleFilter} options={[...new Set(vehicles.map(v=>v.id))].map(v=>({value:v,label:v}))} />
            <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={["Reserved","Ongoing","Completed","Cancelled"].map(s=>({value:s,label:s}))} />
            <div className="ml-auto"><button onClick={()=>setShowBookingForm(true)} className="px-3 py-2 rounded-xl bg-slate-900 text-white">New Booking</button></div>
          </div>
          <div className="overflow-auto mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500"><th className="py-2 pr-4">ID</th><th className="py-2 pr-4">Vehicle</th><th className="py-2 pr-4">Customer</th><th className="py-2 pr-4">Pickup</th><th className="py-2 pr-4">Return</th><th className="py-2 pr-4">Days</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4 text-right">Total</th><th className="py-2 pr-0 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} className="border-t">
                    <td className="py-2 pr-4 font-mono">{b.id}</td>
                    <td className="py-2 pr-4">{b.vehicleId} <span className="text-slate-400">({b.vehiclePlate})</span></td>
                    <td className="py-2 pr-4">{b.customerName}</td>
                    <td className="py-2 pr-4">{new Date(b.pickup).toLocaleString()}</td>
                    <td className="py-2 pr-4">{new Date(b.dropoff).toLocaleString()}</td>
                    <td className="py-2 pr-4">{b.days}</td>
                    <td className="py-2 pr-4"><Badge tone={b.status==="Reserved"?"blue":b.status==="Ongoing"?"amber":b.status==="Completed"?"green":"red"}>{b.status}</Badge></td>
                    <td className="py-2 pr-4 text-right">{fmtMoney(b.total)}</td>
                    <td className="py-2 pr-0 text-right">
                      <div className="inline-flex gap-2">
                        {b.status !== "Completed" && (
                          <button onClick={()=>updateBooking(b.id,{ status: b.status === "Reserved" ? "Ongoing" : "Completed" })} className="px-2 py-1 rounded-lg border">{b.status === "Reserved" ? "Start" : "Complete"}</button>
                        )}
                        <button onClick={()=>printBooking(b)} className="px-2 py-1 rounded-lg border">Print</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length===0 && <tr><td colSpan={9} className="text-slate-500 py-6 text-center">No bookings yet. Click "New Booking".</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* Vehicles */}
        <Vehicles vehicles={vehicles} bookings={bookings} addVehicle={addVehicle} updateVehicle={updateVehicle} />

        {/* Customers */}
        <Customers customers={customers} addCustomer={addCustomer} updateCustomer={updateCustomer} />
      </div>

      {showBookingForm && (
        <BookingForm onClose={()=>setShowBookingForm(false)} vehicles={vehicles} customers={customers} addBooking={addBooking} existingBookings={bookings} defaultDriverRate={store.settings.driverRatePerDay || 800} />
      )}
    </div>
  );

  // simple print helper
  function printBooking(b){
    const w = window.open("", "_blank"); if(!w) return;
    w.document.write(`
      <html><head><title>Booking ${b.id}</title>
      <style>body{font-family:ui-sans-serif,system-ui;padding:24px}h1{margin:0}.row{display:flex;gap:24px}.box{border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-top:12px}table{width:100%;border-collapse:collapse}td,th{border-top:1px solid #e5e7eb;padding:8px;text-align:left}</style>
      </head><body>
      <h1>CarXpress Booking</h1>
      <p><b>ID:</b> ${b.id} &nbsp; <b>Status:</b> ${b.status}</p>
      <div class="row">
        <div class="box" style="flex:1"><h3>Customer</h3><p>${b.customerName}<br>${b.customerPhone}<br>${b.customerEmail||""}</p></div>
        <div class="box" style="flex:1"><h3>Vehicle</h3><p>${b.vehicleId} - ${b.vehiclePlate}<br>Rate/day: ${fmtMoney(b.ratePerDay)}</p></div>
      </div>
      <div class="box"><h3>Schedule</h3><table><tr><th>Pickup</th><td>${new Date(b.pickup).toLocaleString()}</td></tr><tr><th>Return</th><td>${new Date(b.dropoff).toLocaleString()}</td></tr><tr><th>Days</th><td>${b.days}</td></tr></table></div>
      <div class="box"><h3>Charges</h3><table><tr><th>Base</th><td>${fmtMoney(b.ratePerDay)} x ${b.days}</td></tr><tr><th>Driver</th><td>${b.withDriver ? fmtMoney((b.driverRatePerDay||0)*b.days) : '-'}</td></tr><tr><th>Delivery</th><td>${fmtMoney(b.deliveryFee||0)}</td></tr><tr><th>Deposit</th><td>${fmtMoney(b.deposit||0)}</td></tr><tr><th><b>Total</b></th><td><b>${fmtMoney(b.total)}</b></td></tr></table></div>
      <script>window.print()</script></body></html>`);
    w.document.close();
  }
}

// -------------------- Booking Form --------------------
function BookingForm({ onClose, vehicles, customers, addBooking, existingBookings, defaultDriverRate }){
  const [vehicleId, setVehicleId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [pickup, setPickup] = useState(toDTLocal(new Date()));
  const [dropoff, setDropoff] = useState(toDTLocal(new Date(Date.now()+86400000)));
  const [ratePerDay, setRatePerDay] = useState("");
  const [withDriver, setWithDriver] = useState(false);
  const [driverRatePerDay, setDriverRatePerDay] = useState(defaultDriverRate);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(()=>{ if(!vehicleId && vehicles.length) setVehicleId(vehicles[0].id); },[vehicles]);
  useEffect(()=>{ if(!customerId && customers.length) setCustomerId(customers[0].id); },[customers]);

  const veh = vehicles.find(v => v.id === vehicleId);
  useEffect(()=>{ if(veh) setRatePerDay(String(veh.ratePerDay ?? "")); },[vehicleId]);

  const d1 = parseDT(pickup); const d2 = parseDT(dropoff);
  const days = d1 && d2 ? daysBetween(d1,d2) : 1;
  const driverFee = withDriver ? Number(driverRatePerDay||0) * days : 0;
  const base = Number(ratePerDay||0) * days;
  const total = base + Number(deliveryFee||0) + driverFee - Number(deposit||0);

  const conflicts = useMemo(()=>{ if(!veh || !d1 || !d2) return []; return existingBookings.filter(b => b.vehicleId===veh.id && ["Reserved","Ongoing"].includes(b.status) && overlaps(new Date(b.pickup), new Date(b.dropoff), d1, d2)); },[veh,d1,d2,existingBookings]);

  function submit(e){
    e.preventDefault();
    const v = vehicles.find(x=>x.id===vehicleId); if(!v) return alert("Select a vehicle");
    const c = customers.find(x=>x.id===customerId); if(!c) return alert("Select a customer");
    if(conflicts.length) return alert("This schedule conflicts with an existing booking.");

    const b = { id: uid("BK"), status:"Reserved", vehicleId:v.id, vehiclePlate:v.plate, customerId:c.id, customerName:c.name, customerPhone:c.phone, customerEmail:c.email, pickup:d1.toISOString(), dropoff:d2.toISOString(), days, ratePerDay:Number(ratePerDay||0), withDriver, driverRatePerDay:Number(driverRatePerDay||0), deliveryFee:Number(deliveryFee||0), deposit:Number(deposit||0), total, notes };
    addBooking(b); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="font-semibold">New Booking</h3><button onClick={onClose} className="px-2 py-1 rounded-lg border">Close</button></div>
        <form onSubmit={submit} className="p-4 grid md:grid-cols-2 gap-4">
          <Select label="Vehicle" value={vehicleId} onChange={setVehicleId} required options={vehicles.map(v=>({value:v.id,label:`${v.id} (${v.plate})`}))} />
          <Select label="Customer" value={customerId} onChange={setCustomerId} required options={customers.map(c=>({value:c.id,label:`${c.name} (${c.phone})`}))} />
          <TextInput label="Pickup" type="datetime-local" value={pickup} onChange={setPickup} required />
          <TextInput label="Return" type="datetime-local" value={dropoff} onChange={setDropoff} required />
          <TextInput label={`Rate per day (${PHP})`} type="number" value={ratePerDay} onChange={setRatePerDay} required />
          <TextInput label={`Delivery fee (${PHP})`} type="number" value={deliveryFee} onChange={(v)=>setDeliveryFee(Number(v))} />
          <TextInput label={`Driver rate per day (${PHP})`} type="number" value={driverRatePerDay} onChange={(v)=>setDriverRatePerDay(Number(v))} />
          <div className="flex items-end justify-between gap-4">
            <Toggle label={`With driver (${fmtMoney(driverRatePerDay)}/day)`} checked={withDriver} onChange={setWithDriver} />
            <TextInput label={`Deposit (${PHP})`} type="number" value={deposit} onChange={(v)=>setDeposit(Number(v))} />
          </div>
          <label className="md:col-span-2 text-sm"><span className="text-slate-700">Notes</span><textarea className="mt-1 w-full rounded-xl border-slate-200 focus:border-slate-400 focus:ring-0 border px-3 py-2" rows={3} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Requirements, pickup location, etc." /></label>
          <div className="md:col-span-2 flex flex-wrap items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div><div className="text-sm text-slate-500">Days</div><div className="text-lg font-semibold">{days}</div></div>
            <div><div className="text-sm text-slate-500">Base</div><div className="text-lg font-semibold">{fmtMoney(base)}</div></div>
            <div><div className="text-sm text-slate-500">Driver</div><div className="text-lg font-semibold">{fmtMoney(driverFee)}</div></div>
            <div><div className="text-sm text-slate-500">Delivery</div><div className="text-lg font-semibold">{fmtMoney(deliveryFee)}</div></div>
            <div><div className="text-sm text-slate-500">Deposit</div><div className="text-lg font-semibold">{fmtMoney(deposit)}</div></div>
            <div className="ml-auto"><div className="text-sm text-slate-500">Total</div><div className="text-2xl font-bold">{fmtMoney(total)}</div>{conflicts.length>0 && (<div className="text-red-600 text-xs mt-1">Warning: conflicts with {conflicts.length} booking(s).</div>)}</div>
          </div>
          <div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="px-3 py-2 rounded-xl border bg-white">Cancel</button><button type="submit" className="px-3 py-2 rounded-xl bg-slate-900 text-white">Save Booking</button></div>
        </form>
      </div>
    </div>
  );
}

// -------------------- Vehicles --------------------
function Vehicles({ vehicles, bookings, addVehicle, updateVehicle }){
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const list = vehicles.filter(v => { const s=q.toLowerCase(); return !s || [v.id,v.make,v.model,v.plate,v.type].some(x=>String(x).toLowerCase().includes(s)); });
  const busyCount = (id) => bookings.filter(b => b.vehicleId===id && ["Reserved","Ongoing"].includes(b.status)).length;

  return (
    <section className="space-y-4">
      <SectionHeader title="Vehicles" subtitle="Fleet overview and rates" />
      <div className="flex items-end gap-2"><TextInput label="Search" value={q} onChange={setQ} placeholder="ID, plate, model..." /><div className="ml-auto"><button onClick={()=>setShowAdd(true)} className="px-3 py-2 rounded-xl bg-slate-900 text-white">Add Vehicle</button></div></div>
      <div className="grid lg:grid-cols-2 gap-4">
        {list.map(v => (
          <div key={v.id} className="bg-white rounded-2xl border p-4">
            <div className="flex items-start justify-between"><div><div className="font-semibold">{v.id} <span className="text-slate-400">({v.plate})</span></div><div className="text-slate-600 text-sm">{v.year} {v.make} {v.model} • {v.trans} • {v.seats} seats</div></div><Badge tone={busyCount(v.id)?"amber":"green"}>{busyCount(v.id)?"Booked":"Available"}</Badge></div>
            <div className="mt-3 flex items-center justify-between"><div className="text-slate-500 text-sm">Type: {v.type}</div><div className="flex items-center gap-2"><div className="text-lg font-bold">{fmtMoney(v.ratePerDay)}/day</div><button onClick={()=>setEditing(v)} className="px-2 py-1 rounded-lg border">Edit</button></div></div>
          </div>
        ))}
        {list.length===0 && <div className="text-slate-500">No vehicles yet.</div>}
      </div>
      {showAdd && <VehicleForm onClose={()=>setShowAdd(false)} addVehicle={addVehicle} />}
      {editing && <EditVehicleForm vehicle={editing} onClose={()=>setEditing(null)} onSave={(patch)=>{ const c={...patch}; if(c.year!=null)c.year=Number(c.year); if(c.seats!=null)c.seats=Number(c.seats); if(c.ratePerDay!=null)c.ratePerDay=Number(c.ratePerDay); updateVehicle(editing.id,c); setEditing(null); }} />}
    </section>
  );
}

function VehicleForm({ onClose, addVehicle }){
  const [f, setF] = useState({ id:"", type:"Sedan", make:"", model:"", year:2024, plate:"", trans:"AT", seats:5, ratePerDay:1500, status:"Available" });
  const set = (k,v) => setF(p=>({ ...p, [k]: v }));
  function submit(e){ e.preventDefault(); if(!f.id||!f.plate) return alert("ID and Plate are required."); addVehicle({ ...f, year:Number(f.year), seats:Number(f.seats), ratePerDay:Number(f.ratePerDay) }); onClose(); }
  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4"><div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl"><div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="font-semibold">Add Vehicle</h3><button onClick={onClose} className="px-2 py-1 rounded-lg border">Close</button></div><form onSubmit={submit} className="p-4 grid md:grid-cols-2 gap-4"><TextInput label="Vehicle ID" value={f.id} onChange={(v)=>set("id",v)} required/><Select label="Type" value={f.type} onChange={(v)=>set("type",v)} options={["Hatchback","Sedan","MPV","Pickup","Van"].map(x=>({value:x,label:x}))}/><TextInput label="Make" value={f.make} onChange={(v)=>set("make",v)} required/><TextInput label="Model" value={f.model} onChange={(v)=>set("model",v)} required/><TextInput label="Year" type="number" value={f.year} onChange={(v)=>set("year",v)} required/><TextInput label="Plate" value={f.plate} onChange={(v)=>set("plate",v)} required/><Select label="Transmission" value={f.trans} onChange={(v)=>set("trans",v)} options={["AT","MT"].map(x=>({value:x,label:x}))}/><TextInput label="Seats" type="number" value={f.seats} onChange={(v)=>set("seats",v)} required/><TextInput label={`Rate per day (${PHP})`} type="number" value={f.ratePerDay} onChange={(v)=>set("ratePerDay",v)} required/><Select label="Status" value={f.status} onChange={(v)=>set("status",v)} options={["Available","With Driver Only","Maintenance"].map(x=>({value:x,label:x}))}/><div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="px-3 py-2 rounded-xl border bg-white">Cancel</button><button type="submit" className="px-3 py-2 rounded-xl bg-slate-900 text-white">Save Vehicle</button></div></form></div></div>
  );
}

function EditVehicleForm({ vehicle, onClose, onSave }){
  const [f, setF] = useState({ id:vehicle.id, type:vehicle.type, make:vehicle.make, model:vehicle.model, year:vehicle.year, plate:vehicle.plate, trans:vehicle.trans, seats:vehicle.seats, ratePerDay:vehicle.ratePerDay, status:vehicle.status });
  const set = (k,v)=>setF(p=>({ ...p, [k]:v }));
  function submit(e){ e.preventDefault(); onSave({ ...f }); }
  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4"><div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl"><div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="font-semibold">Edit Vehicle</h3><button onClick={onClose} className="px-2 py-1 rounded-lg border">Close</button></div><form onSubmit={submit} className="p-4 grid md:grid-cols-2 gap-4"><TextInput label="Vehicle ID" value={f.id} onChange={(v)=>set("id",v)} disabled/><Select label="Type" value={f.type} onChange={(v)=>set("type",v)} options={["Hatchback","Sedan","MPV","Pickup","Van"].map(x=>({value:x,label:x}))}/><TextInput label="Make" value={f.make} onChange={(v)=>set("make",v)} required/><TextInput label="Model" value={f.model} onChange={(v)=>set("model",v)} required/><TextInput label="Year" type="number" value={f.year} onChange={(v)=>set("year",v)} required/><TextInput label="Plate" value={f.plate} onChange={(v)=>set("plate",v)} required/><Select label="Transmission" value={f.trans} onChange={(v)=>set("trans",v)} options={["AT","MT"].map(x=>({value:x,label:x}))}/><TextInput label="Seats" type="number" value={f.seats} onChange={(v)=>set("seats",v)} required/><TextInput label={`Rate per day (${PHP})`} type="number" value={f.ratePerDay} onChange={(v)=>set("ratePerDay",v)} required/><Select label="Status" value={f.status} onChange={(v)=>set("status",v)} options={["Available","With Driver Only","Maintenance"].map(x=>({value:x,label:x}))}/><div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="px-3 py-2 rounded-xl border bg-white">Cancel</button><button type="submit" className="px-3 py-2 rounded-xl bg-slate-900 text-white">Save Changes</button></div></form></div></div>
  );
}

// -------------------- Customers --------------------
function Customers({ customers, addCustomer, updateCustomer }){
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const list = customers.filter(c => { const s=q.toLowerCase(); return !s || [c.name,c.phone,c.email,c.idNo].some(x=>String(x||"").toLowerCase().includes(s)); });

  return (
    <section className="space-y-4">
      <SectionHeader title="Customers" subtitle="Renter records and contacts" />
      <div className="flex items-end gap-2"><TextInput label="Search" value={q} onChange={setQ} placeholder="Name, phone, email..." /><div className="ml-auto"><button onClick={()=>setShowAdd(true)} className="px-3 py-2 rounded-xl bg-slate-900 text-white">Add Customer</button></div></div>
      <div className="grid lg:grid-cols-2 gap-4">
        {list.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border p-4">
            <div className="font-semibold">{c.name}</div>
            <div className="text-sm text-slate-600">{c.phone} • {c.email}</div>
            <div className="text-sm text-slate-500 mt-1">{c.idType}: {c.idNo}</div>
            <div className="mt-3 flex justify-end gap-2"><button onClick={()=>setEditing(c)} className="px-2 py-1 rounded-lg border">Edit</button></div>
          </div>
        ))}
        {list.length===0 && <div className="text-slate-500">No customers yet.</div>}
      </div>
      {showAdd && <CustomerForm onClose={()=>setShowAdd(false)} addCustomer={addCustomer} />}
      {editing && <EditCustomerForm customer={editing} onClose={()=>setEditing(null)} onSave={(patch)=>{ updateCustomer(editing.id, patch); setEditing(null); }} />}
    </section>
  );
}

function CustomerForm({ onClose, addCustomer }){
  const [f, setF] = useState({ id: `CUS-${Math.floor(Math.random()*9000+1000)}`, name:"", phone:"", email:"", idType:"Driver's License", idNo:"" });
  const set = (k,v)=>setF(p=>({ ...p, [k]:v }));
  function submit(e){ e.preventDefault(); if(!f.name || !f.phone) return alert("Name and phone are required."); addCustomer({...f}); onClose(); }
  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4"><div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl"><div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="font-semibold">Add Customer</h3><button onClick={onClose} className="px-2 py-1 rounded-lg border">Close</button></div><form onSubmit={submit} className="p-4 grid md:grid-cols-2 gap-4"><TextInput label="Full name" value={f.name} onChange={(v)=>set("name",v)} required/><TextInput label="Phone" value={f.phone} onChange={(v)=>set("phone",v)} required/><TextInput label="Email" type="email" value={f.email} onChange={(v)=>set("email",v)}/><Select label="ID Type" value={f.idType} onChange={(v)=>set("idType",v)} options={["Driver's License","UMID","Passport","SSS","PhilID"].map(x=>({value:x,label:x}))}/><TextInput label="ID Number" value={f.idNo} onChange={(v)=>set("idNo",v)}/><div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="px-3 py-2 rounded-xl border bg-white">Cancel</button><button type="submit" className="px-3 py-2 rounded-xl bg-slate-900 text-white">Save Customer</button></div></form></div></div>
  );
}

function EditCustomerForm({ customer, onClose, onSave }){
  const [f, setF] = useState({ name:customer.name, phone:customer.phone, email:customer.email, idType:customer.idType, idNo:customer.idNo });
  const set = (k,v)=>setF(p=>({ ...p, [k]:v }));
  function submit(e){ e.preventDefault(); onSave({ ...f }); }
  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4"><div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl"><div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="font-semibold">Edit Customer</h3><button onClick={onClose} className="px-2 py-1 rounded-lg border">Close</button></div><form onSubmit={submit} className="p-4 grid md:grid-cols-2 gap-4"><TextInput label="Full name" value={f.name} onChange={(v)=>set("name",v)} required/><TextInput label="Phone" value={f.phone} onChange={(v)=>set("phone",v)} required/><TextInput label="Email" type="email" value={f.email} onChange={(v)=>set("email",v)}/><Select label="ID Type" value={f.idType} onChange={(v)=>set("idType",v)} options={["Driver's License","UMID","Passport","SSS","PhilID"].map(x=>({value:x,label:x}))}/><TextInput label="ID Number" value={f.idNo} onChange={(v)=>set("idNo",v)}/><div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="px-3 py-2 rounded-xl border bg-white">Cancel</button><button type="submit" className="px-3 py-2 rounded-xl bg-slate-900 text-white">Save Changes</button></div></form></div></div>
  );
}
