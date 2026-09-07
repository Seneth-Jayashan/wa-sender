export interface TemplateData {
  name?: string;
  company?: string;
  code?: string;
  username?: string;
  orderId?: string;
  status?: string;
  carrier?: string;
  trackingNumber?: string;
  invoiceId?: string;
  amount?: string | number;
  dueDate?: string;
  planName?: string;
  renewalDate?: string;
  serviceName?: string;
  dateTime?: string;
  location?: string;
  eventName?: string;
  venue?: string;
  date?: string;
  time?: string;
  withPerson?: string;
  meetingLink?: string;
  otp?: string;
  offerTitle?: string;
  promoCode?: string;
  discount?: string;
  expiryDate?: string;
  greetingTitle?: string;
  message?: string;
  alertMessage?: string;
  timestamp?: string;
  email?: string;
  [key: string]: any;
}

const welcome = (data: TemplateData) =>
  `🎉 Welcome, ${data.name}! We’re excited to have you join ${data.company || 'our team'}. Let’s make great things happen together!`;

const verificationCode = (data: TemplateData) =>
  `Your verification code is: *${data.code}*. It expires in 10 minutes. Please do not share it with anyone.`;

const resetCode = (data: TemplateData) =>
  `🔑 Password Reset\nYour reset code is *${data.code}*. Use this to securely reset your password.`;

const passwordChangedNotice = (data: TemplateData) =>
  `🔐 Hi ${data.username}, your password was changed successfully. If this wasn’t you, please reset it immediately.`;

const orderStatus = (data: TemplateData) =>
  `📦 Order Update\nOrder #${data.orderId} is now *${data.status}*. Thank you for shopping with us!`;

const shippingUpdate = (data: TemplateData) =>
  `🚚 Shipping Update for Order #${data.orderId}\nCarrier: ${data.carrier}\nTracking: ${data.trackingNumber}`;

const invoiceGenerated = (data: TemplateData) =>
  `🧾 Invoice #${data.invoiceId} generated.\nAmount: Rs. ${data.amount}\nDue Date: ${data.dueDate}`;

const subscriptionRenewalReminder = (data: TemplateData) =>
  `🔔 Reminder: Your subscription for *${data.planName}* renews on ${data.renewalDate} for Rs. ${data.amount}.`;

const paymentReceived = (data: TemplateData) =>
  `💰 Payment Received!\nWe’ve received Rs. ${data.amount} for Invoice #${data.invoiceId}. Thank you!`;

const paymentFailed = (data: TemplateData) =>
  `⚠️ Payment Failed\nYour payment of Rs. ${data.amount} could not be processed. Please update your payment method.`;

const appointmentReminder = (data: TemplateData) =>
  `📅 Reminder: Your ${data.serviceName} appointment is on ${data.dateTime} at ${data.location || ''}. Please be on time.`;

const eventInvitation = (data: TemplateData) =>
  `🎊 You’re invited to *${data.eventName}*! Join us at ${data.venue} on ${data.date} at ${data.time}. RSVP now to confirm attendance.`;

const meetingReminder = (data: TemplateData) =>
  `📌 Meeting Reminder: Your meeting with *${data.withPerson}* is scheduled for ${data.dateTime}. Join via ${data.meetingLink}`;

const accountDeactivated = (data: TemplateData) =>
  `⚠️ Hello ${data.username}, your account has been temporarily deactivated. Contact support if this was a mistake.`;

const accountReactivated = (data: TemplateData) =>
  `✅ Good news ${data.username}! Your account has been reactivated. You can now continue using our services.`;

const otpLogin = (data: TemplateData) =>
  `🔒 Login OTP: *${data.otp}* (valid for 5 minutes). Please do not share it with anyone.`;

const feedbackRequest = (data: TemplateData) =>
  `💬 Hi ${data.name}, we’d love your feedback on your recent experience with ${data.company}. Share your thoughts with us!`;

const thankYouPurchase = (data: TemplateData) =>
  `🙏 Thank you ${data.name} for shopping with ${data.company}! We hope to serve you again soon.`;

const promotionalOffer = (data: TemplateData) =>
  `🎁 Special Offer: ${data.offerTitle}\nUse code *${data.promoCode}* to get ${data.discount} off. Valid till ${data.expiryDate}!`;

const seasonalGreeting = (data: TemplateData) =>
  `✨ ${data.greetingTitle} from all of us at ${data.company}! Wishing you and your loved ones ${data.message}.`;

const systemAlert = (data: TemplateData) =>
  `⚙️ System Alert\n${data.alertMessage}\nTime: ${data.timestamp}`;

const newUserSignup = (data: TemplateData) =>
  `👋 New User Signup: ${data.name} (${data.email}) has just registered on the platform.`;

const adminNotification = (data: TemplateData) =>
  `🚨 Admin Notification: ${data.message}`;

export const templates: Record<string, (data: TemplateData) => string> = {
  welcome,
  verificationCode,
  resetCode,
  passwordChangedNotice,
  orderStatus,
  shippingUpdate,
  invoiceGenerated,
  subscriptionRenewalReminder,
  paymentReceived,
  paymentFailed,
  appointmentReminder,
  eventInvitation,
  meetingReminder,
  accountDeactivated,
  accountReactivated,
  otpLogin,
  feedbackRequest,
  thankYouPurchase,
  promotionalOffer,
  seasonalGreeting,
  systemAlert,
  newUserSignup,
  adminNotification
};
