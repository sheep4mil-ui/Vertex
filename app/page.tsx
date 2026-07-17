"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Box,
  Mail,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export default function Home() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [orderType, setOrderType] = useState<"printing" | "cnc" | "pcb_manufacturing" | "pcb_assembly">("printing");
  const serviceName = orderType === "cnc" ? "CNC"
    : orderType === "pcb_manufacturing" ? "PCB Manufacturing"
    : orderType === "pcb_assembly" ? "PCB Assembly"
    : "3D Printing";
  const [availableFilaments, setAvailableFilaments] = useState<{ material: string; color: string }[]>([]);
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.rpc("get_public_filament_inventory").then(({ data }) => setAvailableFilaments((data || []) as { material: string; color: string }[]));
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setMessage("");
    const form = e.currentTarget,
      values = new FormData(form),
      supabase = getSupabase();
    if (!supabase) {
      setMessage("Database connection is not active yet.");
      setSending(false);
      return;
    }
    const preference = String(values.get("contact") || "email");
    const orderArguments = {
      p_customer_name: String(values.get("name") || ""),
      p_customer_email: String(values.get("email") || ""),
      p_customer_phone: String(values.get("phone") || ""),
      p_shipping_address: String(values.get("shipping_address") || ""),
      p_update_preference: preference,
      p_material: orderType !== "printing"
        ? `${serviceName} — ${String(values.get("specialty_material") || "Details to be confirmed")}`
        : String(values.get("material") || ""),
      p_quantity: Number(values.get("quantity") || 1),
      p_details: orderType !== "printing"
        ? `[${serviceName.toUpperCase()} REQUEST — UPPER MANAGEMENT REVIEW REQUIRED]\n${String(values.get("custom_description") || "")}`
        : String(values.get("custom_description") || ""),
      p_model_url: String(values.get("model_url") || ""),
      p_promo_code: String(values.get("promo_code") || ""),
    };
    let { data, error } = await supabase.rpc("submit_order", orderArguments);
    // Keep order submission available until the promo-code migration has been
    // run. The code is preserved in the details so staff can still verify it.
    if (error?.message.includes("Could not find the function") && orderArguments.p_promo_code) {
      const { p_promo_code, ...legacyArguments } = orderArguments;
      const fallback = await supabase.rpc("submit_order", {
        ...legacyArguments,
        p_details: `${legacyArguments.p_details}\n\nPromo code to verify: ${p_promo_code.trim().toUpperCase()}`,
      });
      data = fallback.data;
      error = fallback.error;
    }
    if (error) setMessage(`Order could not be saved: ${error.message}`);
    else {
      setMessage(
        `Success! Your tracking number is ${data}. Save it for order updates.`,
      );
      form.reset();
      setPolicyAccepted(false);
    }
    setSending(false);
  }
  return (
    <>
      <header className="shell nav">
        <a className="brand" href="https://sheep4mil-ui.github.io/Vertex/#order">
          <span className="mark">V</span>Vertex
        </a>
        <nav className="navlinks">
          <a href="#process">How it works</a>
          <a href="#order">Order</a>
          <a className="btn btn-light staff-signin" href="staff">Staff sign in</a>
          <a className="btn btn-dark nav-order-button" href="#order">
            Start a print <ArrowRight size={17} />
          </a>
        </nav>
      </header>
      <main>
        <section className="shell hero">
          <div>
            <p className="eyebrow">Custom 3D printing · Texas</p>
            <h1>
              Ideas,
              <br />
              <em>made real.</em>
            </h1>
            <p className="lead">
              From useful replacement parts to one-of-a-kind creations, Vertex
              turns your model into a quality print—with clear updates from
              quote to delivery.
            </p>
            <div className="actions">
              <a className="btn btn-dark" href="#order">
                Request a quote <ArrowRight size={17} />
              </a>
              <a className="btn btn-light" href="track">
                Track an order
              </a>
            </div>
          </div>
          <div className="hero-art">
            <span className="chip one">
              <Box size={15} /> Made layer by layer
            </span>
            <div className="printer" />
            <div className="model" />
            <span className="chip two">Built for your idea</span>
          </div>
        </section>
        <section id="process" className="dark section">
          <div className="shell">
            <div className="section-head">
              <h2>
                Simple from
                <br />
                start to finish.
              </h2>
              <p>
                Tell us what you need. We’ll review the details, send a clear
                quote, and keep you updated while we make it.
              </p>
            </div>
            <div className="steps">
              <article className="step">
                <span className="step-num">01 · SHARE</span>
                <h3>Send your idea</h3>
                <p>
                  Share a link to your model or describe what you want. Choose
                  a material, color, and quantity.
                </p>
              </article>
              <article className="step">
                <span className="step-num">02 · APPROVE</span>
                <h3>Get a quote</h3>
                <p>
                  We review printability and pricing. Nothing starts until you
                  approve the final quote.
                </p>
              </article>
              <article className="step">
                <span className="step-num">03 · CREATE</span>
                <h3>Follow the build</h3>
                <p>
                  Choose email or text updates and know when your print starts,
                  finishes, and ships.
                </p>
              </article>
            </div>
          </div>
        </section>
        <section id="order" className="shell section">
          <div className="section-head">
            <div>
              <p className="eyebrow">Request a quote</p>
              <h2>
                What can we
                <br />
                make for you?
              </h2>
            </div>
            <p>
              No payment is collected here. We’ll review your request and
              contact you with availability and a quote.
            </p>
          </div>
          <div className="order-wrap">
            <aside className="order-note">
              <h3>Stay in the loop.</h3>
              <p>
                Choose email, text, or both for updates when your order is
                quoted, printing, ready, or shipped.
              </p>
              <p>
                <Mail size={18} /> Email updates
                <br />
                <MessageSquare size={18} /> Optional text updates
                <br />
                <ShieldCheck size={18} /> Contact details kept private
              </p>
              <p className="cnc-note">
                <strong>Need CNC machining?</strong><br />
                Limited CNC work may be available from time to time by request
                for an additional charge. Upper management will review the
                request and either accept or deny it. Availability and pricing
                are confirmed before an accepted order moves forward.
              </p>
            </aside>
            <form className="form" onSubmit={submit}>
              <div className="order-type-tabs" role="tablist" aria-label="Order type">
                <button type="button" role="tab" aria-selected={orderType === "printing"} className={orderType === "printing" ? "active" : ""} onClick={() => setOrderType("printing")}>3D Printing</button>
                <button type="button" role="tab" aria-selected={orderType === "cnc"} className={orderType === "cnc" ? "active" : ""} onClick={() => setOrderType("cnc")}>CNC Request</button>
                <button type="button" role="tab" aria-selected={orderType === "pcb_manufacturing"} className={orderType === "pcb_manufacturing" ? "active" : ""} onClick={() => setOrderType("pcb_manufacturing")}>PCB Manufacturing</button>
                <button type="button" role="tab" aria-selected={orderType === "pcb_assembly"} className={orderType === "pcb_assembly" ? "active" : ""} onClick={() => setOrderType("pcb_assembly")}>PCB Assembly</button>
              </div>
              {orderType !== "printing" && <div className="cnc-review-banner"><strong>{serviceName} request</strong><span>Upper management will review this request and either accept or deny it. Availability is limited and this service costs extra.</span></div>}
              {message && (
                <div
                  className={
                    message.startsWith("Success") ? "success" : "form-error"
                  }
                >
                  {message}
                </div>
              )}
              <div className="grid2">
                <div className="field">
                  <label htmlFor="name">Full name</label>
                  <input id="name" name="name" required />
                </div>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" required />
                </div>
              </div>
              <div className="field">
                <label htmlFor="shipping_address">Shipping address (leave blank for local pickup)</label>
                <textarea id="shipping_address" name="shipping_address" autoComplete="street-address" placeholder="Street address, apartment or unit, city, state, and ZIP code" />
                <small>Only Vertex staff can view this address. We will confirm shipping costs before payment.</small>
              </div>
              <div className="grid2">
                <div className="field">
                  <label htmlFor="phone">Phone number (optional)</label>
                  <input id="phone" name="phone" type="tel" />
                </div>
                <div className="field">
                  <label htmlFor="contact">Update preference</label>
                  <select id="contact" name="contact">
                    <option value="email">Email</option>
                    <option value="text">Text message</option>
                    <option value="both">Email and text</option>
                  </select>
                </div>
              </div>
              <div className="grid2">
                {orderType === "printing" ? <div className="field">
                  <label htmlFor="material">Material</label>
                  <select id="material" name="material">
                    <option>Not sure—help me choose</option>
                    {availableFilaments.length > 0 ? availableFilaments.map((filament) => <option key={`${filament.material}-${filament.color}`} value={`${filament.material} - ${filament.color}`}>{filament.material} — {filament.color}</option>) : <><option>PLA</option><option>PETG</option><option>TPU / flexible</option></>}
                  </select>
                </div> : <div className="field">
                  <label htmlFor="specialty_material">{orderType === "cnc" ? "Preferred CNC material" : orderType === "pcb_manufacturing" ? "PCB material and finish" : "Board and component details"}</label>
                  <input id="specialty_material" name="specialty_material" required placeholder={orderType === "cnc" ? "Wood, aluminum, plastic, or not sure" : orderType === "pcb_manufacturing" ? "FR-4, layer count, copper weight, surface finish, or not sure" : "PCB type, component sourcing needs, soldering requirements, or not sure"} />
                </div>}
                <div className="field">
                  <label htmlFor="quantity">Quantity</label>
                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    max="100"
                    defaultValue="1"
                  />
                </div>
              </div>
              {orderType === "printing" && availableFilaments.length > 0 && <div className="available-filaments"><strong>Colors currently in stock</strong><div>{availableFilaments.map((filament) => <span key={`${filament.material}-${filament.color}`}>{filament.material} · {filament.color}</span>)}</div><small>Inventory is updated by Vertex staff. Availability is confirmed before your quote is accepted.</small></div>}
              <div className="field">
                <label htmlFor="custom_description">
                  {orderType === "cnc" ? "CNC project description" : orderType === "pcb_manufacturing" ? "PCB manufacturing description" : orderType === "pcb_assembly" ? "PCB assembly description" : "Custom order description"}
                </label>
                <textarea
                  id="custom_description"
                  name="custom_description"
                  required
                  placeholder={orderType === "cnc" ? "Describe the part, dimensions, material, tolerances, purpose, and deadline." : orderType === "pcb_manufacturing" ? "Describe board dimensions, layers, quantity, material, finish, files, and deadline." : orderType === "pcb_assembly" ? "Describe the board, components, sourcing, soldering, testing needs, quantity, and deadline." : "Describe the object, size, color, purpose, special features, and any deadline."}
                />
                <small>
                  Use this for a completely custom idea or to explain changes
                  you want made to a linked model.
                </small>
              </div>
              <div className="field">
                <label htmlFor="model_url">
                  {orderType === "cnc" ? "Share link to your CNC design or drawing (optional)" : orderType === "pcb_manufacturing" ? "Share link to Gerber/design files (optional)" : orderType === "pcb_assembly" ? "Share link to PCB, BOM, and placement files (optional)" : "Share link to your 3D model (optional)"}
                </label>
                <input
                  id="model_url"
                  name="model_url"
                  type="url"
                  pattern="https://.*"
                  placeholder="https://drive.google.com/…"
                />
                <small>
                  Make sure anyone with the link can view or download it.
                </small>
              </div>
              <div className="field">
                <label htmlFor="promo_code">Discount code (optional)</label>
                <input
                  id="promo_code"
                  name="promo_code"
                  minLength={3}
                  maxLength={20}
                  autoComplete="off"
                  placeholder="VERTEX15"
                  onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase().replace(/\s/g, ""))}
                />
                <small>Valid codes are applied when Vertex prepares your quote.</small>
              </div>
              <label className="order-policy">
                <input type="checkbox" required checked={policyAccepted} onChange={(e) => setPolicyAccepted(e.target.checked)} />
                <span><strong>Yes, I agree.</strong> I understand custom orders are final sale. Vertex quality-checks prints and reprints failed items before delivery. Vertex does not offer refunds or replacements for damage that happens after pickup or while handled by a shipping carrier.</span>
              </label>
              <button className="btn btn-dark" type="submit" disabled={sending || !policyAccepted}>
                {sending ? "Saving order…" : "Send quote request"}{" "}
                <ArrowRight size={17} />
              </button>
            </form>
          </div>
        </section>
      </main>
      <footer className="shell footer">
        <a className="brand" href="https://sheep4mil-ui.github.io/Vertex/#order">
          <span className="mark">V</span>Vertex
        </a>
        <span>Custom 3D printing in Texas</span>
        <a className="staff-link" href="staff">
          Staff sign in
        </a>
      </footer>
    </>
  );
}
