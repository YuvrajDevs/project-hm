// Server-only email delivery for the chat-key reset code, sent from thehonestmailbox@gmail.com via
// Gmail SMTP with an app password. Never import this from a "use client" file.
import nodemailer from "nodemailer";

let transport: ReturnType<typeof nodemailer.createTransport> | undefined;

const getTransport = () => {
  if (transport) return transport;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("GMAIL_USER/GMAIL_APP_PASSWORD are not set.");
  transport = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  return transport;
};

export const sendResetCode = async (toEmail: string, code: string) => {
  await getTransport().sendMail({
    from: `"The Honest Mailbox" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: "Your chat reset code",
    text: `Your code is ${code}. It expires in 10 minutes.\n\nResetting your chat passphrase destroys your chat history and cannot be undone. If you didn't request this, ignore this email - nothing happens until the code is entered.`,
    html: `<p>Your code is <strong style="font-size:20px;letter-spacing:4px;">${code}</strong>. It expires in 10 minutes.</p><p>Resetting your chat passphrase destroys your chat history and cannot be undone. If you didn't request this, ignore this email - nothing happens until the code is entered.</p>`,
  });
};
