"use client";
import { useState } from "react";
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
  const [priceMaterial, setPriceMaterial] = useState<"PLA" | "PETG">("PLA");
  const [estimatedGrams, setEstimatedGrams] = useState(100);
  const [estimatedHours, setEstimatedHours] = useState(5);
  const gramRate = priceMaterial === "PLA" ? 0.15 : 0.25;
  const estimatedPrice = 5 + estimatedGrams * gramRate + estimatedHours * 2;
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
    const { data, error } = await supabase.rpc("submit_order", {
      p_customer_name: String(values.get("name") || ""),
      p_customer_email: String(values.get("email") || ""),
      p_customer_phone: String(values.get("phone") || ""),
      p_update_preference: preference,
      p_material: String(values.get("material") || ""),
      p_quantity: Number(values.get("quantity") || 1),
      p_details: String(values.get("custom_description") || ""),
      p_model_url: String(values.get("model_url") || ""),
    });
    if (error) setMessage(`Order could not be saved: ${error.message}`);
    else {
      setMessage(
        `Success! Your tracking number is ${data}. Save it for order updates.`,
      );
      form.reset();
    }
    setSending(false);
  }
  return (
    <>
      <header className="shell nav">
        <a className="brand" href="#">
          <span className="mark">V</span>Vertex
        </a>
        <nav className="navlinks">
          <a href="#process">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#order">Order</a>
          <a href="staff">Staff</a>
          <a className="btn btn-dark" href="#order">
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
        <section id="pricing" className="pricing-section">
          <div className="shell price-grid">
            <div>
              <p className="eyebrow">Instant estimate</p>
              <h2>Plan your print price.</h2>
              <p className="lead price-lead">
                Enter the total filament weight and estimated printing time from your slicer.
              </p>
              <div className="rate-cards">
                <span><strong>PLA</strong>$0.15 per gram</span>
                <span><strong>PETG</strong>$0.25 per gram</span>
                <span><strong>Machine time</strong>$2 per hour</span>
                <span><strong>Setup</strong>$5 per order</span>
              </div>
            </div>
            <article className="price-calculator">
              <div className="field">
                <label htmlFor="price-material">Material</label>
                <select id="price-material" value={priceMaterial} onChange={(e) => setPriceMaterial(e.target.value as "PLA" | "PETG")}>
                  <option value="PLA">PLA — $0.15/g</option>
                  <option value="PETG">PETG — $0.25/g</option>
                </select>
              </div>
              <div className="grid2">
                <div className="field">
                  <label htmlFor="price-grams">Total grams</label>
                  <input id="price-grams" type="number" min="1" max="10000" value={estimatedGrams} onChange={(e) => setEstimatedGrams(Math.max(0, Number(e.target.value)))} />
                </div>
                <div className="field">
                  <label htmlFor="price-hours">Print hours</label>
                  <input id="price-hours" type="number" min="0" max="1000" step="0.25" value={estimatedHours} onChange={(e) => setEstimatedHours(Math.max(0, Number(e.target.value)))} />
                </div>
              </div>
              <div className="estimate-total">
                <span>Estimated print price</span>
                <strong>${estimatedPrice.toFixed(2)}</strong>
              </div>
              <p className="estimate-formula">
                $5 setup + ${gramRate.toFixed(2)} × {estimatedGrams}g + $2 × {estimatedHours}h
              </p>
              <small>Estimate only. Shipping, tax, design work, unusual materials, and requested changes may cost extra. Your final quote must be approved before printing.</small>
            </article>
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
            </aside>
            <form className="form" onSubmit={submit}>
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
                <div className="field">
                  <label htmlFor="material">Material</label>
                  <select id="material" name="material">
                    <option>Not sure—help me choose</option>
                    <option>PLA</option>
                    <option>PETG</option>
                    <option>TPU / flexible</option>
                  </select>
                </div>
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
              <div className="field">
                <label htmlFor="custom_description">
                  Custom order description
                </label>
                <textarea
                  id="custom_description"
                  name="custom_description"
                  required
                  placeholder="Describe the object, size, color, purpose, special features, and any deadline."
                />
                <small>
                  Use this for a completely custom idea or to explain changes
                  you want made to a linked model.
                </small>
              </div>
              <div className="field">
                <label htmlFor="model_url">
                  Share link to your 3D model (optional)
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
              <button className="btn btn-dark" type="submit" disabled={sending}>
                {sending ? "Saving order…" : "Send quote request"}{" "}
                <ArrowRight size={17} />
              </button>
            </form>
          </div>
        </section>
      </main>
      <footer className="shell footer">
        <div className="brand">
          <span className="mark">V</span>Vertex
        </div>
        <span>Custom 3D printing in Texas</span>
        <a className="staff-link" href="staff">
          Staff sign in
        </a>
      </footer>
    </>
  );
}
