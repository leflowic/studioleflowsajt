import { Resend } from 'resend';

// Cache credentials to avoid repeated API calls
let cachedCredentials: { apiKey: string; fromEmail: string } | null = null;

// Development mode storage for verification codes
interface VerificationCodeStorage {
  email: string;
  code: string;
  subject: string;
  timestamp: number;
}

let lastVerificationCode: VerificationCodeStorage | null = null;

// Export function to get last verification code (for debug endpoint)
export function getLastVerificationCode(): VerificationCodeStorage | null {
  return lastVerificationCode;
}

async function getCredentials() {
  // Return cached credentials if available
  if (cachedCredentials) {
    console.log('[RESEND] Using cached credentials');
    return cachedCredentials;
  }

  // Check for direct API key in environment variables first
  const directApiKey = process.env.RESEND_API_KEY;
  
  if (directApiKey) {
    console.log('[RESEND] Using RESEND_API_KEY from environment variables');
    
    // In production, RESEND_FROM_EMAIL is required to avoid silent failures
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    
    if (!fromEmail) {
      // Allow fallback to test domain only in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('[RESEND] RESEND_FROM_EMAIL not set, using test domain (development only)');
        cachedCredentials = {
          apiKey: directApiKey,
          fromEmail: 'onboarding@resend.dev'
        };
        return cachedCredentials;
      }
      
      // Fail fast in production
      console.error('[RESEND] RESEND_FROM_EMAIL environment variable is required in production');
      throw new Error('RESEND_FROM_EMAIL is not configured. Add it to secrets with your verified domain email (e.g., no-reply@mail.studioleflow.com)');
    }
    
    cachedCredentials = {
      apiKey: directApiKey,
      fromEmail: fromEmail
    };
    
    return cachedCredentials;
  }

  // Fallback to Replit connector
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    console.error('[RESEND] X_REPLIT_TOKEN not found and no direct API key');
    throw new Error('Resend API key not configured');
  }

  console.log('[RESEND] Fetching connection settings from:', hostname);
  
  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  const connectionSettings = data.items?.[0];

  if (!connectionSettings || (!connectionSettings.settings?.api_key)) {
    console.error('[RESEND] Connection settings invalid:', connectionSettings);
    throw new Error('Resend not connected');
  }

  if (!connectionSettings.settings.from_email) {
    console.error('[RESEND] Missing from_email in connection settings');
    throw new Error('Resend from_email not configured');
  }
  
  console.log('[RESEND] Successfully retrieved API key from connector');
  
  // Cache credentials for future use
  cachedCredentials = {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
  
  return cachedCredentials;
}

export async function getResendClient() {
  try {
    const credentials = await getCredentials();
    console.log('[RESEND] Creating Resend client with fromEmail:', credentials.fromEmail);
    return {
      client: new Resend(credentials.apiKey),
      fromEmail: credentials.fromEmail
    };
  } catch (error) {
    console.error('[RESEND] Error getting Resend client:', error);
    throw error;
  }
}

// Helper function to extract verification code from HTML
function extractVerificationCode(html: string): string | null {
  // Try to extract 6-digit code from HTML
  const codeMatch = html.match(/\b(\d{6})\b/);
  return codeMatch?.[1] ?? null;
}

// Helper function for sending emails
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  console.log('[RESEND] Sending email to:', to);
  console.log('[RESEND] Subject:', subject);

  const { client, fromEmail } = await getResendClient();

  console.log('[RESEND] From email:', fromEmail);

  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });

    if (error) {
      // Check if this is a test mode restriction error
      const isTestModeError = error.message?.includes('only send testing emails') || 
                              error.message?.includes('verify a domain');
      
      if (isDevelopment && isTestModeError) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔧 [RESEND] TEST MODE DETECTED - Using Development Fallback');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Recipient:', to);
        console.log('📨 Subject:', subject);
        
        // Try to extract verification code
        const code = extractVerificationCode(html);
        if (code) {
          console.log('🔑 VERIFICATION CODE:', code);
          
          // Store for debug endpoint
          lastVerificationCode = {
            email: to,
            code: code,
            subject: subject,
            timestamp: Date.now()
          };
          
          console.log('💡 Use GET /api/debug/verification-code to retrieve this code');
        } else {
          console.log('📄 Email content (first 200 chars):', html.substring(0, 200));
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('ℹ️  To enable real emails, verify your domain at resend.com/domains');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Return mock success in development
        return {
          success: true,
          messageId: 'dev-mode-' + Date.now(),
          data: { id: 'dev-mode-' + Date.now() }
        };
      }
      
      // Re-throw if not a test mode error or not in development
      console.error('[RESEND] Failed to send email:', error);
      throw new Error(error.message);
    }

    console.log('[RESEND] Email sent successfully. ID:', data?.id);
    
    return { 
      success: true, 
      messageId: data?.id,
      data 
    };
  } catch (error: any) {
    // Catch network or unexpected errors
    console.error('[RESEND] Unexpected error sending email:', error);
    throw error;
  }
}
