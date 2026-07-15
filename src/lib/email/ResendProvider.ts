import { Resend } from 'resend';
import { EmailProvider, SendEmailPayload } from './EmailProvider';

// Safely evaluate API key to prevent SDK initialization crash on Vercel
const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

export class ResendProvider implements EmailProvider {
  async sendEmail(payload: SendEmailPayload) {
    if (!resend) {
      console.error("[Email Engine Error]: RESEND_API_KEY is not defined in environment variables.");
      return { error: "RESEND_API_KEY is missing from server environment." };
    }

    try {
      const data = await resend.emails.send({
        from: payload.from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html || payload.text,
        attachments: payload.attachments,
      });

      if (data.error) {
        console.error("[Resend SDK Error]:", data.error);
        return { error: data.error.message };
      }
      return { id: data.data?.id };
    } catch (error: any) {
      console.error("[Resend Server Crash Exception]:", error);
      return { error: error.message };
    }
  }
}