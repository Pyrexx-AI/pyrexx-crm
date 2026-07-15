import { Resend } from 'resend';
import { EmailProvider, SendEmailPayload } from './EmailProvider';

const resend = new Resend(process.env.RESEND_API_KEY);

export class ResendProvider implements EmailProvider {
  async sendEmail(payload: SendEmailPayload) {
    try {
      const data = await resend.emails.send({
        from: payload.from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html || payload.text,
        attachments: payload.attachments, // Resend natively supports remote URL paths!
      });

      if (data.error) {
        return { error: data.error.message };
      }
      return { id: data.data?.id };
    } catch (error: any) {
      return { error: error.message };
    }
  }
}