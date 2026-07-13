export interface SendEmailPayload {
  to: string;
  from: string; // e.g., 'bloomspa@crm.pyrexxai.com'
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  sendEmail(payload: SendEmailPayload): Promise<{ id?: string; error?: string }>;
}