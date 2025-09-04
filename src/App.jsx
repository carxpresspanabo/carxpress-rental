import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "carxpress_rental_data_v1";

function classNames(...xs) { return xs.filter(Boolean).join(" "); }
function formatCurrency(n) {
  if (n == null || isNaN(n)) return "₱0";
  return `₱${Number(n).toLocaleString("en-PH", { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
}
function toDateInputValue(d) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear(); const mm = pad(d.getMonth() + 1); const dd = pad(d.getDate());
  const hh = pad(d.getHours()); const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
function parseDT(v) { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
function daysBetween(a, b) { const ms = Math.max(0, b - a); const d = Math.ceil(ms / (1000 * 60 * 60 * 24)); return Math.max(1, d); }
function overlaps(aStart, aEnd, bStart, bEnd) { return aStart < bEnd && bStart < aEnd; }
function download(filename, text) {
  const element = document.createElement("a");
  const file = new Blob([text], { type: "text/csv;charset=utf-8;" });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

const demoVehicles = [
  { id: "VX-WIGO-A1", type: "Hatchback", make: "Toyota", model: "Wigo G", year: 2023, plate: "ABC-1234", trans: "AT", seats: 5, ratePerDay: 1200, status: "Available" },
  { id: "VX-VIOS-A2", type: "Sedan", make: "Toyota", model: "Vios XLE", year: 2022, plate: "DEF-5678", trans: "AT", seats: 5, ratePerDay: 1500, status: "Available" },
  { id: "VX-MIRAGE-A3", type: "Sedan", make: "Mitsubishi", model: "Mirage G4", year: 2021, plate: "GHI-9012", trans: "AT", seats: 5, ratePerDay: 1400, status: "Available" },
  { id: "VX-ACCENT-A4", type: "Sedan", make: "Hyundai", model: "Accent", year: 2020, plate: "JKL-3456", trans: "AT", seats: 5, ratePerDay: 1400, status: "Available" },
  { id: "VX-STRADA-P1", type: "Pickup", make: "Mitsubishi", model: "Strada", year: 2022, plate: "MNO-7890", trans: "AT", seats: 5, ratePerDay: 2500, status: "Available" },
  { id: "VX-XPANDER-M1", type: "MPV", make: "Mitsubishi", model: "Xpander", year: 2023, plate: "PQR-2468", trans: "AT", seats: 7, ratePerDay: 2300, status: "Available" },
  { id: "VX-AVANZA-M2", type: "MPV", make: "Toyota", model: "Avanza", year: 2023, plate: "STU-1357", trans: "AT", seats: 7, ratePerDay: 2200, status: "Available" },
  { id: "VX-VELOZ-M3", type: "MPV", make: "Toyota", model: "Veloz", year: 2024, plate: "VWX-9753", trans: "AT", seats: 7, ratePerDay: 2400, status: "Available" },
  { id: "VX-NV350-V1", type: "Van", make: "Nissan", model: "NV350", year: 2019, plate: "YZA-5314", trans: "MT", seats: 12, ratePerDay: 3500, status: "With Driver Only" },
];
const demoCustomers = [
  { id: "CUS-0001", name: "Juan Dela Cruz", phone: "0917 000 0001", email: "juan@example.com", idType: "Driver's License", idNo: "D01-1234-5678" },
  { id: "CUS-0002", name: "Maria Santos", phone: "0917 000 0002", email: "maria@example.com", idType: "UMID", idNo: "UM-87654321" },
];
const demoBookings = [];

function usePersistentState() {
  const [state, setState] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { try { return JSON.parse(raw); } catch {} }
    return { vehicles: demoVehicles, customers: demoCustomers, bookings: demoBookings, settings: { company: "CarXpress Panabo – Rent a Car", address: "Panabo City, Davao del Norte", phone: "0961 896 3062", email: "carxpress@example.com" } };
  });
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  return [state, setState];
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return <span className={["px-2 py-0.5 text-xs rounded-full", tones[tone]].join(" ")}>{children}</span>;
}
function Card({ title, actions, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <div className="flex gap-2">{actions}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
function TextInput({ label, value, onChange, type = "text", placeholder, required, ...props }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-700">{label}</span>
      <input type={type} className="mt-1 w-full rounded-xl border-slate-200 focus:border-slate-400 focus:ring-0 border px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} {...props} />
    </label>
  );
}
function Select({ label, value, onChange, options = [], required, ...props }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-700">{label}</span>
      <select className="mt-1 w-full rounded-xl border-slate-200 focus:border-slate-400 focus:ring-0 border px-3 py-2 bg-white" value={value} onChange={(e) => onChange(e.target.value)} required={required} {...props}>
        <option value="">Select…</option>
        {options.map((o) => (<option key={o.value||o.label} value={o.value||o.label}>{o.label||o.value}</option>))}
      </select>
    </label>
  );
}
function Toggle({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input type="checkbox" className="rounded" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
      {subtitle && <p className="text-slate-500 text-sm">{subtitle}</p>}
    </div>
  );
}

export default function App() {
  const [data, setData] = usePersistentState();
  const [tab, setTab] = useState("dashboard");
  const [bookingQuery, setBookingQuery] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const vehicles = data.vehicles;
  const customers = data.customers;
  const bookings = data.bookings;
  const totalFleet = vehicles.length;
  const outUnits = bookings.filter((b) => b.status === "Ongoing" || b.status === "Reserved").length;
  const availableUnits = Math.max(0, totalFleet - outUnits);

  function save(fn) { setData((prev) => ({ ...prev, ...fn(prev) })); }
  function addVehicle(v) { save((prev) => ({ vehicles: [...prev.vehicles, v] })); }
  function addCustomer(c) { save((prev) => ({ customers: [...prev.customers, c] })); }
  function addBooking(b) { save((prev) => ({ bookings: [b, ...prev.bookings] })); }
  function updateBooking(id, patch) { save((prev) => ({ bookings: prev.bookings.map((b) => (b.id === id ? { ...b, ...patch } : b)) })); }
  function deleteBooking(id) { save((prev) => ({ bookings: prev.bookings.filter((b) => b.id !== id) })); }

  function exportBookingsCSV() {
    const header = [
      "Booking ID","Status","Vehicle","Plate","Customer","Phone","Email","Pickup","Return","Days","Rate/Day","Driver","Delivery","Deposit","Total","Notes"
    ];
    const rows = bookings.map((b) => [
      b.id,b.status,b.vehicleId,b.vehiclePlate,b.customerName,b.customerPhone,b.customerEmail,
      new Date(b.pickup).toLocaleString(),new Date(b.dropoff).toLocaleString(),b.days,b.ratePerDay,b.withDriver? "Yes":"No",b.deliveryFee||0,b.deposit||0,b.total||0,(b.notes || "").replace(/\\n/g, " ")
    ]);
    const csv = [header, ...rows].map((r) => r.map((x) => `\"${String(x ?? "").replace(/\"/g, '\"\"')}\"`).join(",")).join("\\n");
    download(`bookings_${new Date().toISOString().slice(0,10)}.csv`, csv);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white grid place-content-center font-bold">CX</div>
            <div>
              <div className="font-semibold">{data.settings.company}</div>
              <div className="text-xs text-slate-500">Rental Organizer</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportBookingsCSV} className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50">Export CSV</button>
            <button onClick={() => { localStorage.removeItem(STORAGE_KEY); location.reload(); }} className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:opacity-90">Reset Demo</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 grid md:grid-cols-12 gap-6">
        <aside className="md:col-span-3 lg:col-span-2">
          <nav className="space-y-1">
            {["dashboard","bookings","vehicles","customers","settings"].map(id => (
              <button key={id} onClick={() => setTab(id)} className={["w-full text-left px-3 py-2 rounded-xl", tab === id ? "bg-slate-900 text-white" : "hover:bg-white border border-transparent hover:border-slate-200"].join(" ")}>
                {id.charAt(0).toUpperCase()+id.slice(1)}
              </button>
            ))}
          </nav>
        </aside>

        <main className="md:col-span-9 lg:col-span-10 space-y-6">
          {tab === "dashboard" && (<Dashboard vehicles={vehicles} bookings={bookings} availableUnits={availableUnits} />)}
          {tab === "bookings" && (<Bookings data={data} addBooking={addBooking} updateBooking={updateBooking} deleteBooking={deleteBooking}
            filters={{ bookingQuery, setBookingQuery, vehicleFilter, setVehicleFilter, statusFilter, setStatusFilter }} />)}
          {tab === "vehicles" && (<Vehicles vehicles={vehicles} addVehicle={addVehicle} bookings={bookings} />)}
          {tab === "customers" && (<Customers customers={customers} addCustomer={addCustomer} />)}
          {tab === "settings" && (<Settings data={data} setData={setData} />)}
        </main>
      </div>
    </div>
  );
}

function Dashboard({ vehicles, bookings, availableUnits }) {
  const today = new Date();
  const upcoming = useMemo(() => bookings
    .filter((b) => new Date(b.pickup) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
    .sort((a, b) => new Date(a.pickup) - new Date(b.pickup))
    .slice(0, 5), [bookings]);

  const revenueMonth = useMemo(() => {
    const y = today.getFullYear(); const m = today.getMonth();
    return bookings.filter((b) => {
      const d = new Date(b.pickup); return d.getFullYear() === y && d.getMonth() === m;
    }).reduce((sum, b) => sum + (b.total || 0), 0);
  }, [bookings]);

  return (
    <div className="space-y-6">
      <SectionHeader title="Overview" subtitle="Quick snapshot of fleet and rentals" />
      <div className="grid md:grid-cols-3 gap-4">
        <Card title="Available Units"><div className="text-4xl font-bold">{availableUnits}</div><p className="text-slate-500 text-sm mt-1">Out of {vehicles.length} vehicles</p></Card>
        <Card title="Active/Reserved Bookings"><div className="text-4xl font-bold">{bookings.filter((b) => ["Ongoing","Reserved"].includes(b.status)).length}</div><p className="text-slate-500 text-sm mt-1">Now + upcoming</p></Card>
        <Card title="Revenue (This Month)"><div className="text-4xl font-bold">{formatCurrency(revenueMonth)}</div><p className="text-slate-500 text-sm mt-1">Estimated</p></Card>
      </div>
      <Card title="Next 5 Pickups">
        {upcoming.length === 0 ? (<div className="text-slate-500">No upcoming pickups yet.</div>) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500"><th className="py-2 pr-4">Date/Time</th><th className="py-2 pr-4">Vehicle</th><th className="py-2 pr-4">Customer</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4 text-right">Total</th></tr></thead>
              <tbody>
                {upcoming.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="py-2 pr-4">{new Date(b.pickup).toLocaleString()}</td>
                    <td className="py-2 pr-4">{b.vehicleId} <span className="text-slate-400">({b.vehiclePlate})</span></td>
                    <td className="py-2 pr-4">{b.customerName}</td>
                    <td className="py-2 pr-4"><Badge tone={b.status === "Reserved" ? "blue" : b.status === "Ongoing" ? "amber" : "slate"}>{b.status}</Badge></td>
                    <td className="py-2 pr-0 text-right">{formatCurrency(b.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Bookings({ data, addBooking, updateBooking, deleteBooking, filters }) {
  const { vehicles, customers, bookings } = data;
  const { bookingQuery, setBookingQuery, vehicleFilter, setVehicleFilter, statusFilter, setStatusFilter } = filters;
  const [showForm, setShowForm] = useState(false);
  const filtered = bookings.filter((b) => {
    const q = bookingQuery.toLowerCase();
    const matchQ = !q || [b.id, b.vehicleId, b.vehiclePlate, b.customerName, b.customerPhone, b.customerEmail].some((x) => String(x).toLowerCase().includes(q));
    const matchV = !vehicleFilter || b.vehicleId === vehicleFilter;
    const matchS = !statusFilter || b.status === statusFilter;
    return matchQ && matchV && matchS;
  });
  function printBooking(b) {
    const win = window.open("", "_blank"); if (!win) return;
    win.document.write(`
      <html><head><title>Booking ${b.id}</title>
      <style>body{font-family: ui-sans-serif, system-ui; padding:24px} .row{display:flex; gap:24px} .box{border:1px solid #e5e7eb; border-radius:12px; padding:12px; margin-top:12px} table{width:100%; border-collapse:collapse} td,th{border-top:1px solid #e5e7eb; padding:8px; text-align:left}</style>
      </head><body>
      <h1>CarXpress Booking</h1>
      <p><strong>ID:</strong> ${b.id} &nbsp; <strong>Status:</strong> ${b.status}</p>
      <div class="row">
        <div class="box" style="flex:1"><h3>Customer</h3><p>${b.customerName}<br>${b.customerPhone}<br>${b.customerEmail}</p></div>
        <div class="box" style="flex:1"><h3>Vehicle</h3><p>${b.vehicleId} • ${b.vehiclePlate}<br>Rate/day: ${formatCurrency(b.ratePerDay)}</p></div>
      </div>
      <div class="box"><h3>Schedule</h3><table>
        <tr><th>Pickup</th><td>${new Date(b.pickup).toLocaleString()}</td></tr>
        <tr><th>Return</th><td>${new Date(b.dropoff).toLocaleString()}</td></tr>
        <tr><th>Days</th><td>${b.days}</td></tr></table></div>
      <div class="box"><h3>Charges</h3><table>
        <tr><th>Base</th><td>${formatCurrency(b.ratePerDay)} x ${b.days}</td></tr>
        <tr><th>Driver</th><td>${b.withDriver ? formatCurrency(800 * b.days) : "—"}</td></tr>
        <tr><th>Delivery</th><td>${formatCurrency(b.deliveryFee || 0)}</td></tr>
        <tr><th>Deposit</th><td>${formatCurrency(b.deposit || 0)}</td></tr>
        <tr><th><strong>Total</strong></th><td><strong>${formatCurrency(b.total)}</strong></td></tr></table></div>
      <p><em>Notes:</em> ${b.notes || ""}</p>
      <script>window.print();</script></body></html>`);
    win.document.close();
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Bookings" subtitle="Track reservations, pickups, and returns" />
      <div className="flex flex-wrap gap-2 items-end">
        <TextInput label="Search" value={bookingQuery} onChange={setBookingQuery} placeholder="ID, customer, plate…" />
        <Select label="Vehicle" value={vehicleFilter} onChange={setVehicleFilter} options={[...new Set(vehicles.map(v => v.id))].map(v => ({ value: v, label: v }))} />
        <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={["Reserved","Ongoing","Completed","Cancelled"].map(s => ({ value: s, label: s }))} />
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowForm(true)} className="px-3 py-2 rounded-xl bg-slate-900 text-white">New Booking</button>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2 pr-4">ID</th>
              <th className="py-2 pr-4">Vehicle</th>
              <th className="py-2 pr-4">Customer</th>
              <th className="py-2 pr-4">Pickup</th>
              <th className="py-2 pr-4">Return</th>
              <th className="py-2 pr-4">Days</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4 text-right">Total</th>
              <th className="py-2 pr-0 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="py-2 pr-4 font-mono">{b.id}</td>
                <td className="py-2 pr-4">{b.vehicleId} <span className="text-slate-400">({b.vehiclePlate})</span></td>
                <td className="py-2 pr-4">{b.customerName}</td>
                <td className="py-2 pr-4">{new Date(b.pickup).toLocaleString()}</td>
                <td className="py-2 pr-4">{new Date(b.dropoff).toLocaleString()}</td>
                <td className="py-2 pr-4">{b.days}</td>
                <td className="py-2 pr-4"><Badge tone={b.status === "Reserved" ? "blue" : b.status === "Ongoing" ? "amber" : b.status === "Completed" ? "green" : "red"}>{b.status}</Badge></td>
                <td className="py-2 pr-4 text-right">{formatCurrency(b.total)}</td>
                <td className="py-2 pr-0 text-right">
                  <div className="inline-flex gap-2">
                    {b.status !== "Completed" && (
                      <button onClick={() => updateBooking(b.id, { status: b.status === "Reserved" ? "Ongoing" : "Completed" })} className="px-2 py-1 rounded-lg border">{b.status === "Reserved" ? "Start" : "Complete"}</button>
                    )}
                    <button onClick={() => printBooking(b)} className="px-2 py-1 rounded-lg border">Print</button>
                    <button onClick={() => deleteBooking(b.id)} className="px-2 py-1 rounded-lg border text-red-600">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={9} className="text-slate-500 py-6 text-center">No bookings yet. Click “New Booking”.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {showForm && (<BookingForm onClose={() => setShowForm(false)} vehicles={vehicles} customers={customers} addBooking={addBooking} existingBookings={bookings} />)}
    </div>
  );
}

function BookingForm({ onClose, vehicles, customers, addBooking, existingBookings }) {
  const [vehicleId, setVehicleId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [pickup, setPickup] = useState(toDateInputValue(new Date()));
  const [dropoff, setDropoff] = useState(toDateInputValue(new Date(Date.now() + 24*60*60*1000)));
  const [ratePerDay, setRatePerDay] = useState("");
  const [withDriver, setWithDriver] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [notes, setNotes] = useState("");

  const veh = vehicles.find((v) => v.id === vehicleId);
  useEffect(() => { if (veh) setRatePerDay(String(veh.ratePerDay)); }, [vehicleId]);

  const d1 = parseDT(pickup); const d2 = parseDT(dropoff);
  const days = d1 && d2 ? daysBetween(d1, d2) : 1;
  const driverFee = withDriver ? 800 * days : 0;
  const base = Number(ratePerDay || 0) * days;
  const total = base + Number(deliveryFee || 0) + driverFee - Number(deposit || 0);

  const conflicts = useMemo(() => {
    if (!veh || !d1 || !d2) return [];
    return existingBookings.filter((b) => b.vehicleId === veh.id && ["Reserved","Ongoing"].includes(b.status) && overlaps(new Date(b.pickup), new Date(b.dropoff), d1, d2));
  }, [veh, d1, d2, existingBookings]);

  function submit(e) {
    e.preventDefault();
    if (!veh) return alert("Select a vehicle");
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return alert("Select a customer");
    if (conflicts.length) return alert("This schedule conflicts with an existing booking.");
    const id = `BK-${Date.now().toString().slice(-6)}`;
    const b = {
      id, status: "Reserved", vehicleId: veh.id, vehiclePlate: veh.plate,
      customerId: cust.id, customerName: cust.name, customerPhone: cust.phone, customerEmail: cust.email,
      pickup: d1.toISOString(), dropoff: d2.toISOString(), days,
      ratePerDay: Number(ratePerDay || 0), withDriver, deliveryFee: Number(deliveryFee || 0), deposit: Number(deposit || 0),
      total, notes,
    };
    addBooking(b); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">New Booking</h3>
          <button onClick={onClose} className="px-2 py-1 rounded-lg border">Close</button>
        </div>
        <form onSubmit={submit} className="p-4 grid md:grid-cols-2 gap-4">
          <Select label="Vehicle" value={vehicleId} onChange={setVehicleId} required options={vehicles.map((v) => ({ value: v.id, label: `${v.id} (${v.plate})` }))} />
          <Select label="Customer" value={customerId} onChange={setCustomerId} required options={customers.map((c) => ({ value: c.id, label: `${c.name} (${c.phone})` }))} />
          <TextInput label="Pickup" type="datetime-local" value={pickup} onChange={setPickup} required />
          <TextInput label="Return" type="datetime-local" value={dropoff} onChange={setDropoff} required />
          <TextInput label="Rate per day (₱)" type="number" value={ratePerDay} onChange={setRatePerDay} required />
          <TextInput label="Delivery fee (₱)" type="number" value={deliveryFee} onChange={(v) => setDeliveryFee(Number(v))} />
          <div className="flex items-end justify-between gap-4">
            <Toggle label="With driver (₱800/day)" checked={withDriver} onChange={setWithDriver} />
            <TextInput label="Deposit (₱)" type="number" value={deposit} onChange={(v) => setDeposit(Number(v))} />
          </div>
          <label className="md:col-span-2 text-sm">
            <span className="text-slate-700">Notes</span>
            <textarea className="mt-1 w-full rounded-xl border-slate-200 focus:border-slate-400 focus:ring-0 border px-3 py-2" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Requirements, pickup location, etc." />
          </label>
          <div className="md:col-span-2 flex flex-wrap items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div><div className="text-sm text-slate-500">Days</div><div className="text-lg font-semibold">{days}</div></div>
            <div><div className="text-sm text-slate-500">Base</div><div className="text-lg font-semibold">{formatCurrency(base)}</div></div>
            <div><div className="text-sm text-slate-500">Driver</div><div className="text-lg font-semibold">{formatCurrency(driverFee)}</div></div>
            <div><div className="text-sm text-slate-500">Delivery</div><div className="text-lg font-semibold">{formatCurrency(deliveryFee)}</div></div>
            <div><div className="text-sm text-slate-500">Deposit</div><div className="text-lg font-semibold">{formatCurrency(deposit)}</div></div>
            <div className="ml-auto"><div className="text-sm text-slate-500">Total</div><div className="text-2xl font-bold">{formatCurrency(total)}</div>{conflicts.length > 0 && (<div className="text-red-600 text-xs mt-1">⚠️ Schedule conflicts with {conflicts.length} booking(s).</div>)}</div>
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl border bg-white">Cancel</button>
            <button type="submit" className="px-3 py-2 rounded-xl bg-slate-900 text-white">Save Booking</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Vehicles({ vehicles, addVehicle, bookings }) {
  const [q, setQ] = useState(""); const [show, setShow] = useState(false);
  const list = vehicles.filter((v) => { const s = q.toLowerCase(); return !s || [v.id, v.make, v.model, v.plate, v.type].some((x) => String(x).toLowerCase().includes(s)); });
  function countBusy(vId) { return bookings.filter((b) => b.vehicleId === vId && ["Reserved","Ongoing"].includes(b.status)).length; }
  return (
    <div className="space-y-4">
      <SectionHeader title="Vehicles" subtitle="Fleet overview and rates" />
      <div className="flex items-end gap-2">
        <TextInput label="Search" value={q} onChange={setQ} placeholder="ID, plate, model…" />
        <div className="ml-auto"><button onClick={() => setShow(true)} className="px-3 py-2 rounded-xl bg-slate-900 text-white">Add Vehicle</button></div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        {list.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl border p-4">
            <div className="flex items-start justify-between">
              <div><div className="font-semibold">{v.id} <span className="text-slate-400">({v.plate})</span></div><div className="text-slate-600 text-sm">{v.year} {v.make} {v.model} • {v.trans} • {v.seats} seats</div></div>
              <Badge tone={countBusy(v.id) ? "amber" : "green"}>{countBusy(v.id) ? "Booked" : "Available"}</Badge>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-slate-500 text-sm">Type: {v.type}</div>
              <div className="text-lg font-bold">{formatCurrency(v.ratePerDay)}/day</div>
            </div>
          </div>
        ))}
      </div>
      {show && (<VehicleForm onClose={() => setShow(false)} addVehicle={addVehicle} />)}
    </div>
  );
}
function VehicleForm({ onClose, addVehicle }) {
  const [f, setF] = useState({ id: "", type: "Sedan", make: "", model: "", year: 2024, plate: "", trans: "AT", seats: 5, ratePerDay: 1500, status: "Available" });
  function set(k, v) { setF((p) => ({ ...p, [k]: v })); }
  function submit(e) {
    e.preventDefault();
    if (!f.id || !f.plate) return alert("ID and Plate are required.");
    addVehicle({ ...f, year: Number(f.year), seats: Number(f.seats), ratePerDay: Number(f.ratePerDay) }); onClose();
  }
  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="font-semibold">Add Vehicle</h3><button onClick={onClose} className="px-2 py-1 rounded-lg border">Close</button></div>
        <form onSubmit={submit} className="p-4 grid md:grid-cols-2 gap-4">
          <TextInput label="Vehicle ID" value={f.id} onChange={(v) => set("id", v)} required />
          <Select label="Type" value={f.type} onChange={(v) => set("type", v)} options={["Hatchback","Sedan","MPV","Pickup","Van"].map(x => ({ value: x, label: x }))} />
          <TextInput label="Make" value={f.make} onChange={(v) => set("make", v)} required />
          <TextInput label="Model" value={f.model} onChange={(v) => set("model", v)} required />
          <TextInput label="Year" type="number" value={f.year} onChange={(v) => set("year", v)} required />
          <TextInput label="Plate" value={f.plate} onChange={(v) => set("plate", v)} required />
          <Select label="Transmission" value={f.trans} onChange={(v) => set("trans", v)} options={["AT","MT"].map(x => ({ value: x, label: x }))} />
          <TextInput label="Seats" type="number" value={f.seats} onChange={(v) => set("seats", v)} required />
          <TextInput label="Rate per day (₱)" type="number" value={f.ratePerDay} onChange={(v) => set("ratePerDay", v)} required />
          <Select label="Status" value={f.status} onChange={(v) => set("status", v)} options={["Available","With Driver Only","Maintenance"].map(x => ({ value: x, label: x }))} />
          <div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="px-3 py-2 rounded-xl border bg-white">Cancel</button><button type="submit" className="px-3 py-2 rounded-xl bg-slate-900 text-white">Save Vehicle</button></div>
        </form>
      </div>
    </div>
  );
}

function Customers({ customers, addCustomer }) {
  const [q, setQ] = useState(""); const [show, setShow] = useState(false);
  const list = customers.filter((c) => { const s = q.toLowerCase(); return !s || [c.name, c.phone, c.email, c.idNo].some((x) => String(x).toLowerCase().includes(s)); });
  return (
    <div className="space-y-4">
      <SectionHeader title="Customers" subtitle="Renter records and contacts" />
      <div className="flex items-end gap-2">
        <TextInput label="Search" value={q} onChange={setQ} placeholder="Name, phone, email…" />
        <div className="ml-auto"><button onClick={() => setShow(true)} className="px-3 py-2 rounded-xl bg-slate-900 text-white">Add Customer</button></div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        {list.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border p-4">
            <div className="font-semibold">{c.name}</div>
            <div className="text-sm text-slate-600">{c.phone} • {c.email}</div>
            <div className="text-sm text-slate-500 mt-1">{c.idType}: {c.idNo}</div>
          </div>
        ))}
        {list.length === 0 && (<div className="text-slate-500">No customers yet.</div>)}
      </div>
      {show && <CustomerForm onClose={() => setShow(false)} addCustomer={addCustomer} />}
    </div>
  );
}
function CustomerForm({ onClose, addCustomer }) {
  const [f, setF] = useState({ id: "CUS-" + Math.floor(Math.random()*9000+1000), name: "", phone: "", email: "", idType: "Driver's License", idNo: "" });
  function set(k, v) { setF((p) => ({ ...p, [k]: v })); }
  function submit(e) { e.preventDefault(); if (!f.name || !f.phone) return alert("Name and phone are required."); addCustomer(f); onClose(); }
  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="font-semibold">Add Customer</h3><button onClick={onClose} className="px-2 py-1 rounded-lg border">Close</button></div>
        <form onSubmit={submit} className="p-4 grid md:grid-cols-2 gap-4">
          <TextInput label="Full name" value={f.name} onChange={(v) => set(k="name", v)} required />
          <TextInput label="Phone" value={f.phone} onChange={(v) => set(k="phone", v)} required />
          <TextInput label="Email" type="email" value={f.email} onChange={(v) => set(k="email", v)} />
          <Select label="ID Type" value={f.idType} onChange={(v) => set(k="idType", v)} options={["Driver's License","UMID","Passport","SSS","PhilID"].map(x => ({ value: x, label: x }))} />
          <TextInput label="ID Number" value={f.idNo} onChange={(v) => set(k="idNo", v)} />
          <div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="px-3 py-2 rounded-xl border bg-white">Cancel</button><button type="submit" className="px-3 py-2 rounded-xl bg-slate-900 text-white">Save Customer</button></div>
        </form>
      </div>
    </div>
  );
}

function Settings({ data, setData }) {
  const [company, setCompany] = useState(data.settings.company);
  const [address, setAddress] = useState(data.settings.address);
  const [phone, setPhone] = useState(data.settings.phone);
  const [email, setEmail] = useState(data.settings.email);
  function save() { setData((p) => ({ ...p, settings: { company, address, phone, email } })); }
  return (
    <div className="space-y-4">
      <SectionHeader title="Settings" subtitle="Business information displays on printouts" />
      <div className="grid md:grid-cols-2 gap-4">
        <TextInput label="Company" value={company} onChange={setCompany} />
        <TextInput label="Phone" value={phone} onChange={setPhone} />
        <TextInput label="Email" value={email} onChange={setEmail} />
        <label className="md:col-span-2 text-sm">
          <span className="text-slate-700">Address</span>
          <textarea className="mt-1 w-full rounded-xl border-slate-200 focus:border-slate-400 focus:ring-0 border px-3 py-2" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
      </div>
      <div className="flex justify-end"><button onClick={save} className="px-3 py-2 rounded-xl bg-slate-900 text-white">Save</button></div>
      <div className="bg-white rounded-2xl border p-4">
        <b>How to run</b>
        <ol className="list-decimal ml-5 space-y-1 text-sm text-slate-600">
          <li>Open a terminal: <code>npm install</code></li>
          <li>Start dev server: <code>npm run dev</code></li>
          <li>Open the shown URL in Chrome.</li>
        </ol>
      </div>
    </div>
  );
}
