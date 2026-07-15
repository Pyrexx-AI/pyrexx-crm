import { Resend } from 'resend';
import { EmailProvider, SendEmailPayload } from './EmailProvider';

export class ResendProvider implements EmailProvider {
  private resend: Resend | null = null;

  constructor(customApiKey?: string) {
    // Fall back to global environment key if no custom tenant key is provided
    const apiKey = customApiKey || process.env.RESEND_API_KEY;
    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  async sendEmail(payload: SendEmailPayload) {
    if (!this.resend) {
      console.error("[Email Engine Error]: No valid Resend API key configured for this client.");
      return { error: "Resend API key is missing or unconfigured." };
    }

    try {
      const data = await this.resend.emails.send({
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
      console.error("[Resend Server Exception]:", error);
      return { error: error.message };
    }
  }
}