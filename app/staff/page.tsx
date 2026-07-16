"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Mail,
  MessageSquare,
  Settings,
  Tags,
  Users,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";

type Tab =
  "Orders" | "Customers" | "Team" | "Discounts" | "Messages" | "Email Center" | "Settings";
const adminTabs: Tab[] = [
  "Orders",
  "Customers",
  "Team",
  "Discounts",
  "Messages",
  "Email Center",
  "Settings",
];
const employeeTabs: Tab[] = ["Orders", "Messages", "Email Center", "Settings"];
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
type Announcement = {
  id: string;
  subject: string;
  message: string;
  created_at: string;
};
type DirectoryMember = { id: string; email: string; level: string };
type StaffMessage = {
  message_id: string;
  direction: "inbox" | "sent";
  sender_email: string;
  recipient_emails: string[];
  subject: string;
  body: string;
  created_at: string;
  read_at: string | null;
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
  const [emailTemplate, setEmailTemplate] = useState("quote");
  const [recipient, setRecipient] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [emailDetails, setEmailDetails] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [announcementSubject, setAnnouncementSubject] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [directory, setDirectory] = useState<DirectoryMember[]>([]);
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [messageRecipients, setMessageRecipients] = useState<string[]>([]);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<StaffMessage | null>(null);

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
    const { data: announcementData } = await supabase
      .from("announcements")
      .select("id,subject,message,created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    setAnnouncements((announcementData || []) as Announcement[]);
    const [{ data: directoryData }, { data: messageData }] = await Promise.all([
      supabase.rpc("staff_directory"),
      supabase.rpc("get_staff_messages"),
    ]);
    setDirectory((directoryData || []) as DirectoryMember[]);
    setMessages((messageData || []) as StaffMessage[]);
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

  function buildEmail() {
    const name = customerName.trim() || "there";
    const order = orderNumber.trim() ? ` #${orderNumber.trim().replace(/^#/, "")}` : "";
    const templates: Record<string, { subject: string; message: string }> = {
      received: {
        subject: `Vertex order${order} received`,
        message: `We received your request and are reviewing the details. We will contact you when your quote is ready.`,
      },
      quote: {
        subject: `Your Vertex quote${order} is ready`,
        message: `Your custom 3D-printing quote is ready. Reply to this email to approve it or ask any questions.`,
      },
      printing: {
        subject: `Vertex order${order} is printing`,
        message: `Good news—your order is now being printed. We will send another update when it is ready.`,
      },
      ready: {
        subject: `Vertex order${order} is ready`,
        message: `Your order is finished and ready for pickup or shipping. Reply to confirm the next step.`,
      },
      completed: {
        subject: `Vertex order${order} completed`,
        message: `Your Vertex order is complete. Thank you for supporting our 3D-printing business.`,
      },
      refund: {
        subject: `Vertex refund update${order}`,
        message: `We have processed the refund for your order. Please allow your payment provider time to post it.`,
      },
      custom: {
        subject: `A message from Vertex${order}`,
        message: `We have an update about your Vertex order.`,
      },
    };
    const selected = templates[emailTemplate];
    const extra = emailDetails.trim() ? `\n\n${emailDetails.trim()}` : "";
    return {
      subject: selected.subject,
      body: `Hi ${name},\n\n${selected.message}${extra}\n\nThank you,\nVertex 3D Printing`,
    };
  }

  function openGmail(e: React.FormEvent) {
    e.preventDefault();
    const email = buildEmail();
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function publishAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    const { data, error } = await supabase
      .from("announcements")
      .insert({ subject: announcementSubject.trim(), message: announcementMessage.trim() })
      .select("id,subject,message,created_at")
      .single();
    if (error) setSaved(`Announcement error: ${error.message}`);
    else {
      setAnnouncements((current) => [data as Announcement, ...current]);
      setAnnouncementSubject("");
      setAnnouncementMessage("");
      setSaved("Company announcement");
    }
  }

  async function sendStaffMessage(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.rpc("send_staff_message", {
      p_recipient_ids: messageRecipients,
      p_subject: messageSubject,
      p_body: messageBody,
    });
    if (error) setSaved(`Message error: ${error.message}`);
    else {
      const { data } = await supabase.rpc("get_staff_messages");
      setMessages((data || []) as StaffMessage[]);
      setMessageRecipients([]);
      setMessageSubject("");
      setMessageBody("");
      setSaved("Private message");
    }
  }

  async function openStaffMessage(message: StaffMessage) {
    setSelectedMessage(message);
    if (message.direction === "inbox" && !message.read_at) {
      const supabase = getSupabase();
      await supabase?.rpc("mark_staff_message_read", { p_message_id: message.message_id });
      setMessages((current) => current.map((item) => item.message_id === message.message_id ? { ...item, read_at: new Date().toISOString() } : item));
    }
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
            <div className="top-actions">
              {messages.some((message) => message.direction === "inbox" && !message.read_at) && (
                <button className="announcement-alert" onClick={() => setActiveTab("Messages")}>
                  <MessageSquare size={16} /> {messages.filter((message) => message.direction === "inbox" && !message.read_at).length} private
                </button>
              )}
              {announcements.length > 0 && (
                <button className="announcement-alert" onClick={() => setSelectedAnnouncement(announcements[0])}>
                  <Mail size={16} /> {announcements.length} company message{announcements.length === 1 ? "" : "s"}
                </button>
              )}
              <button className="btn btn-dark" onClick={signOut}>Sign out</button>
            </div>
          </header>
          {selectedAnnouncement && (
            <div className="announcement-overlay" onClick={() => setSelectedAnnouncement(null)}>
              <article className="announcement-modal" onClick={(e) => e.stopPropagation()}>
                <p className="eyebrow">Vertex company announcement</p>
                <h2>{selectedAnnouncement.subject}</h2>
                <p>{selectedAnnouncement.message}</p>
                <small>{new Date(selectedAnnouncement.created_at).toLocaleString()}</small>
                <button className="btn btn-dark" onClick={() => setSelectedAnnouncement(null)}>Close</button>
              </article>
            </div>
          )}
          {selectedMessage && (
            <div className="announcement-overlay" onClick={() => setSelectedMessage(null)}>
              <article className="announcement-modal" onClick={(e) => e.stopPropagation()}>
                <p className="eyebrow">Private Vertex message</p>
                <h2>{selectedMessage.subject}</h2>
                <small>{selectedMessage.direction === "sent" ? `To: ${selectedMessage.recipient_emails.join(", ")}` : `From: ${selectedMessage.sender_email}`}</small>
                <p>{selectedMessage.body}</p>
                <small>{new Date(selectedMessage.created_at).toLocaleString()}</small>
                <button className="btn btn-dark" onClick={() => setSelectedMessage(null)}>Close</button>
              </article>
            </div>
          )}
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
          {activeTab === "Messages" && (
            <div className="message-center">
              <article className="panel">
                <span className="panel-icon"><MessageSquare size={22} /></span>
                <h2>New private message</h2>
                <p className="panel-copy">Messages stay inside Vertex and are addressed to approved staff Gmail accounts.</p>
                <form onSubmit={sendStaffMessage}>
                  <fieldset className="recipient-picker">
                    <legend>Send to one or more people</legend>
                    {directory.length === 0 ? <p>No other staff profiles are available.</p> : directory.map((member) => (
                      <label key={member.id}>
                        <input type="checkbox" checked={messageRecipients.includes(member.id)} onChange={(e) => setMessageRecipients((current) => e.target.checked ? [...current, member.id] : current.filter((id) => id !== member.id))} />
                        <span><strong>{member.email}</strong><small>{member.level.replaceAll("_", " ")}</small></span>
                      </label>
                    ))}
                  </fieldset>
                  <div className="field">
                    <label htmlFor="message-subject">Subject</label>
                    <input id="message-subject" required value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)} placeholder="Message subject" />
                  </div>
                  <div className="field">
                    <label htmlFor="message-body">Message</label>
                    <textarea id="message-body" required value={messageBody} onChange={(e) => setMessageBody(e.target.value)} placeholder="Write a private staff message." />
                  </div>
                  {saved.startsWith("Message error") && <div className="form-error">{saved}</div>}
                  {saved === "Private message" && notice}
                  <button className="btn btn-dark" disabled={messageRecipients.length === 0}>Send private message</button>
                </form>
              </article>
              <article className="panel">
                <h2>Inbox and sent messages</h2>
                <div className="message-list">
                  {messages.length === 0 ? <p className="panel-copy">No private messages yet.</p> : messages.map((message) => (
                    <button key={`${message.direction}-${message.message_id}`} className={!message.read_at && message.direction === "inbox" ? "unread" : ""} onClick={() => openStaffMessage(message)}>
                      <span>{message.direction === "sent" ? `To: ${message.recipient_emails.join(", ")}` : `From: ${message.sender_email}`}</span>
                      <strong>{message.subject}</strong>
                      <small>{new Date(message.created_at).toLocaleDateString()}</small>
                    </button>
                  ))}
                </div>
              </article>
            </div>
          )}
          {activeTab === "Email Center" && (
            <div className="email-center">
              {role === "admin" && (
                <article className="panel announcement-publisher">
                  <span className="panel-icon"><Mail size={22} /></span>
                  <h2>Company announcement</h2>
                  <p className="panel-copy">Publish an internal message that appears on every employee and administrator dashboard.</p>
                  <form onSubmit={publishAnnouncement}>
                    <div className="field">
                      <label htmlFor="announcement-subject">Subject</label>
                      <input id="announcement-subject" required value={announcementSubject} onChange={(e) => setAnnouncementSubject(e.target.value)} placeholder="Vertex team update" />
                    </div>
                    <div className="field">
                      <label htmlFor="announcement-message">Message</label>
                      <textarea id="announcement-message" required value={announcementMessage} onChange={(e) => setAnnouncementMessage(e.target.value)} placeholder="Write the company announcement." />
                    </div>
                    {saved.startsWith("Announcement error") && <div className="form-error">{saved}</div>}
                    {saved === "Company announcement" && notice}
                    <button className="btn btn-dark">Publish announcement</button>
                  </form>
                </article>
              )}
              <article className="panel">
                <span className="panel-icon"><Mail size={22} /></span>
                <h2>Vertex Email Center</h2>
                <p className="panel-copy">
                  Build a professional customer update, then review and send it from the Vertex Gmail account.
                </p>
                <form onSubmit={openGmail}>
                  <div className="grid2">
                    <div className="field">
                      <label htmlFor="email-recipient">Customer email</label>
                      <input id="email-recipient" type="email" required value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="customer@example.com" />
                    </div>
                    <div className="field">
                      <label htmlFor="email-name">Customer name</label>
                      <input id="email-name" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />
                    </div>
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <label htmlFor="email-template">Message type</label>
                      <select id="email-template" value={emailTemplate} onChange={(e) => setEmailTemplate(e.target.value)}>
                        <option value="received">Order received</option>
                        <option value="quote">Quote ready</option>
                        <option value="printing">Printing started</option>
                        <option value="ready">Ready for pickup or shipping</option>
                        <option value="completed">Order completed</option>
                        <option value="refund">Refund processed</option>
                        <option value="custom">Custom update</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="email-order">Order number</label>
                      <input id="email-order" required value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="VTX-1042" />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="email-details">Additional details (optional)</label>
                    <textarea id="email-details" value={emailDetails} onChange={(e) => setEmailDetails(e.target.value)} placeholder="Add pickup instructions, pricing, timing, or another personal note." />
                  </div>
                  <button className="btn btn-dark"><Mail size={16} /> Open draft in Gmail</button>
                </form>
              </article>
              <article className="panel email-preview">
                <p className="eyebrow">Live preview</p>
                <h2>{buildEmail().subject}</h2>
                <pre>{buildEmail().body}</pre>
                <p className="demo-note">Nothing is sent automatically. Gmail opens a draft so you can check it before sending.</p>
              </article>
            </div>
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
        </section>
      </div>
    </main>
  );
}
