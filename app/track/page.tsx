"use client";
import { useState } from "react";
import { ArrowRight, PackageSearch } from "lucide-react";
export default function TrackOrder(){
  const [searched,setSearched]=useState(false);
  return <main className="login"><div className="login-card track-card"><a className="brand" href="../"><span className="mark">V</span>Vertex</a><h1>Track a print</h1><p>Enter the order number and the email used on your request.</p><form onSubmit={e=>{e.preventDefault();setSearched(true)}}><div className="field"><label>Order number</label><input required placeholder="VTX-12345678"/></div><div className="field"><label>Customer email</label><input type="email" required placeholder="you@example.com"/></div><button className="btn btn-dark" type="submit">Check status <ArrowRight size={16}/></button></form>{searched&&<div className="tracking-demo"><PackageSearch size={26}/><div><strong>Tracking demo</strong><p>Live private tracking will activate when the Vertex Supabase database is connected.</p></div></div>}<a className="back-home" href="../">← Back to Vertex</a></div></main>;
}
