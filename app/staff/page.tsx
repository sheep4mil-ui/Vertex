"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Megaphone,
  Settings,
  Tags,
  Users,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";

type Tab =
  "Orders" | "Customers" | "Team" | "Discounts" | "Announcements" | "Settings";
const adminTabs: Tab[] = [
  "Orders",
  "Customers",
  "Team",
  "Discounts",
  "Announcements",
  "Settings",
];
const employeeTabs: Tab[] = ["Orders", "Announcements", "Settings"];
type Order = {
  id: string;
  tracking_code: string;
  customer_name: string;
  customer_email: string;
  details: string;
  status: string;
  update_preference: string;
  created_at: string;
};

export default function Staff() {
  const [logged, setLogged] = useState(false);
  const [role, setRole] = useState<"employee" | "admin">("employee");
  const [activeTab, setActiveTab] = useState<Tab>("Orders");
  const [saved, setSaved] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  async function finishLogin(userId: string) {
    const supabase = getSupabase();
    if (!supabase) return false;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("level,active")
      .eq("id", userId)
      .single();
    if (error || !profile?.active || !profile.level) {
      setAuthError(
        "This Gmail account is not approved for Vertex staff access.",
      );
      await supabase.auth.signOut();
      return false;
    }
    setRole(profile.level === "admin" ? "admin" : "employee");
    const query = supabase
      .from("orders")
      .select(
        "id,tracking_code,customer_name,customer_email,details,status,update_preference,created_at",
      )
      .order("created_at", { ascending: false });
    const { data } = await query;
    setOrders((data || []) as Order[]);
    setLogged(true);
    return true;
  }
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    const supabase = getSupabase();
    if (!supabase) {
      setAuthError("Supabase is not configured.");
      setAuthBusy(false);
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user)
      setAuthError(error?.message || "The email or password was not accepted.");
    else await finishLogin(data.user.id);
    setAuthBusy(false);
  }
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) finishLogin(data.user.id);
    });
  }, []);

  async function signOut() {
    const supabase = getSupabase();
    await supabase?.auth.signOut();
    setLogged(false);
    setOrders([]);
    setPassword("");
    setActiveTab("Orders");
  }

  if (!logged)
    return (
      <main className="login">
        <div className="login-card">
          <a className="brand" href="../">
            <span className="mark">V</span>Vertex
          </a>
          <h1>Team sign in</h1>
          <p>Sign in with an approved Vertex Gmail address and password.</p>
          <form onSubmit={signIn}>
              <div className="field">
                <label htmlFor="staff-email">Approved Gmail address</label>
                <input
                  id="staff-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                />
              </div>
              <div className="field">
                <label htmlFor="staff-password">Password</label>
                <input
                  id="staff-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>
              {authError && <div className="form-error">{authError}</div>}
              <button className="btn btn-dark" disabled={authBusy}>
                {authBusy ? "Signing in…" : "Sign in"}
                <ArrowRight size={16} />
              </button>
          </form>
        </div>
      </main>
    );

  const notice = saved && <div className="success">{saved} saved.</div>;
  const visibleTabs = role === "admin" ? adminTabs : employeeTabs;
  const requestedCount = orders.filter((order) => order.status === "requested").length;
  const printingCount = orders.filter((order) => order.status === "printing").length;
  const readyCount = orders.filter((order) => order.status === "ready").length;
  return (
    <main className="portal">
      <div className="portal-grid">
        <aside className="side">
          <a className="brand" href="../">
            <span className="mark">V</span>Vertex
          </a>
          <nav>
            {visibleTabs.map((tab) => (
              <button
                key={tab}
                className={activeTab === tab ? "active" : ""}
                onClick={() => {
                  setActiveTab(tab);
                  setSaved("");
                }}
              >
                {role === "employee" && tab === "Orders"
                  ? "My orders"
                  : role === "employee" && tab === "Settings"
                    ? "My account"
                    : tab}
              </button>
            ))}
          </nav>
        </aside>
        <section className="main">
          <header className="top">
            <div>
              <p className="eyebrow">
                {role === "admin" ? "Admin workspace" : "Employee workspace"}
              </p>
              <h1>{activeTab}</h1>
            </div>
            <button className="btn btn-dark" onClick={signOut}>Sign out</button>
          </header>
          {activeTab === "Orders" && (
            <>
              <div className="stats">
                <article className="stat">
                  <span>
                    {role === "admin" ? "New requests" : "Assigned to me"}
                  </span>
                  <strong>{requestedCount}</strong>
                </article>
                <article className="stat">
                  <span>Currently printing</span>
                  <strong>{printingCount}</strong>
                </article>
                <article className="stat">
                  <span>Ready to ship</span>
                  <strong>{readyCount}</strong>
                </article>
              </div>
              <article className="panel">
                <h2>
                  {role === "admin"
                    ? "All recent orders"
                    : "My assigned orders"}
                </h2>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      {role === "admin" && <th>Customer</th>}
                      <th>Item</th>
                      <th>Status</th>
                      <th>Updates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={role === "admin" ? 5 : 4}>No orders found.</td>
                      </tr>
                    ) : orders.map((order) => (
                      <tr key={order.id}>
                        <td>#{order.tracking_code}</td>
                        {role === "admin" && <td>{order.customer_name}</td>}
                        <td>{order.details}</td>
                        <td><span className={`pill ${order.status}`}>{order.status.replaceAll("_", " ")}</span></td>
                        <td>{order.update_preference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            </>
          )}
          {activeTab === "Customers" && (
            <article className="panel">
              <span className="panel-icon">
                <Users size={22} />
              </span>
              <h2>Customers</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Orders</th>
                    <th>Last order</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Jordan M.</td>
                    <td>Email + text</td>
                    <td>2</td>
                    <td>#VTX-1042</td>
                  </tr>
                  <tr>
                    <td>Alex R.</td>
                    <td>Email</td>
                    <td>1</td>
                    <td>#VTX-1041</td>
                  </tr>
                </tbody>
              </table>
            </article>
          )}
          {activeTab === "Team" && (
            <article className="panel">
              <span className="panel-icon">
                <Users size={22} />
              </span>
              <h2>Employee promotions</h2>
              <p className="panel-copy">
                Promote employees through Vertex roles. Administrator membership
                remains separate.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSaved("Employee promotion");
                }}
              >
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Gmail</th>
                      <th>Current role</th>
                      <th>Promote to</th>
                      <th>Discount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Demo Employee</td>
                      <td>employee@gmail.com</td>
                      <td>
                        <span className="role-badge">Handout</span>
                      </td>
                      <td>
                        <select defaultValue="handout">
                          <option value="handout">Handout</option>
                          <option value="order_taker">Order Taker</option>
                          <option value="printer">Printer</option>
                          <option value="social_management">
                            Social Management
                          </option>
                        </select>
                      </td>
                      <td>15%</td>
                    </tr>
                  </tbody>
                </table>
                {saved === "Employee promotion" && notice}
                <button className="btn btn-dark team-save">
                  Save employee role
                </button>
              </form>
              <div className="promotion-path">
                <span>Handout</span>
                <b>→</b>
                <span>Order Taker</span>
                <b>→</b>
                <span>Printer</span>
                <b>→</b>
                <span>Social Management</span>
              </div>
            </article>
          )}
          {activeTab === "Discounts" && role === "admin" && (
            <div className="panel-stack">
              <article className="panel discount-panel">
                <div>
                  <span className="panel-icon">
                    <CalendarDays size={22} />
                  </span>
                  <h2>Seasonal discount</h2>
                  <p>
                    Create a temporary automatic discount for every customer.
                  </p>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSaved("Seasonal discount");
                  }}
                >
                  <div className="grid2">
                    <div className="field">
                      <label>Promotion name</label>
                      <input required placeholder="Summer sale" />
                    </div>
                    <div className="field">
                      <label>Percent off</label>
                      <input
                        required
                        type="number"
                        min="1"
                        max="100"
                        placeholder="15"
                      />
                    </div>
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <label>Start date</label>
                      <input required type="date" />
                    </div>
                    <div className="field">
                      <label>End date</label>
                      <input required type="date" />
                    </div>
                  </div>
                  {saved === "Seasonal discount" && notice}
                  <button className="btn btn-dark">
                    Save seasonal discount
                  </button>
                </form>
              </article>
              <article className="panel discount-panel">
                <div>
                  <span className="panel-icon">
                    <Tags size={22} />
                  </span>
                  <h2>Promo code</h2>
                  <p>
                    Create a customer code with an expiration and optional use
                    limit.
                  </p>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSaved("Promo code");
                  }}
                >
                  <div className="grid2">
                    <div className="field">
                      <label>Promo code</label>
                      <input
                        required
                        minLength={3}
                        maxLength={20}
                        placeholder="VERTEX15"
                        onInput={(e) =>
                          (e.currentTarget.value =
                            e.currentTarget.value.toUpperCase())
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Percent off</label>
                      <input
                        required
                        type="number"
                        min="1"
                        max="100"
                        placeholder="15"
                      />
                    </div>
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <label>Expiration date</label>
                      <input required type="date" />
                    </div>
                    <div className="field">
                      <label>Maximum uses</label>
                      <input type="number" min="1" placeholder="Unlimited" />
                    </div>
                  </div>
                  {saved === "Promo code" && notice}
                  <button className="btn btn-dark">Create promo code</button>
                </form>
              </article>
            </div>
          )}
          {activeTab === "Announcements" && (
            <article className="panel">
              <span className="panel-icon">
                <Megaphone size={22} />
              </span>
              <h2>Company announcements</h2>
              {role === "admin" ? (
                <>
                  <p className="panel-copy">
                    Create an update for every approved employee.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSaved("Announcement");
                    }}
                  >
                    <div className="field">
                      <label>Subject</label>
                      <input required placeholder="Vertex team update" />
                    </div>
                    <div className="field">
                      <label>Message</label>
                      <textarea
                        required
                        placeholder="Write the announcement…"
                      />
                    </div>
                    {notice}
                    <button className="btn btn-dark">
                      Save announcement draft
                    </button>
                  </form>
                </>
              ) : (
                <div className="announcement-card">
                  <strong>Welcome to Vertex</strong>
                  <p>Company announcements will appear here.</p>
                </div>
              )}
            </article>
          )}
          {activeTab === "Settings" && (
            <article className="panel">
              <span className="panel-icon">
                <Settings size={22} />
              </span>
              <h2>{role === "admin" ? "Business settings" : "My account"}</h2>
              {role === "admin" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSaved("Settings");
                  }}
                >
                  <div className="grid2">
                    <div className="field">
                      <label>Employee discount</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        defaultValue="15"
                      />
                    </div>
                    <div className="field">
                      <label>Order prefix</label>
                      <input defaultValue="VTX" />
                    </div>
                  </div>
                  {notice}
                  <button className="btn btn-dark">Save settings</button>
                </form>
              ) : (
                <div className="account-grid">
                  <p>
                    <strong>Role</strong>
                    <br />
                    Handout
                  </p>
                  <p>
                    <strong>Personal discount</strong>
                    <br />
                    15%
                  </p>
                  <p>
                    <strong>Approved Gmail</strong>
                    <br />
                    employee@gmail.com
                  </p>
                </div>
              )}
            </article>
          )}
          <p className="demo-note">
            Demo data only. Secure cloud data activates after Supabase is
            connected.
          </p>
        </section>
      </div>
    </main>
  );
}
