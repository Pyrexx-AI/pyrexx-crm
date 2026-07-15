export interface SendEmailPayload {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; path: string }[];
}

export interface EmailProvider {
  sendEmail(payload: SendEmailPayload): Promise<{ id?: string; error?: string }>;
}