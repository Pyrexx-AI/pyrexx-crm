export const logger = {
  info: (context: string, message: string, data?: any) => {
    console.log(`[INFO] [${context}] ${message}`, data ? data : '');
  },
  warn: (context: string, message: string, data?: any) => {
    console.warn(`[WARN] [${context}] ${message}`, data ? data : '');
  },
  error: (context: string, message: string, error?: any) => {
    console.error(`[ERROR] [${context}] ${message}`, error ? error : '');
  }
};