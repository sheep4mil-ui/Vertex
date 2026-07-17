"use client";

import { useState } from "react";
import { ArrowRight, BriefcaseBusiness } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export default function Apply() {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const supabase = getSupabase();
    if (!supabase) {
      setMessage("The application system is not connected yet.");
      setSending(false);
      return;
    }
    const roles = values.getAll("roles").map(String);
    const { data, error } = await supabase.rpc("submit_vertex_application", {
      p_full_name: String(values.get("full_name") || ""),
      p_email: String(values.get("email") || ""),
      p_phone: String(values.get("phone") || ""),
      p_age_range: String(values.get("age_range") || ""),
      p_school_or_program: String(values.get("school_or_program") || ""),
      p_roles: roles,
      p_availability: String(values.get("availability") || ""),
      p_experience: String(values.get("experience") || ""),
      p_skills: String(values.get("skills") || ""),
      p_why_vertex: String(values.get("why_vertex") || ""),
      p_portfolio_url: String(values.get("portfolio_url") || ""),
      p_reference_info: String(values.get("reference_info") || ""),
      p_application_pin: String(values.get("application_pin") || ""),
      p_guardian_permission: values.get("guardian_permission") === "on",
      p_terms_accepted: values.get("terms_accepted") === "on",
    });
    if (error) setMessage(`Application could not be saved: ${error.message}`);
    else {
      setMessage(`Application received. Your reference number is ${data}.`);
      form.reset();
    }
    setSending(false);
  }

  return (
    <main className="application-page">
      <header className="shell nav">
        <a className="brand" href="../#order"><span className="mark">V</span>Vertex</a>
        <a className="btn btn-light" href="../">Back to website</a>
      </header>
      <section className="shell application-hero">
        <div>
          <p className="eyebrow">Join the Vertex team</p>
          <h1>Build useful things with us.</h1>
          <p className="lead">Tell us about your experience, skills, interests, and availability. This application works like a short résumé and is reviewed only by Vertex administrators.</p>
        </div>
        <div className="application-badge"><BriefcaseBusiness size={38} /><strong>Vertex hiring</strong><span>Applications are reviewed as openings become available.</span></div>
      </section>
      <section className="shell application-layout">
        <aside className="order-note">
          <h3>Before applying</h3>
          <p>Submitting an application does not guarantee a position or payment amount. Vertex will discuss responsibilities, scheduling, supervision, and payment before anyone begins work.</p>
          <p>Do not enter Social Security numbers, banking information, passwords, or other highly sensitive information.</p>
        </aside>
        <form className="form application-form" onSubmit={submitApplication}>
          <div><p className="eyebrow">Contact</p><h2>Your information</h2></div>
          {message && <div className={message.startsWith("Application received") ? "success" : "form-error"}>{message}</div>}
          <div className="grid2">
            <div className="field"><label htmlFor="full_name">Full name</label><input id="full_name" name="full_name" required maxLength={120} /></div>
            <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required maxLength={254} /></div>
            <div className="field"><label htmlFor="phone">Phone number (optional)</label><input id="phone" name="phone" type="tel" maxLength={40} /></div>
            <div className="field"><label htmlFor="age_range">Age range</label><select id="age_range" name="age_range" required><option value="">Choose one</option><option>Under 14</option><option>14–15</option><option>16–17</option><option>18 or older</option></select></div>
          </div>
          <div className="field"><label htmlFor="school_or_program">School, program, or current activity (optional)</label><input id="school_or_program" name="school_or_program" maxLength={160} placeholder="School, homeschool program, job, club, or other activity" /></div>
          <fieldset className="application-roles">
            <legend>Roles that interest you</legend>
            {["Handout / delivery helper", "Order taker", "Modeler", "Printer", "Social management"].map((role) => <label key={role}><input type="checkbox" name="roles" value={role} /><span>{role}</span></label>)}
          </fieldset>
          <div className="field"><label htmlFor="availability">Availability</label><textarea id="availability" name="availability" required maxLength={1500} placeholder="Days, times, school limitations, transportation limits, and when you could start" /></div>
          <div className="field"><label htmlFor="experience">Experience</label><textarea id="experience" name="experience" required maxLength={3000} placeholder="Projects, jobs, volunteering, clubs, printers or software you have used, and what you did" /></div>
          <div className="field"><label htmlFor="skills">Skills and strengths</label><textarea id="skills" name="skills" required maxLength={2000} placeholder="Design, communication, reliability, customer service, printing, electronics, photography, social media, or other skills" /></div>
          <div className="field"><label htmlFor="why_vertex">Why do you want to join Vertex?</label><textarea id="why_vertex" name="why_vertex" required maxLength={2000} /></div>
          <div className="grid2">
            <div className="field"><label htmlFor="portfolio_url">Portfolio or project link (optional)</label><input id="portfolio_url" name="portfolio_url" type="url" pattern="https://.*" placeholder="https://drive.google.com/…" /></div>
            <div className="field"><label htmlFor="reference_info">Reference (optional)</label><input id="reference_info" name="reference_info" maxLength={300} placeholder="Name and contact details, with their permission" /></div>
          </div>
          <div className="field application-pin">
            <label htmlFor="application_pin">Create a 4-digit applicant code</label>
            <input id="application_pin" name="application_pin" type="password" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} required autoComplete="new-password" placeholder="4 digits" />
            <small>Enter exactly four numbers. Keep this code so Vertex can confirm which application is yours.</small>
          </div>
          <label className="order-policy"><input type="checkbox" name="guardian_permission" /><span>If I am under 18, I have permission to apply and will involve a parent or guardian before accepting work.</span></label>
          <label className="order-policy"><input type="checkbox" name="terms_accepted" required /><span><strong>Required:</strong> I accept the application terms, confirm this information is accurate, and understand it may be reviewed by Vertex administrators for hiring purposes.</span></label>
          <button className="btn btn-dark" disabled={sending}>{sending ? "Submitting…" : "Submit application"} <ArrowRight size={17} /></button>
        </form>
      </section>
    </main>
  );
}
