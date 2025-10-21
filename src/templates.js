// src/templates.js

/**
 * Generates a welcome message for a new user.
 * @param {object} data - The data for the template.
 * @param {string} data.name - The user's first name.
 * @param {string} data.company - The name of the company or service.
 * @returns {string} The formatted message.
 */
const welcome = (data) => 
`👋 Welcome, *${data.name}*!

We are thrilled to have you join ${data.company || 'our team'}.

To get started, please complete your profile or take a look at our introductory guide. We're here if you have any questions.`;

/**
 * Generates a one-time verification code.
 * @param {object} data - The data for the template.
 * @param {string} data.code - The verification code.
 * @returns {string} The formatted message.
 */
const verificationCode = (data) =>
`Your verification code is: *${data.code}*

This code will expire in 10 minutes. For your security, please do not share this code with anyone.`;

/**
 * Generates a password reset code.
 * @param {object} data - The data for the template.
 * @param {string} data.code - The password reset code.
 * @returns {string} The formatted message.
 */
const resetCode = (data) =>
`Your password reset code is: *${data.code}*

If you did not request this password reset, please secure your account and ignore this message.`;

/**
 * Generates a generic order status update.
 * @param {object} data - The data for the template.
 * @param {string} data.orderId - The unique order identifier.
 * @param {string} data.status - The new status of the order (e.g., "Processing", "Shipped", "Delivered").
 * @returns {string} The formatted message.
 */
const orderStatus = (data) =>
`*Order Update*

Status for your order *#${data.orderId}* has been updated to: *${data.status}*.

We will notify you of any further changes.`;

/**
 * Generates a shipping update with a tracking number.
 * @param {object} data - The data for the template.
 * @param {string} data.orderId - The unique order identifier.
 * @param {string} data.carrier - The shipping carrier (e.g., "FedEx", "UPS").
 * @param {string} data.trackingNumber - The tracking number.
 * @returns {string} The formatted message.
 */
const shippingUpdate = (data) =>
`🚚 *Your Order has Shipped!*

Good news! Your order *#${data.orderId}* is on its way.

Carrier: ${data.carrier}
Tracking #: *${data.trackingNumber}*

You can track your package on the carrier's website.`;

/**
 * Generates a confirmation that a password has been successfully changed.
 * @param {object} data - The data for the template.
 * @param {string} data.username - The user's username or name.
 * @returns {string} The formatted message.
 */
const passwordChangedNotice = (data) =>
`*Security Alert: Password Changed*

This is a confirmation that the password for your account (*${data.username}*) was successfully changed.

If you did *not* make this change, please contact our support team immediately.`;

/**
 * Generates a reminder for an upcoming appointment.
 * @param {object} data - The data for the template.
 * @param {string} data.serviceName - The name of the service or event.
 * @param {string} data.dateTime - The full date and time of the appointment (e.g., "Oct 22, 2025 at 2:30 PM").
 * @param {string} [data.location] - The location of the appointment (optional).
 * @returns {string} The formatted message.
 */
const appointmentReminder = (data) =>
`*Appointment Reminder*

This is a friendly reminder for your upcoming appointment:

Service: *${data.serviceName}*
When: *${data.dateTime}*
${data.location ? `Where: ${data.location}` : ''}

Please let us know if you need to reschedule.`;

/**
 * Generates a notification for a new invoice.
 * @param {object} data - The data for the template.
 * @param {string} data.invoiceId - The unique invoice identifier.
 * @param {string} data.amount - The total amount due (e.g., "$99.99").
 * @param {string} data.dueDate - The due date for the payment.
 * @returns {string} The formatted message.
 */
const invoiceGenerated = (data) =>
`*New Invoice Generated*

A new invoice (*#${data.invoiceId}*) has been generated for your account.

Amount Due: *${data.amount}*
Due Date: *${data.dueDate}*

You can view and pay the invoice in your account dashboard.`;

/**
 * Generates a reminder for an upcoming subscription renewal.
 * @param {object} data - The data for the template.
 * @param {string} data.planName - The name of the subscription plan.
 * @param {string} data.renewalDate - The date the subscription will renew.
 * @param {string} data.amount - The amount that will be charged.
 * @returns {string} The formatted message.
 */
const subscriptionRenewalReminder = (data) =>
`*Subscription Renewal Notice*

Your *${data.planName}* plan is scheduled to renew on *${data.renewalDate}*.

The renewal amount will be *${data.amount}*. No action is needed if you wish to continue your subscription.

You can manage your subscription settings in your account profile.`;


// Export all templates
export const templates = {
  welcome,
  verificationCode,
  resetCode,
  orderStatus,
  shippingUpdate,
  passwordChangedNotice,
  appointmentReminder,
  invoiceGenerated,
  subscriptionRenewalReminder
};