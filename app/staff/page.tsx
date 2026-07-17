"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  DollarSign,
  Mail,
  MessageSquare,
  Settings,
  Tags,
  Users,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";

type Tab =
  "Orders" | "Customers" | "Team" | "Pricing" | "Inventory" | "Payments" | "Discounts" | "Messages" | "Email Center" | "Settings";
const adminTabs: Tab[] = [
  "Orders",
  "Customers",
  "Team",
  "Pricing",
  "Inventory",
  "Payments",
  "Discounts",
  "Messages",
  "Email Center",
  "Settings",
];
const employeeTabs: Tab[] = ["Orders", "Pricing", "Inventory", "Messages", "Email Center", "Settings"];
type Order = {
  id: string;
  tracking_code: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string | null;
  material: string | null;
  quantity: number;
  details: string;
  model_url: string | null;
  status: string;
  assigned_to: string | null;
  quoted_cents: number | null;
  promo_code: string | null;
  promo_percent_off: number | null;
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
type TeamMember = {
  id: string;
  email: string;
  level: string;
  employee_roles: string[];
  employee_discount_percent: number;
  active: boolean;
};
type PaymentRow = { role: string; count: number; baseAmount: number };
type Filament = { id: string; material: string; color: string; spool_count: number; grams_available: number; in_stock: boolean; notes: string };

export default function Staff() {
  const [logged, setLogged] = useState(false);
  const [staffUserId, setStaffUserId] = useState("");
  const [role, setRole] = useState<"employee" | "admin">("employee");
  const [staffLevel, setStaffLevel] = useState("handout");
  const [staffRoles, setStaffRoles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("Orders");
  const [saved, setSaved] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCustomerEmail, setSelectedCustomerEmail] = useState("");
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
  const [messageSystemError, setMessageSystemError] = useState("");
  const [messageRecipients, setMessageRecipients] = useState<string[]>([]);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<StaffMessage | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoPercent, setPromoPercent] = useState(15);
  const [promoExpires, setPromoExpires] = useState("");
  const [promoMaxUses, setPromoMaxUses] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [newFilament, setNewFilament] = useState({ material: "PLA", color: "", spool_count: 1, grams_available: 1000, notes: "" });
  const [priceMaterial, setPriceMaterial] = useState<"PLA" | "PETG">("PLA");
  const [estimatedGrams, setEstimatedGrams] = useState(100);
  const [estimatedHours, setEstimatedHours] = useState(5);
  const [modelingHours, setModelingHours] = useState(0);
  const [pricingOrderId, setPricingOrderId] = useState("");
  const [quoteRecipient, setQuoteRecipient] = useState("");
  const gramRate = priceMaterial === "PLA" ? 0.15 : 0.25;
  const estimatedPrice = 5 + estimatedGrams * gramRate + estimatedHours * 2 + modelingHours;
  const pricingOrder = orders.find((order) => order.id === pricingOrderId);
  const pricingDiscountPercent = pricingOrder?.promo_percent_off || 0;
  const discountedEstimatedPrice = estimatedPrice * (1 - pricingDiscountPercent / 100);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [previousMonthRevenue, setPreviousMonthRevenue] = useState(0);
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([
    { role: "Printer", count: 2, baseAmount: 30 },
    { role: "Handout", count: 0, baseAmount: 10 },
    { role: "Order Taker", count: 0, baseAmount: 15 },
    { role: "Modeler", count: 0, baseAmount: 25 },
    { role: "Social Management", count: 0, baseAmount: 15 },
  ]);
  const lowRevenueMonth = monthlyRevenue < 200;
  const revenueMultiplier = monthlyRevenue / (lowRevenueMonth ? 175 : 205);
  const expenseReserve = lowRevenueMonth ? 0 : 30 * revenueMultiplier;
  const totalTeamPayments = paymentRows.reduce((sum, row) => sum + row.count * row.baseAmount * revenueMultiplier, 0);
  const moneyRemaining = monthlyRevenue - expenseReserve - totalTeamPayments;

  async function refreshOrders(assignedUserId: string | null = role === "employee" ? staffUserId : null) {
    const supabase = getSupabase();
    if (!supabase) return;
    const baseColumns = "id,tracking_code,customer_name,customer_email,customer_phone,shipping_address,material,quantity,details,model_url,status,assigned_to,quoted_cents,update_preference,created_at";
    let query = supabase.from("orders").select(`${baseColumns},promo_code,promo_percent_off`).not("status", "in", "(completed,cancelled)").order("created_at", { ascending: false });
    if (assignedUserId) query = query.eq("assigned_to", assignedUserId);
    const { data, error } = await query;
    let latestOrders = (data || []) as Order[];
    if (error?.message.includes("promo_")) {
      let legacyQuery = supabase.from("orders").select(baseColumns).not("status", "in", "(completed,cancelled)").order("created_at", { ascending: false });
      if (assignedUserId) legacyQuery = legacyQuery.eq("assigned_to", assignedUserId);
      const legacy = await legacyQuery;
      latestOrders = ((legacy.data || []) as Omit<Order, "promo_code" | "promo_percent_off">[]).map((order) => ({ ...order, promo_code: null, promo_percent_off: null }));
    }
    setOrders(latestOrders);
    setSelectedOrder((current) => current ? latestOrders.find((order) => order.id === current.id) || null : null);
  }

  async function refreshSharedData() {
    const supabase = getSupabase();
    if (!supabase) return;
    await refreshOrders();
    const [{ data: announcementData }, { data: directoryData, error: directoryError }, { data: messageData, error: messagesError }, { data: filamentData }] = await Promise.all([
      supabase.from("announcements").select("id,subject,message,created_at").order("created_at", { ascending: false }).limit(10),
      supabase.rpc("staff_directory"),
      supabase.rpc("get_staff_messages"),
      supabase.from("filament_inventory").select("id,material,color,spool_count,grams_available,in_stock,notes").order("material").order("color"),
    ]);
    setAnnouncements((announcementData || []) as Announcement[]);
    setDirectory((directoryData || []) as DirectoryMember[]);
    setMessages((messageData || []) as StaffMessage[]);
    setMessageSystemError(directoryError?.message || messagesError?.message || "");
    setFilaments((filamentData || []) as Filament[]);
    if (role === "admin") {
      const [{ data: teamData }, { data: payrollData }] = await Promise.all([supabase.rpc("get_vertex_team"), supabase.rpc("get_vertex_payroll_plan")]);
      setTeamMembers((teamData || []) as TeamMember[]);
      const payroll = Array.isArray(payrollData) ? payrollData[0] : payrollData;
      if (payroll) {
        setMonthlyRevenue(Number(payroll.monthly_revenue));
        setPreviousMonthRevenue(Number(payroll.previous_month_revenue || 0));
        setPaymentRows((rows) => rows.map((row) => ({ ...row, count: Number(payroll[`${row.role.toLowerCase().replaceAll(" ", "_")}_count`] ?? row.count) })));
      }
    }
  }

  async function finishLogin(userId: string) {
    const supabase = getSupabase();
    if (!supabase) return false;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("level,active,employee_roles")
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
    setStaffUserId(userId);
    setStaffLevel(profile.level);
    setStaffRoles(profile.employee_roles || []);
    await refreshOrders(profile.level === "admin" ? null : userId);
    const { data: announcementData } = await supabase
      .from("announcements")
      .select("id,subject,message,created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    setAnnouncements((announcementData || []) as Announcement[]);
    const [{ data: directoryData, error: directoryError }, { data: messageData, error: messagesError }] = await Promise.all([
      supabase.rpc("staff_directory"),
      supabase.rpc("get_staff_messages"),
    ]);
    setDirectory((directoryData || []) as DirectoryMember[]);
    setMessages((messageData || []) as StaffMessage[]);
    setMessageSystemError(directoryError?.message || messagesError?.message || "");
    const { data: filamentData } = await supabase.from("filament_inventory").select("id,material,color,spool_count,grams_available,in_stock,notes").order("material").order("color");
    setFilaments((filamentData || []) as Filament[]);
    if (profile.level === "admin") {
      const [{ data: teamData }, { data: payrollData }] = await Promise.all([
        supabase.rpc("get_vertex_team"),
        supabase.rpc("get_vertex_payroll_plan"),
      ]);
      setTeamMembers((teamData || []) as TeamMember[]);
      const payroll = Array.isArray(payrollData) ? payrollData[0] : payrollData;
      if (payroll) {
        setMonthlyRevenue(Number(payroll.monthly_revenue));
        setPreviousMonthRevenue(Number(payroll.previous_month_revenue || 0));
        setPaymentRows((rows) => rows.map((row) => ({
          ...row,
          count: Number(payroll[`${row.role.toLowerCase().replaceAll(" ", "_")}_count`] ?? row.count),
        })));
      }
    }
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
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !logged) return;
    let channel = supabase.channel("vertex-live-dashboard");
    ["orders", "filament_inventory", "profiles", "vertex_payroll_plan", "announcements", "staff_messages", "staff_message_recipients", "seasonal_discounts", "promo_codes"].forEach((table) => {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, refreshSharedData);
    });
    channel.subscribe();
    const fallbackSync = window.setInterval(refreshSharedData, 5000);
    return () => { window.clearInterval(fallbackSync); supabase.removeChannel(channel); };
  }, [logged, role]);

  async function signOut() {
    const supabase = getSupabase();
    await supabase?.auth.signOut();
    setLogged(false);
    setStaffUserId("");
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

  async function saveSeasonalDiscount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    const form = e.currentTarget;
    const values = new FormData(form);
    const { error } = await supabase.from("seasonal_discounts").insert({
      name: String(values.get("seasonal_name") || "").trim(),
      percent_off: Number(values.get("seasonal_percent")),
      starts_at: new Date(`${values.get("seasonal_start")}T00:00:00`).toISOString(),
      ends_at: new Date(`${values.get("seasonal_end")}T23:59:59`).toISOString(),
      created_by: staffUserId,
    });
    if (error) setSaved(`Seasonal discount error: ${error.message}`);
    else {
      setSaved("Seasonal discount");
      form.reset();
    }
  }

  async function savePromoCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.from("promo_codes").insert({
      code: promoCode.trim().toUpperCase(),
      percent_off: promoPercent,
      expires_at: new Date(`${promoExpires}T23:59:59`).toISOString(),
      max_uses: promoMaxUses ? Number(promoMaxUses) : null,
      created_by: staffUserId,
    });
    if (error) setSaved(`Promo code error: ${error.message}`);
    else {
      setSaved("Promo code");
      setPromoCode("");
      setPromoPercent(15);
      setPromoExpires("");
      setPromoMaxUses("");
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
    if (error) {
      setMessageSystemError(error.message);
      setSaved(`Message error: ${error.message}`);
    }
    else {
      const { data, error: refreshError } = await supabase.rpc("get_staff_messages");
      if (refreshError) {
        setMessageSystemError(refreshError.message);
        setSaved(`Message error: ${refreshError.message}`);
        return;
      }
      setMessages((data || []) as StaffMessage[]);
      setMessageSystemError("");
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

  function changeTeamMember(id: string, changes: Partial<TeamMember>) {
    setTeamMembers((current) =>
      current.map((member) => member.id === id ? { ...member, ...changes } : member),
    );
  }

  async function saveTeamMember(member: TeamMember) {
    const supabase = getSupabase();
    if (!supabase) return;
    setSaved("");
    const { error } = await supabase.rpc("update_vertex_employee", {
      p_employee_id: member.id,
      p_roles: member.employee_roles,
      p_discount: member.employee_discount_percent,
      p_active: member.active,
    });
    setSaved(error ? `Team error: ${error.message}` : `Employee ${member.email}`);
  }

  async function savePayrollPlan() {
    const supabase = getSupabase();
    if (!supabase) return;
    setSaved("");
    const counts = Object.fromEntries(paymentRows.map((row) => [row.role, row.count]));
    const { error } = await supabase.rpc("save_vertex_payroll_plan", {
      p_monthly_revenue: monthlyRevenue,
      p_printer_count: counts.Printer || 0,
      p_handout_count: counts.Handout || 0,
      p_order_taker_count: counts["Order Taker"] || 0,
      p_modeler_count: counts.Modeler || 0,
      p_social_management_count: counts["Social Management"] || 0,
    });
    setSaved(error ? `Payroll error: ${error.message}` : "Monthly payroll plan");
  }

  async function addFilament(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    const normalizedColor = newFilament.color.trim().toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
    const existing = filaments.find((filament) => filament.material.trim().toLowerCase() === newFilament.material.trim().toLowerCase() && filament.color.trim().toLowerCase() === normalizedColor.toLowerCase());
    if (existing) {
      const merged = { ...existing, color: normalizedColor, spool_count: existing.spool_count + newFilament.spool_count, grams_available: existing.grams_available + newFilament.grams_available, in_stock: true, notes: newFilament.notes.trim() || existing.notes };
      const { error } = await supabase.from("filament_inventory").update(merged).eq("id", existing.id);
      if (error) setSaved(`Inventory error: ${error.message}`);
      else { setFilaments((current) => current.map((item) => item.id === existing.id ? merged : item)); setNewFilament({ material: "PLA", color: "", spool_count: 1, grams_available: 1000, notes: "" }); setSaved(`${merged.material} ${merged.color}`); }
      return;
    }
    const { data, error } = await supabase.from("filament_inventory").insert({ ...newFilament, color: normalizedColor, notes: newFilament.notes.trim(), in_stock: newFilament.grams_available > 0 }).select().single();
    if (error) setSaved(`Inventory error: ${error.message}`);
    else {
      setFilaments((current) => [...current, data as Filament]);
      setNewFilament({ material: "PLA", color: "", spool_count: 1, grams_available: 1000, notes: "" });
      setSaved("Filament inventory");
    }
  }

  async function saveFilament(filament: Filament) {
    const supabase = getSupabase();
    if (!supabase) return;
    const normalizedColor = filament.color.trim().toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
    const { error } = await supabase.from("filament_inventory").update({ material: filament.material.trim().toUpperCase(), color: normalizedColor, spool_count: filament.spool_count, grams_available: filament.grams_available, in_stock: filament.in_stock, notes: filament.notes.trim() }).eq("id", filament.id);
    if (!error) setFilaments((current) => current.map((item) => item.id === filament.id ? { ...item, material: filament.material.trim().toUpperCase(), color: normalizedColor, notes: filament.notes.trim() } : item));
    setSaved(error ? `Inventory error: ${error.message}` : `${filament.material} ${filament.color}`);
  }

  async function deleteFilament(id: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    const filament = filaments.find((item) => item.id === id);
    if (!filament) return;
    if (filament.spool_count > 1) {
      const gramsPerSpool = filament.grams_available / filament.spool_count;
      const updated = { ...filament, spool_count: filament.spool_count - 1, grams_available: Math.max(0, Math.round(filament.grams_available - gramsPerSpool)) };
      const { error } = await supabase.from("filament_inventory").update({ spool_count: updated.spool_count, grams_available: updated.grams_available }).eq("id", id);
      if (error) setSaved(`Inventory error: ${error.message}`);
      else { setFilaments((current) => current.map((item) => item.id === id ? updated : item)); setSaved(`Removed one ${filament.material} ${filament.color} spool`); }
      return;
    }
    const { error } = await supabase.from("filament_inventory").delete().eq("id", id);
    if (error) setSaved(`Inventory error: ${error.message}`);
    else { setFilaments((current) => current.filter((item) => item.id !== id)); setSaved("Filament removed"); }
  }

  async function updateOrder(orderId: string, changes: Partial<Pick<Order, "status" | "assigned_to" | "quoted_cents">>, successMessage: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    setSaved("");
    const { data, error } = await supabase.from("orders").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", orderId).select("id,status,assigned_to,quoted_cents").single();
    if (error) {
      setSaved(`Order error: ${error.message}`);
      return false;
    }
    if (["completed", "cancelled"].includes(data.status)) {
      setOrders((current) => current.filter((order) => order.id !== orderId));
      setSelectedOrder(null);
    } else {
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, ...data } : order));
      setSelectedOrder((current) => current?.id === orderId ? { ...current, ...data } : current);
    }
    setSaved(successMessage);
    return true;
  }

  async function saveQuoteAndOpenGmail(order: Order, quotedCents: number, receivingEmail: string = order.customer_email) {
    const composeWindow = window.open("about:blank", "_blank");
    const savedQuote = await updateOrder(order.id, { quoted_cents: quotedCents }, "Order quote");
    if (!savedQuote) {
      composeWindow?.close();
      return;
    }
    const quote = (quotedCents / 100).toFixed(2);
    const subject = `Your Vertex quote #${order.tracking_code}`;
    const discountLine = order.promo_code && order.promo_percent_off ? `\nYour ${order.promo_code} code applied ${order.promo_percent_off}% off.` : "";
    const body = `Hi ${order.customer_name},\n\nYour Vertex 3D-printing quote for order #${order.tracking_code} is $${quote}.${discountLine}\n\nReply to this email to approve the quote or ask questions. Shipping will be confirmed separately if needed.\n\nThank you,\nVertex 3D Printing`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(receivingEmail.trim() || order.customer_email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (composeWindow) composeWindow.location.href = gmailUrl;
    else window.open(gmailUrl, "_blank", "noopener,noreferrer");
  }

  if (!logged)
    return (
      <main className="login">
        <div className="login-card">
          <a className="brand" href="https://sheep4mil-ui.github.io/Vertex/#order">
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
  const canManageInventory = role === "admin" || staffLevel === "printer" || staffRoles.includes("printer");
  const requestedCount = orders.filter((order) => order.status === "requested").length;
  const printingCount = orders.filter((order) => order.status === "printing").length;
  const readyCount = orders.filter((order) => order.status === "ready").length;
  const customers = Array.from(orders.reduce((customerMap, order) => {
    const key = order.customer_email.trim().toLowerCase();
    const existing = customerMap.get(key);
    if (existing) existing.orderCount += 1;
    else customerMap.set(key, {
      name: order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone,
      orderCount: 1,
      lastTrackingCode: order.tracking_code,
      lastOrderDate: order.created_at,
    });
    return customerMap;
  }, new Map<string, { name: string; email: string; phone: string | null; orderCount: number; lastTrackingCode: string; lastOrderDate: string }>()).values());
  return (
    <main className="portal">
      <div className="portal-grid">
        <aside className="side">
          <a className="brand" href="https://sheep4mil-ui.github.io/Vertex/#order">
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
                      {role === "admin" && <th>Shipping</th>}
                      <th>Updates</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={role === "admin" ? 7 : 5}>No orders found.</td>
                      </tr>
                    ) : orders.map((order) => (
                      <tr key={order.id}>
                        <td>#{order.tracking_code}</td>
                        {role === "admin" && <td>{order.customer_name}</td>}
                        <td>{order.details}</td>
                        <td><span className={`pill ${order.status}`}>{order.status.replaceAll("_", " ")}</span></td>
                        {role === "admin" && <td className="shipping-address">{order.shipping_address || "Local pickup"}</td>}
                        <td>{order.update_preference}</td>
                        <td><button className="btn btn-light table-save" type="button" onClick={() => setSelectedOrder(order)}>View details</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
              {selectedOrder && (
                <article className="panel order-details">
                  <div className="order-details-head">
                    <div><p className="eyebrow">Order #{selectedOrder.tracking_code}</p><h2>Custom print details</h2></div>
                    <button className="btn btn-light" type="button" onClick={() => setSelectedOrder(null)}>Close</button>
                  </div>
                  <div className="order-detail-grid">
                    <div><span>Customer</span><strong>{selectedOrder.customer_name}</strong><a href={`mailto:${selectedOrder.customer_email}`}>{selectedOrder.customer_email}</a>{selectedOrder.customer_phone && <a href={`tel:${selectedOrder.customer_phone}`}>{selectedOrder.customer_phone}</a>}</div>
                    <div><span>Print setup</span><strong>{selectedOrder.quantity} × {selectedOrder.material || "Material not selected"}</strong></div>
                    <div><span>Saved customer quote</span><strong>{selectedOrder.quoted_cents == null ? "Not quoted yet" : `$${(selectedOrder.quoted_cents / 100).toFixed(2)}`}</strong></div>
                    <div><span>Discount code</span><strong>{selectedOrder.promo_code ? `${selectedOrder.promo_code} — ${selectedOrder.promo_percent_off}% off` : "No promo code"}</strong></div>
                    <div className="custom-print-box"><span>Custom print description</span><p>{selectedOrder.details}</p></div>
                    <div><span>Delivery</span><strong>{selectedOrder.shipping_address ? "Ship order" : "Local pickup"}</strong><p className="shipping-address">{selectedOrder.shipping_address || "No shipping address provided."}</p></div>
                    <div><span>Model file</span>{selectedOrder.model_url ? <a className="btn btn-dark" href={selectedOrder.model_url} target="_blank" rel="noreferrer">Open model link <ArrowRight size={16} /></a> : <p>No model link was provided.</p>}</div>
                  </div>
                  {role === "admin" && (
                    <div className="order-actions">
                      <div className="field">
                        <label htmlFor="order-assignee">Send order to employee</label>
                        <select id="order-assignee" disabled={['requested', 'quoted'].includes(selectedOrder.status)} value={selectedOrder.assigned_to || ""} onChange={(e) => setSelectedOrder({ ...selectedOrder, assigned_to: e.target.value || null })}>
                          <option value="">Unassigned</option>
                          {teamMembers.filter((member) => member.active).map((member) => (
                            <option key={member.id} value={member.id}>{member.email} — {member.employee_roles?.length ? member.employee_roles.join(", ").replaceAll("_", " ") : "employee"}</option>
                          ))}
                        </select>
                        <small>{['requested', 'quoted'].includes(selectedOrder.status) ? "Accept the order before assigning it to an employee." : "Assignments save online immediately. Staff receive the order when they next sign in, even if they are offline now."}</small>
                      </div>
                      <button className="btn btn-light" disabled={['requested', 'quoted'].includes(selectedOrder.status)} type="button" onClick={() => updateOrder(selectedOrder.id, { assigned_to: selectedOrder.assigned_to }, "Order assignment")}>Save assignment</button>
                      {['requested', 'quoted'].includes(selectedOrder.status) && <button className="btn btn-dark" type="button" onClick={() => updateOrder(selectedOrder.id, { status: "approved" }, "Order accepted")}>Accept order</button>}
                      {!['cancelled', 'completed'].includes(selectedOrder.status) && <button className="btn btn-deny" type="button" onClick={() => { if (window.confirm(`Deny order #${selectedOrder.tracking_code}? This will cancel it and remove its assignment.`)) updateOrder(selectedOrder.id, { status: "cancelled", assigned_to: null }, "Order denied"); }}>Deny order</button>}
                      {['approved', 'printing', 'ready', 'shipped'].includes(selectedOrder.status) && <div className="field completion-revenue"><label htmlFor="final-revenue">Quote / final revenue</label><div className="money-input"><span>$</span><input id="final-revenue" type="number" min="0" step="0.01" value={(selectedOrder.quoted_cents || 0) / 100} onChange={(e) => setSelectedOrder({ ...selectedOrder, quoted_cents: Math.round(Math.max(0, Number(e.target.value)) * 100) })} /></div></div>}
                      {['approved', 'printing', 'ready', 'shipped'].includes(selectedOrder.status) && <button className="btn btn-light" type="button" onClick={() => updateOrder(selectedOrder.id, { quoted_cents: selectedOrder.quoted_cents ?? 0 }, "Order quote")}>Save quote</button>}
                      {['approved', 'printing', 'ready', 'shipped'].includes(selectedOrder.status) && <button className="btn btn-light" type="button" onClick={() => saveQuoteAndOpenGmail(selectedOrder, selectedOrder.quoted_cents ?? 0)}>Save quote &amp; open Gmail</button>}
                      {selectedOrder.status === 'approved' && <button className="btn btn-dark" type="button" onClick={() => updateOrder(selectedOrder.id, { status: "printing" }, "Order marked as printing")}>Mark as printing</button>}
                      {selectedOrder.status === 'printing' && <button className="btn btn-light" type="button" onClick={() => { if (window.confirm(`Confirm shipping is complete for order #${selectedOrder.tracking_code}?`)) updateOrder(selectedOrder.id, { status: "shipped" }, "Shipping complete"); }}>Mark shipping complete</button>}
                      {selectedOrder.status === 'shipped' && <button className="btn btn-dark" type="button" onClick={() => { if (window.confirm(`Mark order #${selectedOrder.tracking_code} completed at $${((selectedOrder.quoted_cents || 0) / 100).toFixed(2)}?`)) updateOrder(selectedOrder.id, { status: "completed", quoted_cents: selectedOrder.quoted_cents ?? 0 }, "Order completed"); }}>Mark completed</button>}
                    </div>
                  )}
                </article>
              )}
            </>
          )}
          {activeTab === "Customers" && (
            <>
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
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
                    <tr><td colSpan={5}>No real customers found yet. Customers appear here after they place an order.</td></tr>
                  ) : customers.map((customer) => (
                    <tr key={customer.email.toLowerCase()}>
                      <td>{customer.name}</td>
                      <td><a href={`mailto:${customer.email}`}>{customer.email}</a>{customer.phone && <><br /><a href={`tel:${customer.phone}`}>{customer.phone}</a></>}</td>
                      <td>{customer.orderCount}</td>
                      <td>#{customer.lastTrackingCode}<br /><small>{new Date(customer.lastOrderDate).toLocaleDateString()}</small></td>
                      <td><button className="btn btn-light table-save" type="button" onClick={() => setSelectedCustomerEmail(customer.email.toLowerCase())}>View customer</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
            {selectedCustomerEmail && (() => {
              const customer = customers.find((item) => item.email.toLowerCase() === selectedCustomerEmail);
              const customerOrders = orders.filter((order) => order.customer_email.toLowerCase() === selectedCustomerEmail);
              if (!customer) return null;
              return (
                <article className="panel order-details customer-details">
                  <div className="order-details-head">
                    <div><p className="eyebrow">Real customer record</p><h2>{customer.name}</h2></div>
                    <button className="btn btn-light" type="button" onClick={() => setSelectedCustomerEmail("")}>Close</button>
                  </div>
                  <div className="customer-contact">
                    <a href={`mailto:${customer.email}`}>{customer.email}</a>
                    {customer.phone && <a href={`tel:${customer.phone}`}>{customer.phone}</a>}
                    <strong>{customer.orderCount} order{customer.orderCount === 1 ? "" : "s"}</strong>
                  </div>
                  <div className="customer-order-list">
                    {customerOrders.map((order) => (
                      <div key={order.id}>
                        <div><strong>#{order.tracking_code}</strong><span className={`pill ${order.status}`}>{order.status.replaceAll("_", " ")}</span></div>
                        <p>{order.quantity} × {order.material || "Unselected material"} — {order.details}</p>
                        <p className="shipping-address"><b>Delivery:</b> {order.shipping_address || "Local pickup"}</p>
                        <div className="actions">
                          {order.model_url && <a className="btn btn-light" href={order.model_url} target="_blank" rel="noreferrer">Open model</a>}
                          <button className="btn btn-dark" type="button" onClick={() => { setSelectedOrder(order); setActiveTab("Orders"); }}>Manage order</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })()}
            </>
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
              {saved.startsWith("Team error") && <div className="form-error">{saved}</div>}
              {saved.startsWith("Employee ") && <div className="success">{saved} saved.</div>}
              <table className="table">
                <thead>
                  <tr>
                    <th>Gmail account</th>
                    <th>Role slots</th>
                    <th>Discount</th>
                    <th>Access</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.length === 0 ? (
                    <tr><td colSpan={5}>No employee profiles found. Run team-management.sql if employees should appear here.</td></tr>
                  ) : teamMembers.map((member) => (
                    <tr key={member.id}>
                      <td>{member.email}</td>
                      <td><div className="role-slots">
                        {Array.from({ length: 5 }, (_, slot) => (
                          <select key={slot} aria-label={`Role slot ${slot + 1}`} value={member.employee_roles?.[slot] || ""} onChange={(e) => {
                            const roles = [...(member.employee_roles || [])];
                            if (e.target.value) roles[slot] = e.target.value;
                            else roles.splice(slot, 1);
                            changeTeamMember(member.id, { employee_roles: [...new Set(roles.filter(Boolean))] });
                          }}>
                            <option value="">Blank</option>
                            <option value="handout">Handout</option>
                            <option value="order_taker">Order Taker</option>
                            <option value="modeler">Modeler</option>
                            <option value="printer">Printer</option>
                            <option value="social_management">Social Management</option>
                          </select>
                        ))}
                      </div></td>
                      <td><input className="table-number" type="number" min="0" max="100" value={member.employee_discount_percent} onChange={(e) => changeTeamMember(member.id, { employee_discount_percent: Number(e.target.value) })} />%</td>
                      <td><label className="access-toggle"><input type="checkbox" checked={member.active} onChange={(e) => changeTeamMember(member.id, { active: e.target.checked })} /> Active</label></td>
                      <td><button className="btn btn-dark table-save" onClick={() => saveTeamMember(member)}>Save</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="promotion-path">
                <span>Handout</span>
                <b>→</b>
                <span>Order Taker</span>
                <b>→</b>
                <span>Modeler</span>
                <b>→</b>
                <span>Printer</span>
                <b>→</b>
                <span>Social Management</span>
              </div>
            </article>
          )}
          {activeTab === "Pricing" && (
            <div className="admin-pricing">
              <article className="panel">
                <p className="eyebrow">Staff quote tool</p>
                <h2>Print price calculator</h2>
                <p className="panel-copy">Enter the slicer&rsquo;s total filament weight and estimated print time.</p>
                <div className="pricing-order-list">
                  <div className="pricing-order-list-head">
                    <strong>Active orders</strong>
                    <button className="btn btn-light table-save" type="button" onClick={() => refreshOrders(role === "admin" ? null : staffUserId)}>Refresh</button>
                  </div>
                  {orders.filter((order) => !["cancelled", "completed"].includes(order.status)).length === 0 ? (
                    <p>No active orders are available to your account yet.</p>
                  ) : orders.filter((order) => !["cancelled", "completed"].includes(order.status)).map((order) => (
                    <button
                      type="button"
                      key={order.id}
                      className={pricingOrderId === order.id ? "selected" : ""}
                      disabled={!['approved', 'printing', 'ready', 'shipped'].includes(order.status)}
                      onClick={() => { setPricingOrderId(order.id); setQuoteRecipient(order.customer_email); }}
                    >
                      <span><strong>#{order.tracking_code}</strong>{order.customer_name}</span>
                      <span><small>{order.status.replaceAll("_", " ")}</small>{order.promo_code && <b>{order.promo_code} · {order.promo_percent_off}% off</b>}</span>
                    </button>
                  ))}
                </div>
                <div className="field">
                  <label htmlFor="pricing-order">Order to quote</label>
                  <select id="pricing-order" value={pricingOrderId} onChange={(e) => { const id = e.target.value; setPricingOrderId(id); setQuoteRecipient(orders.find((order) => order.id === id)?.customer_email || ""); }}>
                    <option value="">Choose an active order</option>
                    {orders.filter((order) => ['approved', 'printing', 'ready', 'shipped'].includes(order.status)).map((order) => <option key={order.id} value={order.id}>#{order.tracking_code} — {order.customer_name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="quote-recipient">Receiving Gmail address</label>
                  <input id="quote-recipient" type="email" value={quoteRecipient} onChange={(e) => setQuoteRecipient(e.target.value)} placeholder="example@gmail.com" />
                  <small>Filled from the selected order. You can edit it before opening Gmail.</small>
                </div>
                <div className="field">
                  <label htmlFor="admin-price-material">Material</label>
                  <select id="admin-price-material" value={priceMaterial} onChange={(e) => setPriceMaterial(e.target.value as "PLA" | "PETG")}>
                    <option value="PLA">PLA — $0.15 per gram</option>
                    <option value="PETG">PETG — $0.25 per gram</option>
                  </select>
                </div>
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="admin-price-grams">Total grams</label>
                    <input id="admin-price-grams" type="number" min="1" max="10000" value={estimatedGrams} onChange={(e) => setEstimatedGrams(Math.max(0, Number(e.target.value)))} />
                  </div>
                  <div className="field">
                    <label htmlFor="admin-price-hours">Print hours</label>
                    <input id="admin-price-hours" type="number" min="0" max="1000" step="0.25" value={estimatedHours} onChange={(e) => setEstimatedHours(Math.max(0, Number(e.target.value)))} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="admin-modeling-hours">Modeling work hours</label>
                  <input id="admin-modeling-hours" type="number" min="0" max="1000" step="0.25" value={modelingHours} onChange={(e) => setModelingHours(Math.max(0, Number(e.target.value)))} />
                  <small>Custom design work is $1 per hour. Enter 0 when the customer provides a print-ready model.</small>
                </div>
                <div className="estimate-total">
                  <span>{pricingDiscountPercent ? `Final quote after ${pricingDiscountPercent}% promo` : "Quote before extras"}</span>
                  <strong>${discountedEstimatedPrice.toFixed(2)}</strong>
                </div>
                {pricingOrder?.promo_code && <p className="success">Promo code <strong>{pricingOrder.promo_code}</strong>: ${estimatedPrice.toFixed(2)} − ${(estimatedPrice - discountedEstimatedPrice).toFixed(2)} discount</p>}
                <p className="estimate-formula">$5 setup + ${gramRate.toFixed(2)} × {estimatedGrams}g + $2 × {estimatedHours} print hours + $1 × {modelingHours} modeling hours</p>
                <small>Shipping, sales tax, unusual materials, and later customer-requested changes are added separately.</small>
                <button className="btn btn-dark team-save" type="button" disabled={!pricingOrderId} onClick={() => updateOrder(pricingOrderId, { quoted_cents: Math.round(discountedEstimatedPrice * 100) }, "Pricing quote")}>Save quote to selected order</button>
                <button className="btn btn-light team-save" type="button" disabled={!pricingOrderId || !quoteRecipient.trim()} onClick={() => { if (pricingOrder) saveQuoteAndOpenGmail(pricingOrder, Math.round(discountedEstimatedPrice * 100), quoteRecipient); }}>Save quote &amp; open Gmail</button>
              </article>
              <article className="panel rate-reference">
                <h2>Vertex rates</h2>
                <div className="rate-cards">
                  <span><strong>PLA</strong>$0.15 per gram</span>
                  <span><strong>PETG</strong>$0.25 per gram</span>
                  <span><strong>Machine time</strong>$2 per hour</span>
                  <span><strong>Modeling work</strong>$1 per hour</span>
                  <span><strong>Setup</strong>$5 per order</span>
                </div>
                <p className="demo-note">Recommended minimum order: $10.</p>
              </article>
            </div>
          )}
          {activeTab === "Payments" && role === "admin" && (
            <>
            <div className="payment-layout">
              <article className="panel">
                <p className="eyebrow">Admin planning tool</p>
                <h2>Monthly Team Payments</h2>
                <p className="panel-copy">Each role&rsquo;s payment scales automatically. Under $200, the reserve becomes $0 and that money increases role payments. This calculator does not send money.</p>
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="expense-reserve">Scaled company expense reserve</label>
                    <input id="expense-reserve" type="text" value={`$${expenseReserve.toFixed(2)}`} readOnly />
                  </div>
                </div>
                <div className="payment-table-wrap">
                  <table className="table payment-table">
                    <thead><tr><th>Role</th><th>People</th><th>Base at $205</th><th>Each this month</th><th>Role total</th></tr></thead>
                    <tbody>
                      {paymentRows.map((row, index) => (
                        <tr key={row.role}>
                          <td>{row.role}</td>
                          <td><input className="table-number" aria-label={`${row.role} people`} type="number" min="0" step="1" value={row.count} onChange={(e) => setPaymentRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, count: Math.max(0, Math.floor(Number(e.target.value))) } : item))} /></td>
                          <td>${row.baseAmount.toFixed(2)}</td>
                          <td><strong>${(row.baseAmount * revenueMultiplier).toFixed(2)}</strong></td>
                          <td><strong>${(row.count * row.baseAmount * revenueMultiplier).toFixed(2)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="demo-note">{lowRevenueMonth ? "Under $200: the reserve is $0 and role payments scale from the $175 employee-payment baseline." : "At $200 or more: the $30 reserve and role payments scale from the $205 baseline."}</p>
                <button className="btn btn-dark team-save" type="button" onClick={savePayrollPlan}>Save roles and payment plan</button>
              </article>
              <aside className="panel payment-summary">
                <span className="panel-icon"><DollarSign size={22} /></span>
                <h2>Monthly summary</h2>
                <dl>
                  <div><dt>Revenue</dt><dd>${monthlyRevenue.toFixed(2)}</dd></div>
                  <div><dt>Company reserve</dt><dd>−${expenseReserve.toFixed(2)}</dd></div>
                  <div><dt>Team payments</dt><dd>−${totalTeamPayments.toFixed(2)}</dd></div>
                  <div className="payment-balance"><dt>Money remaining</dt><dd className={moneyRemaining < 0 ? "negative" : "positive"}>${moneyRemaining.toFixed(2)}</dd></div>
                </dl>
                <p className={moneyRemaining < 0 ? "payment-warning" : "payment-ok"}>{moneyRemaining < 0 ? "The plan is over budget. Lower a role payment or complete more orders." : "This plan fits within this month’s completed-order revenue."}</p>
              </aside>
            </div>
            <article className="panel automatic-revenue">
              <div>
                <p className="eyebrow">Automatic revenue tracker</p>
                <h2>Completed-order revenue</h2>
                <p className="panel-copy">Saved independently from the payroll plan. Completed discounted quotes add automatically, and processed refunds subtract automatically.</p>
              </div>
              <div className="revenue-period">
                <span>This month&rsquo;s revenue</span>
                <strong>${monthlyRevenue.toFixed(2)}</strong>
                <small>Starts at $0 each calendar month</small>
              </div>
              <div className="revenue-period previous">
                <span>Last month&rsquo;s revenue</span>
                <strong>${previousMonthRevenue.toFixed(2)}</strong>
                <small>Replaced when the next month begins</small>
              </div>
            </article>
            </>
          )}
          {activeTab === "Inventory" && (
            <div className="panel-stack">
              {canManageInventory && (
                <article className="panel">
                  <p className="eyebrow">Admin and printer inventory</p>
                  <h2>Add filament</h2>
                  <form className="inventory-form" onSubmit={addFilament}>
                    <div className="field"><label htmlFor="filament-material">Material</label><select id="filament-material" value={newFilament.material} onChange={(e) => setNewFilament({ ...newFilament, material: e.target.value })}><option>PLA</option><option>PETG</option><option>TPU</option><option>ABS</option><option>Other</option></select></div>
                    <div className="field"><label htmlFor="filament-color">Color</label><input id="filament-color" list="filament-color-options" required value={newFilament.color} onChange={(e) => setNewFilament({ ...newFilament, color: e.target.value })} /><datalist id="filament-color-options">{["Black","White","Gray","Red","Orange","Yellow","Green","Blue","Purple","Pink","Brown","Clear", ...filaments.map((item) => item.color)].filter((color, index, colors) => colors.findIndex((item) => item.toLowerCase() === color.toLowerCase()) === index).map((color) => <option key={color} value={color} />)}</datalist></div>
                    <div className="field"><label htmlFor="filament-spools">Spools</label><input id="filament-spools" type="number" min="0" step="0.25" value={newFilament.spool_count} onChange={(e) => setNewFilament({ ...newFilament, spool_count: Math.max(0, Number(e.target.value)) })} /></div>
                    <div className="field"><label htmlFor="filament-grams">Approx. grams</label><input id="filament-grams" type="number" min="0" value={newFilament.grams_available} onChange={(e) => setNewFilament({ ...newFilament, grams_available: Math.max(0, Number(e.target.value)) })} /></div>
                    <div className="field inventory-notes"><label htmlFor="filament-notes">Notes</label><input id="filament-notes" value={newFilament.notes} onChange={(e) => setNewFilament({ ...newFilament, notes: e.target.value })} /></div>
                    <button className="btn btn-dark" type="submit">Add filament</button>
                  </form>
                </article>
              )}
              <article className="panel">
                <h2>Filament in stock</h2>
                <p className="panel-copy">Shared inventory for administrators and employees preparing quotes. Admin and printer edits save automatically.</p>
                <div className="payment-table-wrap"><table className="table inventory-table"><thead><tr><th>Material</th><th>Color</th><th>Spools</th><th>Approx. grams</th><th>Status</th><th>Notes</th>{canManageInventory && <th></th>}</tr></thead><tbody>
                  {filaments.length === 0 ? <tr><td colSpan={canManageInventory ? 7 : 6}>No filament records found. An admin or printer can add stock after filament-inventory.sql is activated.</td></tr> : filaments.map((filament) => (
                    <tr key={filament.id}>
                      <td>{canManageInventory ? <input className="inventory-input" value={filament.material} onChange={(e) => setFilaments((items) => items.map((item) => item.id === filament.id ? { ...item, material: e.target.value } : item))} onBlur={() => saveFilament(filament)} /> : filament.material}</td>
                      <td>{canManageInventory ? <input className="inventory-input" list="filament-color-options" value={filament.color} onChange={(e) => setFilaments((items) => items.map((item) => item.id === filament.id ? { ...item, color: e.target.value } : item))} onBlur={() => saveFilament(filament)} /> : filament.color}</td>
                      <td>{canManageInventory ? <input className="table-number" type="number" min="0" step="0.25" value={filament.spool_count} onChange={(e) => setFilaments((items) => items.map((item) => item.id === filament.id ? { ...item, spool_count: Math.max(0, Number(e.target.value)) } : item))} onBlur={() => saveFilament(filament)} /> : filament.spool_count}</td>
                      <td>{canManageInventory ? <input className="table-number" type="number" min="0" value={filament.grams_available} onChange={(e) => setFilaments((items) => items.map((item) => item.id === filament.id ? { ...item, grams_available: Math.max(0, Number(e.target.value)) } : item))} onBlur={() => saveFilament(filament)} /> : filament.grams_available}</td>
                      <td>{canManageInventory ? <label className="access-toggle"><input type="checkbox" checked={filament.in_stock} onChange={(e) => { const updated = { ...filament, in_stock: e.target.checked }; setFilaments((items) => items.map((item) => item.id === filament.id ? updated : item)); saveFilament(updated); }} /> In stock</label> : <span className={`pill ${filament.in_stock ? "printing" : "cancelled"}`}>{filament.in_stock ? "In stock" : "Out"}</span>}</td>
                      <td>{canManageInventory ? <input className="inventory-input" value={filament.notes} onChange={(e) => setFilaments((items) => items.map((item) => item.id === filament.id ? { ...item, notes: e.target.value } : item))} onBlur={() => saveFilament(filament)} /> : filament.notes || "—"}</td>
                      {canManageInventory && <td><button className="btn btn-deny table-save" type="button" onClick={() => deleteFilament(filament.id)}>Remove one spool</button></td>}
                    </tr>
                  ))}
                </tbody></table></div>
              </article>
            </div>
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
                <form onSubmit={saveSeasonalDiscount}>
                  <div className="grid2">
                    <div className="field">
                      <label>Promotion name</label>
                      <input name="seasonal_name" required placeholder="Summer sale" />
                    </div>
                    <div className="field">
                      <label>Percent off</label>
                      <input
                        name="seasonal_percent" required
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
                      <input name="seasonal_start" required type="date" />
                    </div>
                    <div className="field">
                      <label>End date</label>
                      <input name="seasonal_end" required type="date" />
                    </div>
                  </div>
                  {saved === "Seasonal discount" && notice}
                  {saved.startsWith("Seasonal discount error") && <div className="form-error">{saved}</div>}
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
                <form onSubmit={savePromoCode}>
                  <div className="grid2">
                    <div className="field">
                      <label>Promo code</label>
                      <input
                        required
                        minLength={3}
                        maxLength={20}
                        placeholder="VERTEX15"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.currentTarget.value.toUpperCase().replace(/\s/g, ""))}
                      />
                    </div>
                    <div className="field">
                      <label>Percent off</label>
                      <input
                        required value={promoPercent} onChange={(e) => setPromoPercent(Number(e.target.value))}
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
                      <input required type="date" value={promoExpires} onChange={(e) => setPromoExpires(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Maximum uses</label>
                      <input type="number" min="1" placeholder="Unlimited" value={promoMaxUses} onChange={(e) => setPromoMaxUses(e.target.value)} />
                    </div>
                  </div>
                  {saved === "Promo code" && notice}
                  {saved.startsWith("Promo code error") && <div className="form-error">{saved}</div>}
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
                {messageSystemError && <div className="form-error">Message system error: {messageSystemError}. Run <strong>supabase/staff-messages-repair.sql</strong> in the Supabase SQL Editor.</div>}
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
                    {staffLevel.replaceAll("_", " ")}
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
