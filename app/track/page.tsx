"use client";
import { useState } from "react";
import { ArrowRight, PackageSearch } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

type Result = {
  tracking_code: string;
  status: string;
  public_message: string;
  updated_at: string;
};

export default function TrackOrder() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function track(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    const values = new FormData(e.currentTarget);
    const supabase = getSupabase();
    if (!supabase) {
      setError("Database connection is not active yet.");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("track_order", {
      p_tracking_code: String(values.get("code") || ""),
      p_customer_email: String(values.get("email") || ""),
    });
    if (error) setError(error.message);
    else if (!data?.length)
      setError("No order matched that tracking number and email.");
    else setResult(data[0] as Result);
    setLoading(false);
  }

  return (
    <main className="login">
      <div className="login-card track-card">
        <a className="brand" href="../#order">
          <span className="mark">V</span>Vertex
        </a>
        <h1>Track a print</h1>
        <p>Enter the order number and email used on your request.</p>
        <form onSubmit={track}>
          <div className="field">
            <label>Order number</label>
            <input name="code" required placeholder="VTX-12345678" />
          </div>
          <div className="field">
            <label>Customer email</label>
            <input name="email" type="email" required />
          </div>
          <button className="btn btn-dark" type="submit" disabled={loading}>
            {loading ? "Checking…" : "Check status"} <ArrowRight size={16} />
          </button>
        </form>
        {error && <div className="form-error">{error}</div>}
        {result && (
          <div className="tracking-demo">
            <PackageSearch size={26} />
            <div>
              <strong>{result.status.replaceAll("_", " ").toUpperCase()}</strong>
              <p>{result.public_message}</p>
              <small>{result.tracking_code}</small>
            </div>
          </div>
        )}
        <a className="back-home" href="../#order">← Back to order page</a>
      </div>
    </main>
  );
}
