const sgMail = require('@sendgrid/mail');
const db = require('./db');

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Send a templated email with DB template override support.
 *
 * Loads the template from the email_templates table by name.
 * If found and active, uses the DB template with {{variable}} replacements.
 * Otherwise falls back to the provided hardcoded subject/html.
 * Sends via SendGrid. Logs errors without throwing (fire-and-forget safe).
 *
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.templateName - Template name to look up in DB
 * @param {Object} options.variables - Key-value pairs for {{variable}} replacement
 * @param {string} options.fallbackSubject - Subject to use if no DB template found
 * @param {string} options.fallbackHtml - HTML body to use if no DB template found
 */
async function sendTemplatedEmail({ to, templateName, variables, fallbackSubject, fallbackHtml }) {
  if (!process.env.SENDGRID_API_KEY || !process.env.FROM_EMAIL) {
    return;
  }

  let subject = fallbackSubject;
  let html = fallbackHtml;

  try {
    const tplResult = await db.query(
      'SELECT * FROM email_templates WHERE name = $1 AND is_active = true',
      [templateName]
    );
    if (tplResult.rows.length > 0) {
      const tpl = tplResult.rows[0];
      subject = tpl.subject;
      html = tpl.html_body;
    }
  } catch (tplErr) {
    console.error(`Email template lookup failed for '${templateName}', using fallback:`, tplErr);
  }

  // Replace all {{key}} variables in both subject and html
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(regex, value);
      html = html.replace(regex, value);
    }
  }

  const recipients = Array.isArray(to) ? to : [to];
  for (const recipient of recipients) {
    try {
      await sgMail.send({
        to: recipient,
        from: process.env.FROM_EMAIL,
        subject,
        html,
      });
    } catch (emailErr) {
      console.error(`Failed to send '${templateName}' email to ${recipient}:`, emailErr);
    }
  }
}

module.exports = { sendTemplatedEmail };
