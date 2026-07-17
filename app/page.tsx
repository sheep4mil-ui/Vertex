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
  const [paymentMethod, setPaymentMethod] = useState("arrange_later");
  const [orderType, setOrderType] = useState<"printing" | "cnc" | "pcb_manufacturing" | "metal_printing">("printing");
  const serviceName = orderType === "cnc" ? "CNC"
    : orderType === "pcb_manufacturing" ? "PCB Manufacturing"
    : orderType === "metal_printing" ? "Metal 3D Printing"
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
    const paypalAccount = String(values.get("paypal_account") || "").trim();
    const specialtyDetails = orderType === "cnc"
      ? [
          "Process: CNC machining",
          `Material: ${String(values.get("specialty_material") || "Not sure")}`,
          `Finish: ${String(values.get("cnc_finish") || "Not sure")}`,
          `Dimensions/tolerance: ${String(values.get("cnc_dimensions") || "Not provided")}`,
        ]
      : orderType === "pcb_manufacturing"
        ? [
            `PCB type: ${String(values.get("pcb_type") || "Not sure")}`,
            `Material: ${String(values.get("specialty_material") || "Not sure")}`,
            `Layers: ${String(values.get("pcb_layers") || "Not sure")}`,
            `Board size: ${String(values.get("pcb_dimensions") || "Not provided")}`,
            `Copper weight: ${String(values.get("pcb_copper") || "Not sure")}`,
            `Surface finish: ${String(values.get("pcb_finish") || "Not sure")}`,
            `Solder mask color: ${String(values.get("pcb_mask") || "Not sure")}`,
          ]
        : orderType === "metal_printing"
          ? [
              `Metal/process: ${String(values.get("specialty_material") || "Not sure")}`,
              `Finish: ${String(values.get("metal_finish") || "Not sure")}`,
              `Dimensions: ${String(values.get("metal_dimensions") || "Not provided")}`,
              `Tolerance: ${String(values.get("metal_tolerance") || "Not provided")}`,
              `Intended use: ${String(values.get("metal_use") || "Not provided")}`,
            ]
          : [];
    const customerDescription = String(values.get("custom_description") || "");
    const paymentDetails = paymentMethod === "paypal"
      ? `Payment preference: PayPal payment request\nPayPal account: ${paypalAccount}`
      : paymentMethod === "cash"
        ? "Payment preference: Cash paid in full before materials are ordered or production begins"
        : "Payment preference: Arrange with Vertex after quote";
    const savedDetails = orderType !== "printing"
      ? `[${serviceName.toUpperCase()} REQUEST — UPPER MANAGEMENT REVIEW REQUIRED]\n${specialtyDetails.join("\n")}\n\n${paymentDetails}\n\nCustomer notes:\n${customerDescription}`
      : `${customerDescription}\n\n${paymentDetails}`;
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
      p_details: savedDetails,
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
      setPaymentMethod("arrange_later");
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
                <button type="button" role="tab" aria-selected={orderType === "metal_printing"} className={orderType === "metal_printing" ? "active" : ""} onClick={() => setOrderType("metal_printing")}>Metal 3D Printing</button>
              </div>
              {orderType !== "printing" && <div className="cnc-review-banner"><strong>{serviceName} request</strong><span>{orderType === "pcb_manufacturing" ? "Vertex will review the design and may order accepted boards or parts from PCBWay or another approved supplier." : orderType === "metal_printing" ? "Vertex will review the model and may order the accepted metal print from PCBWay or another approved supplier, then inspect it before delivery." : "Vertex completes accepted CNC work using available equipment and materials."} Upper management will accept or deny the request before work begins.</span></div>}
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
                  <label htmlFor="specialty_material">{orderType === "cnc" ? "Preferred CNC material" : orderType === "pcb_manufacturing" ? "PCB material and finish" : "Preferred metal and printing process"}</label>
                  <input id="specialty_material" name="specialty_material" required placeholder={orderType === "cnc" ? "Wood, aluminum, plastic, or not sure" : orderType === "pcb_manufacturing" ? "FR-4, layer count, copper weight, surface finish, or not sure" : "Stainless steel, aluminum, titanium, DMLS, SLM, or not sure"} />
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
              {orderType === "cnc" && <div className="specialty-fields">
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="cnc_finish">Finish</label>
                    <input id="cnc_finish" name="cnc_finish" placeholder="As-machined, sanded, polished, painted, or not sure" />
                  </div>
                  <div className="field">
                    <label htmlFor="cnc_dimensions">Dimensions and tolerance</label>
                    <input id="cnc_dimensions" name="cnc_dimensions" placeholder="Example: 100 × 50 × 10 mm, ±0.2 mm" />
                  </div>
                </div>
              </div>}
              {orderType === "pcb_manufacturing" && <div className="specialty-fields">
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="pcb_type">PCB type</label>
                    <select id="pcb_type" name="pcb_type" required>
                      <option value="">Choose a board type</option>
                      <option>Standard rigid PCB</option>
                      <option>Flex PCB</option>
                      <option>Rigid-flex PCB</option>
                      <option>HDI PCB</option>
                      <option>Not sure—review my files</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="pcb_layers">Layer count</label>
                    <select id="pcb_layers" name="pcb_layers">
                      <option>Not sure</option><option>1</option><option>2</option><option>4</option><option>6</option><option>8+</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="pcb_dimensions">Board dimensions</label>
                    <input id="pcb_dimensions" name="pcb_dimensions" placeholder="Length × width in mm" />
                  </div>
                  <div className="field">
                    <label htmlFor="pcb_copper">Copper weight</label>
                    <select id="pcb_copper" name="pcb_copper">
                      <option>Not sure</option><option>1 oz</option><option>2 oz</option><option>Other</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="pcb_finish">Surface finish</label>
                    <select id="pcb_finish" name="pcb_finish">
                      <option>Not sure</option><option>HASL</option><option>Lead-free HASL</option><option>ENIG</option><option>Other</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="pcb_mask">Solder mask color</label>
                    <input id="pcb_mask" name="pcb_mask" placeholder="Green, black, blue, or other" />
                  </div>
                </div>
              </div>}
              {orderType === "metal_printing" && <div className="specialty-fields">
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="metal_finish">Requested finish</label>
                    <input id="metal_finish" name="metal_finish" placeholder="As-printed, polished, bead blasted, or not sure" />
                  </div>
                  <div className="field">
                    <label htmlFor="metal_dimensions">Part dimensions</label>
                    <input id="metal_dimensions" name="metal_dimensions" placeholder="Length × width × height in mm" />
                  </div>
                  <div className="field">
                    <label htmlFor="metal_tolerance">Required tolerance</label>
                    <input id="metal_tolerance" name="metal_tolerance" placeholder="Example: ±0.2 mm, or not sure" />
                  </div>
                  <div className="field">
                    <label htmlFor="metal_use">Intended use</label>
                    <input id="metal_use" name="metal_use" placeholder="Prototype, display, mechanical part, or other" />
                  </div>
                </div>
              </div>}
              {orderType !== "printing" && <div className="supplier-reference">
                <strong>Vertex pricing is higher than supplier pricing</strong>
                <span>Supplier advertisements are not the customer&apos;s final price. The Vertex quote may include the supplier order, shipping, parts, assembly labor, setup, inspection or testing, handling, risk, and profit. You will receive the final price and estimated completion date after management reviews the files.</span>
              </div>}
              {orderType === "printing" && availableFilaments.length > 0 && <div className="available-filaments"><strong>Colors currently in stock</strong><div>{availableFilaments.map((filament) => <span key={`${filament.material}-${filament.color}`}>{filament.material} · {filament.color}</span>)}</div><small>Inventory is updated by Vertex staff. Availability is confirmed before your quote is accepted.</small></div>}
              <div className="field">
                <label htmlFor="custom_description">
                  {orderType === "cnc" ? "CNC project description" : orderType === "pcb_manufacturing" ? "PCB manufacturing description" : orderType === "metal_printing" ? "Metal 3D printing description" : "Custom order description"}
                </label>
                <textarea
                  id="custom_description"
                  name="custom_description"
                  required
                  placeholder={orderType === "cnc" ? "Describe the part, dimensions, material, tolerances, purpose, and deadline." : orderType === "pcb_manufacturing" ? "Describe board dimensions, layers, quantity, material, finish, files, and deadline." : orderType === "metal_printing" ? "Describe the metal part, strength needs, dimensions, tolerances, finish, purpose, and deadline." : "Describe the object, size, color, purpose, special features, and any deadline."}
                />
                <small>
                  Use this for a completely custom idea or to explain changes
                  you want made to a linked model.
                </small>
              </div>
              <div className="field">
                <label htmlFor="model_url">
                  {orderType === "cnc" ? "Share link to your CNC design or drawing (optional)" : orderType === "pcb_manufacturing" ? "Share link to Gerber/design files (optional)" : orderType === "metal_printing" ? "Share link to your metal 3D model or drawing (optional)" : "Share link to your 3D model (optional)"}
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
              <div className="payment-choice">
                <strong>Payment preference</strong>
                <label>
                  <input type="radio" name="payment_method" value="arrange_later" checked={paymentMethod === "arrange_later"} onChange={(e) => setPaymentMethod(e.target.value)} />
                  <span><b>Arrange payment later</b><small>Vertex will provide payment instructions after you accept the quote.</small></span>
                </label>
                <label>
                  <input type="radio" name="payment_method" value="paypal" checked={paymentMethod === "paypal"} onChange={(e) => setPaymentMethod(e.target.value)} />
                  <span><b>PayPal payment request</b><small>Staff will manually send a PayPal request after the order and final price are approved.</small></span>
                </label>
                <label>
                  <input type="radio" name="payment_method" value="cash" checked={paymentMethod === "cash"} onChange={(e) => setPaymentMethod(e.target.value)} />
                  <span><b>Cash before production</b><small>After accepting the final quote, arrange a safe in-person payment with Vertex. Full payment is required before materials are ordered or work begins. Do not mail cash.</small></span>
                </label>
                {paymentMethod === "paypal" && <div className="field paypal-account">
                  <label htmlFor="paypal_account">PayPal email or username</label>
                  <input id="paypal_account" name="paypal_account" required autoComplete="email" placeholder="name@example.com or @username" />
                  <small>Double-check this account. Vertex will not charge it automatically, and only staff can see it.</small>
                </div>}
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
