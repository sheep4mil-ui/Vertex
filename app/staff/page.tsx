"use client";
import { useState } from "react";
import { ArrowRight, CalendarDays } from "lucide-react";

export default function Staff() {
  const [logged, setLogged] = useState(false);
  const [role, setRole] = useState<"employee" | "admin">("employee");
  const [codeSent, setCodeSent] = useState(false);
  const [discountSaved, setDiscountSaved] = useState(false);

  if (!logged) return <main className="login"><div className="login-card">
    <a className="brand" href="../"><span className="mark">V</span>Vertex</a><h1>Team sign in</h1>
    <p>Employees use an approved account and code. Administrator access stays separate.</p>
    <div className="role-tabs"><button type="button" className={role === "employee" ? "active" : ""} onClick={() => { setRole("employee"); setCodeSent(false); }}>Employee</button><button type="button" className={role === "admin" ? "active" : ""} onClick={() => { setRole("admin"); setCodeSent(false); }}>Administrator</button></div>
    <form onSubmit={e => { e.preventDefault(); if (role === "employee" && !codeSent) { setCodeSent(true); return; } setLogged(true); }}>
      <div className="field"><label>Approved email address</label><input type="email" required placeholder="you@gmail.com" /></div>
      {role === "employee" && !codeSent && <button className="btn btn-dark" type="submit">Send my sign-in code <ArrowRight size={16} /></button>}
      {role === "employee" && codeSent && <><div className="success">Demo: enter the code assigned to this approved employee.</div><div className="field"><label>Employee code</label><input inputMode="numeric" pattern="[0-9]{4}" required placeholder="0000" /></div><button className="btn btn-dark" type="submit">Verify and sign in</button></>}
      {role === "admin" && <><div className="field"><label>Private administrator code</label><input type="password" required placeholder="Enter admin code" /></div><button className="btn btn-dark" type="submit">Enter admin workspace</button></>}
    </form>
    {role === "employee" && <p className="discount-note">Verified employees receive the configured employee discount on their own orders.</p>}
  </div></main>;

  return <main className="portal"><div className="portal-grid">
    <aside className="side"><a className="brand" href="../"><span className="mark">V</span>Vertex</a><nav><a className="active">Orders</a><a>Customers</a><a>Team</a><a>Discounts</a><a>Announcements</a><a>Settings</a></nav></aside>
    <section className="main"><header className="top"><div><p className="eyebrow">{role === "admin" ? "Admin workspace" : "Employee workspace · Employee level"}</p><h1>Orders</h1></div><button className="btn btn-dark">New order</button></header>
      <div className="stats"><article className="stat"><span>New requests</span><strong>3</strong></article><article className="stat"><span>Currently printing</span><strong>2</strong></article><article className="stat"><span>Ready to ship</span><strong>1</strong></article></div>
      {role === "admin" && <article className="panel discount-panel"><div><span className="panel-icon"><CalendarDays size={22}/></span><h2>Seasonal discount</h2><p>Create a temporary discount for every customer. Employee and seasonal discounts do not stack; Vertex uses the larger discount.</p></div><form onSubmit={e=>{e.preventDefault();setDiscountSaved(true)}}><div className="grid2"><div className="field"><label>Promotion name</label><input required placeholder="Summer sale"/></div><div className="field"><label>Percent off</label><input required type="number" min="1" max="100" placeholder="15"/></div></div><div className="grid2"><div className="field"><label>Start date</label><input required type="date"/></div><div className="field"><label>End date</label><input required type="date"/></div></div>{discountSaved&&<div className="success">Demo discount saved. It will go live after Supabase is connected.</div>}<button className="btn btn-dark">Save seasonal discount</button></form></article>}
      <article className="panel"><h2>Recent orders</h2><table className="table"><thead><tr><th>Order</th><th>Customer</th><th>Item</th><th>Status</th><th>Updates</th></tr></thead><tbody><tr><td>#VTX-1042</td><td>Jordan M.</td><td>Desk organizer</td><td><span className="pill printing">Printing</span></td><td>Email + text</td></tr><tr><td>#VTX-1041</td><td>Alex R.</td><td>Replacement knob</td><td><span className="pill">Awaiting quote</span></td><td>Email</td></tr></tbody></table></article>
      <p style={{color:"#66736e",fontSize:13}}>Staff levels: Employee → Lead → Manager. Promotions never grant administrator access. Demo data only.</p>
    </section>
  </div></main>;
}
