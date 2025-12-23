import nodemailer, { Transporter } from "nodemailer";
import path from "path";
import fs from "fs";
import ejs from "ejs";
import "dotenv/config";

interface EmailOptions {
  email: string;
  subject: string;
  template?: string; // Optional - if not provided, use html/text directly
  data?: { [key: string]: any };
  html?: string; // Direct HTML content (no template)
  text?: string; // Direct text content (no template)
  attachments?: { filename: string; path: string; cid: string }[];
}

/**
 * Extract meaningful text from HTML for plain text email version
 * Better than simple regex replacement - preserves structure
 */
function extractTextFromHTML(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // Replace common HTML elements with text equivalents
  text = text.replace(/<h[1-6][^>]*>/gi, "\n\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n");
  text = text.replace(/<p[^>]*>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n");
  text = text.replace(/<br[^>]*>/gi, "\n");
  text = text.replace(/<li[^>]*>/gi, "• ");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, "\n");
  text = text.replace(/<div[^>]*>/gi, "\n");
  text = text.replace(/<\/div>/gi, "");
  text = text.replace(
    /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi,
    "$2 ($1)"
  );
  text = text.replace(/<strong[^>]*>|<\/strong>/gi, "**");
  text = text.replace(/<em[^>]*>|<\/em>/gi, "*");
  text = text.replace(/<b[^>]*>|<\/b>/gi, "**");
  text = text.replace(/<i[^>]*>|<\/i>/gi, "*");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, "");

  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&apos;/g, "'");

  // Clean up whitespace
  text = text.replace(/\n\s*\n\s*\n/g, "\n\n"); // Multiple newlines to double
  text = text.replace(/[ \t]+/g, " "); // Multiple spaces to single
  text = text.replace(/^\s+|\s+$/gm, ""); // Trim lines
  text = text.replace(/^\s+|\s+$/g, ""); // Trim entire text

  return text;
}

const sendMail = async (options: EmailOptions): Promise<void> => {
  const logPrefix = `[EMAIL ${new Date().toISOString()}]`;

  console.log(`${logPrefix} ========================================`);
  console.log(`${logPrefix} Starting email send process`);
  console.log(`${logPrefix} Recipient: ${options.email}`);
  console.log(`${logPrefix} Subject: ${options.subject}`);
  console.log(`${logPrefix} Template: ${options.template}`);

  // Validate email configuration
  console.log(`${logPrefix} [STEP 1] Loading email configuration...`);
  const smtpHost = process.env.SMTP_HOST;
  const smtpMail = process.env.SMTP_MAIL;
  const smtpPassword = process.env.SMTP_PASSWORD;
  // Use MAIL if set, otherwise fallback to SMTP_MAIL (they should be the same)
  const fromEmail = process.env.MAIL || smtpMail;

  console.log(`${logPrefix} [STEP 1] Configuration loaded:`);
  console.log(
    `${logPrefix}   - SMTP_HOST: ${smtpHost ? "✓ Set" : "✗ Missing"}`
  );
  console.log(
    `${logPrefix}   - SMTP_MAIL: ${smtpMail ? "✓ Set" : "✗ Missing"}`
  );
  console.log(
    `${logPrefix}   - SMTP_PASSWORD: ${
      smtpPassword ? "✓ Set (" + smtpPassword.length + " chars)" : "✗ Missing"
    }`
  );
  console.log(
    `${logPrefix}   - MAIL (from): ${fromEmail || "Not set, using SMTP_MAIL"}`
  );
  console.log(
    `${logPrefix}   - SMTP_PORT: ${process.env.SMTP_PORT || "587 (default)"}`
  );
  console.log(
    `${logPrefix}   - SMTP_SERVICE: ${process.env.SMTP_SERVICE || "Not set"}`
  );
  console.log(
    `${logPrefix}   - NODE_ENV: ${process.env.NODE_ENV || "Not set"}`
  );

  if (!smtpHost || !smtpMail || !smtpPassword) {
    const missing = [];
    if (!smtpHost) missing.push("SMTP_HOST");
    if (!smtpMail) missing.push("SMTP_MAIL");
    if (!smtpPassword) missing.push("SMTP_PASSWORD");
    const errorMsg = `Missing required email configuration: ${missing.join(
      ", "
    )}. Please check your environment variables.`;
    console.error(`${logPrefix} [STEP 1] ✗ VALIDATION FAILED: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  console.log(`${logPrefix} [STEP 1] ✓ Configuration validated successfully`);
  console.log(
    `${logPrefix} [STEP 1] SMTP details - Host: ${smtpHost}, Port: ${
      process.env.SMTP_PORT || "587"
    }, User: ${smtpMail}`
  );

  // Gmail app passwords are 16 characters without spaces
  // Remove spaces from password if present (common when copying from Gmail)
  console.log(`${logPrefix} [STEP 2] Processing password...`);
  const originalPasswordLength = smtpPassword.length;
  const cleanedPassword = smtpPassword.replace(/\s+/g, "");
  const spacesRemoved = originalPasswordLength - cleanedPassword.length;
  if (spacesRemoved > 0) {
    console.log(
      `${logPrefix} [STEP 2] Removed ${spacesRemoved} space(s) from password`
    );
  }
  console.log(
    `${logPrefix} [STEP 2] ✓ Password processed (${cleanedPassword.length} chars)`
  );

  // Determine if we should use secure connection (port 465)
  console.log(`${logPrefix} [STEP 3] Determining connection type...`);
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const isSecure = smtpPort === 465;
  console.log(
    `${logPrefix} [STEP 3] Port: ${smtpPort}, Secure (SSL): ${isSecure}, Connection type: ${
      isSecure ? "SSL/TLS (port 465)" : "STARTTLS (port 587)"
    }`
  );

  // Build transporter config - use explicit host/port (not service) for better compatibility
  // When using explicit host (like smtp.gmail.com), don't use service - it can cause conflicts
  // For Gmail specifically, we need to use STARTTLS on port 587
  console.log(`${logPrefix} [STEP 4] Building transporter configuration...`);

  // Extract domain from email for the name property (helps with SMTP identification)
  // This is important for custom SMTP servers - helps with deliverability
  const emailDomain =
    fromEmail?.split("@")[1] || smtpMail?.split("@")[1] || "tracesys";
  const transporterName = process.env.SMTP_NAME || emailDomain;
  console.log(
    `${logPrefix} [STEP 4] Transporter name (SMTP identification): ${transporterName}`
  );

  const transporterConfig: any = {
    name: transporterName, // Important for SMTP identification - helps with deliverability
    host: smtpHost,
    port: smtpPort,
    secure: isSecure, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: {
      user: smtpMail,
      pass: cleanedPassword,
    },
    // TLS configuration for Gmail
    // Port 587 uses STARTTLS, port 465 uses SSL/TLS
    ...(isSecure
      ? {
          // For port 465 (SSL/TLS)
          tls: {
            rejectUnauthorized: false, // Gmail certs are valid, but this ensures connection
          },
        }
      : {
          // For port 587 (STARTTLS)
          requireTLS: true, // Require TLS upgrade
          tls: {
            rejectUnauthorized: false,
          },
        }),
    connectionTimeout: 30000, // 30 seconds - increased for reliability
    greetingTimeout: 30000,
    socketTimeout: 30000,
    // Add debug option if needed
    debug: process.env.SMTP_DEBUG === "true",
    // Ensure proper encoding for email content
    // This helps prevent quoted-printable encoding issues
    pool: false, // Don't use connection pooling for better compatibility
  };

  console.log(`${logPrefix} [STEP 4] Transporter config:`);
  console.log(`${logPrefix}   - Name: ${transporterConfig.name}`);
  console.log(`${logPrefix}   - Host: ${transporterConfig.host}`);
  console.log(`${logPrefix}   - Port: ${transporterConfig.port}`);
  console.log(`${logPrefix}   - Secure: ${transporterConfig.secure}`);
  console.log(`${logPrefix}   - Auth user: ${transporterConfig.auth.user}`);
  console.log(
    `${logPrefix}   - RequireTLS: ${transporterConfig.requireTLS || false}`
  );
  console.log(
    `${logPrefix}   - TLS rejectUnauthorized: ${
      transporterConfig.tls?.rejectUnauthorized || false
    }`
  );
  console.log(
    `${logPrefix}   - Timeouts: ${transporterConfig.connectionTimeout}ms`
  );
  console.log(`${logPrefix}   - Debug: ${transporterConfig.debug || false}`);

  // Note: We explicitly do NOT add 'service' when using explicit host/port
  // Gmail works better with explicit host/port configuration

  console.log(`${logPrefix} [STEP 4] Creating transporter...`);
  const transporter: Transporter =
    nodemailer.createTransport(transporterConfig);
  console.log(`${logPrefix} [STEP 4] ✓ Transporter created successfully`);

  // Verify transporter configuration (with timeout and better error handling)
  console.log(`${logPrefix} [STEP 5] Verifying SMTP connection...`);
  const shouldVerify = process.env.SMTP_VERIFY !== "false"; // Allow disabling verify in production
  console.log(`${logPrefix} [STEP 5] Verification enabled: ${shouldVerify}`);

  if (shouldVerify) {
    try {
      console.log(
        `${logPrefix} [STEP 5] Attempting to verify connection to ${smtpHost}:${smtpPort}...`
      );
      const verifyStartTime = Date.now();
      await Promise.race([
        transporter.verify(),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(new Error("SMTP verification timeout after 10 seconds")),
            10000
          )
        ),
      ]);
      const verifyDuration = Date.now() - verifyStartTime;
      console.log(
        `${logPrefix} [STEP 5] ✓ SMTP connection verified successfully (took ${verifyDuration}ms)`
      );
      console.log(`${logPrefix} [STEP 5] Server is ready to accept messages`);
    } catch (error) {
      const errorMsg = `SMTP verification failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      console.error(`${logPrefix} [STEP 5] ✗ VERIFICATION FAILED: ${errorMsg}`);
      if (error instanceof Error) {
        console.error(`${logPrefix} [STEP 5] Error details:`, error);
        if ((error as any).code) {
          console.error(
            `${logPrefix} [STEP 5] Error code: ${(error as any).code}`
          );
        }
      }
      // Don't throw - continue anyway as verification can fail in some production environments
      // but actual sending might still work
      console.warn(
        `${logPrefix} [STEP 5] ⚠ Continuing despite verification failure (will attempt to send anyway)...`
      );
    }
  } else {
    console.log(
      `${logPrefix} [STEP 5] ⚠ SMTP verification skipped (SMTP_VERIFY=false)`
    );
  }

  console.log(`${logPrefix} [STEP 6] Preparing email content...`);
  const {
    email,
    subject,
    template,
    data,
    html: directHtml,
    text: directText,
  } = options;

  let html: string;
  let textVersion: string;

  // If direct html/text provided, use those (no template engine)
  if (directHtml || directText) {
    console.log(
      `${logPrefix} [STEP 6] Using direct content (no template engine)`
    );
    html = directHtml || "";
    textVersion =
      directText || (directHtml ? extractTextFromHTML(directHtml) : "");
    console.log(`${logPrefix} [STEP 6] HTML length: ${html.length} chars`);
    console.log(
      `${logPrefix} [STEP 6] Text length: ${textVersion.length} chars`
    );
  } else if (template) {
    // Use template engine if template is provided
    console.log(`${logPrefix} [STEP 6] Loading email template...`);
    console.log(`${logPrefix} [STEP 6] Template name: ${template}`);
    console.log(
      `${logPrefix} [STEP 6] Template data keys: ${
        data ? Object.keys(data).join(", ") : "none"
      }`
    );

    const projectRoot = process.cwd();
    console.log(`${logPrefix} [STEP 6] Project root: ${projectRoot}`);

    const candidateMailDirs = [
      path.join(projectRoot, "mails"),
      path.join(projectRoot, "src", "mails"),
      path.join(projectRoot, "dist", "mails"),
    ];
    console.log(`${logPrefix} [STEP 6] Searching for template in:`);
    candidateMailDirs.forEach((dir, index) => {
      const exists = fs.existsSync(dir);
      console.log(
        `${logPrefix} [STEP 6]   ${index + 1}. ${dir} ${exists ? "✓" : "✗"}`
      );
    });

    const mailsDir =
      candidateMailDirs.find((p) => fs.existsSync(p)) || candidateMailDirs[0];
    const templatePath = path.join(mailsDir, template);

    console.log(`${logPrefix} [STEP 6] Selected mail directory: ${mailsDir}`);
    console.log(`${logPrefix} [STEP 6] Full template path: ${templatePath}`);
    console.log(
      `${logPrefix} [STEP 6] Template exists: ${fs.existsSync(templatePath)}`
    );

    if (!fs.existsSync(templatePath)) {
      const errorMsg = `Email template not found: ${templatePath}. Searched in: ${candidateMailDirs.join(
        ", "
      )}`;
      console.error(`${logPrefix} [STEP 6] ✗ TEMPLATE NOT FOUND: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log(
      `${logPrefix} [STEP 6] ✓ Template found, rendering with EJS...`
    );

    try {
      const renderStartTime = Date.now();
      html = await ejs.renderFile(templatePath, data || {});
      const renderDuration = Date.now() - renderStartTime;
      console.log(
        `${logPrefix} [STEP 6] ✓ Template rendered successfully (took ${renderDuration}ms)`
      );
      console.log(
        `${logPrefix} [STEP 6] Rendered HTML length: ${html.length} characters`
      );
      // Check if HTML has proper structure
      const hasDoctype = html.includes("<!DOCTYPE");
      const hasHtmlTag = html.includes("<html");
      const hasBodyTag = html.includes("<body");
      console.log(
        `${logPrefix} [STEP 6] HTML structure check - DOCTYPE: ${hasDoctype}, HTML tag: ${hasHtmlTag}, Body tag: ${hasBodyTag}`
      );
      // Log first 200 chars to verify content
      console.log(
        `${logPrefix} [STEP 6] HTML preview (first 200 chars): ${html.substring(
          0,
          200
        )}...`
      );
    } catch (error) {
      const errorMsg = `Failed to render email template: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      console.error(`${logPrefix} [STEP 6] ✗ RENDER FAILED: ${errorMsg}`);
      console.error(`${logPrefix} [STEP 6] Error details:`, error);
      if (error instanceof Error) {
        console.error(`${logPrefix} [STEP 6] Error stack:`, error.stack);
      }
      throw new Error(errorMsg);
    }

    // Extract text version from HTML template
    textVersion = extractTextFromHTML(html);
  } else {
    throw new Error("Either template or html/text content must be provided");
  }

  console.log(`${logPrefix} [STEP 7] Preparing email headers and metadata...`);

  // Get sender name from environment or use default
  const senderName = process.env.MAIL_SENDER_NAME || "TracèSys";
  console.log(`${logPrefix} [STEP 7] Sender name: ${senderName}`);

  // Ensure fromEmail is defined (it should be from validation above, but TypeScript needs this)
  if (!fromEmail) {
    console.error(
      `${logPrefix} [STEP 7] ✗ From email address is not configured`
    );
    throw new Error("From email address is not configured");
  }

  // Format from address with name for better deliverability
  const fromAddress = `${senderName} <${fromEmail}>`;
  console.log(`${logPrefix} [STEP 7] From address: ${fromAddress}`);
  console.log(`${logPrefix} [STEP 7] To address: ${email}`);

  // Build headers object for better deliverability
  // Transactional emails (invitations) should NOT have marketing headers
  // NOTE: Don't set Content-Type in headers - nodemailer handles this automatically
  // Setting it manually can cause encoding issues
  const headers: Record<string, string> = {
    "X-Mailer": "TracèSys",
    "Reply-To": fromEmail,
    "MIME-Version": "1.0",
    Date: new Date().toUTCString(),
    // Add Return-Path for better deliverability (should match from address)
    "Return-Path": fromEmail,
  };

  console.log(
    `${logPrefix} [STEP 7] Base headers:`,
    Object.keys(headers).join(", ")
  );

  // Only add List-Unsubscribe headers for marketing emails (not transactional)
  // Invitations are transactional, so we skip these headers
  // If you need them for marketing emails, add a flag to EmailOptions
  const isMarketingEmail = process.env.ENABLE_MARKETING_HEADERS === "true";
  console.log(
    `${logPrefix} [STEP 7] Marketing headers enabled: ${isMarketingEmail}`
  );

  if (isMarketingEmail) {
    const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL;
    if (clientUrl) {
      headers["List-Unsubscribe"] = clientUrl;
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
      console.log(`${logPrefix} [STEP 7] Added List-Unsubscribe headers`);
    } else {
      console.log(
        `${logPrefix} [STEP 7] No CLIENT_URL/FRONTEND_URL found, skipping List-Unsubscribe`
      );
    }
  }

  // DO NOT add "Precedence: bulk" - it triggers spam filters for transactional emails
  console.log(
    `${logPrefix} [STEP 7] ✓ Headers prepared (${
      Object.keys(headers).length
    } headers)`
  );

  console.log(`${logPrefix} [STEP 8] Building email message...`);

  // Text version already prepared in STEP 6
  if (!textVersion) {
    console.log(
      `${logPrefix} [STEP 8] Extracting plain text version from HTML...`
    );
    const textStartTime = Date.now();
    textVersion = extractTextFromHTML(html);
    const textDuration = Date.now() - textStartTime;
    console.log(
      `${logPrefix} [STEP 8] ✓ Text version extracted (${textVersion.length} chars, took ${textDuration}ms)`
    );
  } else {
    console.log(
      `${logPrefix} [STEP 8] Using provided text version (${textVersion.length} chars)`
    );
  }

  // Prepare attachments info
  const attachmentsCount = options.attachments?.length || 0;
  console.log(`${logPrefix} [STEP 8] Attachments: ${attachmentsCount}`);
  if (attachmentsCount > 0) {
    options.attachments?.forEach((att, index) => {
      console.log(
        `${logPrefix} [STEP 8]   ${index + 1}. ${att.filename} (${att.path})`
      );
    });
  }

  // Add proper email headers for better deliverability
  // CRITICAL: Always include 'from' field - required for non-Gmail SMTP servers
  // NOTE: nodemailer automatically creates multipart/alternative when both html and text are provided
  // It handles Content-Type and encoding automatically - don't override
  const mailOptions: any = {
    from: fromAddress, // Always set - required for custom SMTP
    to: email,
    subject,
    html, // nodemailer automatically creates multipart/alternative with text
    text: textVersion, // Plain text fallback
    attachments: options.attachments,
    headers,
    // Add envelope for better authentication
    envelope: {
      from: fromEmail, // Use plain email for envelope
      to: email,
    },
  };

  // Ensure 'from' is always set (fallback if somehow undefined)
  // CRITICAL: Custom SMTP servers require 'from' field, Gmail might work without it
  if (!mailOptions.from) {
    console.warn(
      `${logPrefix} [STEP 8] ⚠ 'from' field was missing, setting fallback`
    );
    mailOptions.from = fromEmail || smtpMail;
  }

  console.log(
    `${logPrefix} [STEP 8] From field: ${mailOptions.from} (REQUIRED for custom SMTP)`
  );
  console.log(`${logPrefix} [STEP 8] ✓ Email message built`);
  console.log(`${logPrefix} [STEP 8] Message summary:`);
  console.log(`${logPrefix}   - From: ${mailOptions.from}`);
  console.log(`${logPrefix}   - To: ${mailOptions.to}`);
  console.log(`${logPrefix}   - Subject: ${mailOptions.subject}`);
  console.log(
    `${logPrefix}   - HTML size: ${mailOptions.html?.length || 0} chars`
  );
  console.log(
    `${logPrefix}   - Text size: ${mailOptions.text?.length || 0} chars`
  );
  console.log(`${logPrefix}   - Attachments: ${attachmentsCount}`);
  console.log(
    `${logPrefix}   - Headers: ${Object.keys(mailOptions.headers).length}`
  );

  console.log(`${logPrefix} [STEP 9] Sending email via SMTP...`);
  console.log(`${logPrefix} [STEP 9] Connecting to ${smtpHost}:${smtpPort}...`);

  try {
    const sendStartTime = Date.now();
    const info = await transporter.sendMail(mailOptions);
    const sendDuration = Date.now() - sendStartTime;

    const messageId = (info as any).messageId || "unknown";
    const response = (info as any).response || "unknown";
    const accepted = (info as any).accepted || [];
    const rejected = (info as any).rejected || [];

    console.log(`${logPrefix} [STEP 9] ✓✓✓ EMAIL SENT SUCCESSFULLY ✓✓✓`);
    console.log(`${logPrefix} [STEP 9] Send duration: ${sendDuration}ms`);
    console.log(`${logPrefix} [STEP 9] Message ID: ${messageId}`);
    console.log(
      `${logPrefix} [STEP 9] SMTP Response: ${JSON.stringify(response)}`
    );
    console.log(
      `${logPrefix} [STEP 9] Accepted recipients: ${
        accepted.length > 0 ? accepted.join(", ") : "none"
      }`
    );
    console.log(
      `${logPrefix} [STEP 9] Rejected recipients: ${
        rejected.length > 0 ? rejected.join(", ") : "none"
      }`
    );

    if ((info as any).pending) {
      console.log(
        `${logPrefix} [STEP 9] Pending recipients: ${(info as any).pending.join(
          ", "
        )}`
      );
    }

    // IMPORTANT: Deliverability check reminders
    console.log(`${logPrefix} [STEP 9] ⚠ DELIVERABILITY NOTES:`);
    console.log(`${logPrefix} [STEP 9]   - Email accepted by SMTP server`);
    console.log(
      `${logPrefix} [STEP 9]   - If recipient doesn't receive it, check:`
    );
    console.log(
      `${logPrefix} [STEP 9]     1. Sender's Gmail Sent folder (should appear there)`
    );
    console.log(`${logPrefix} [STEP 9]     2. Recipient's Spam/Junk folder`);
    console.log(`${logPrefix} [STEP 9]     3. Gmail may be filtering silently`);
    console.log(
      `${logPrefix} [STEP 9]     4. Check Gmail account security settings`
    );
    console.log(
      `${logPrefix} [STEP 9]     5. Message ID for tracking: ${messageId}`
    );

    console.log(`${logPrefix} ========================================`);
  } catch (error) {
    const errorMsg = `Failed to send email: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(`${logPrefix} [STEP 9] ✗✗✗ EMAIL SEND FAILED ✗✗✗`);
    console.error(`${logPrefix} [STEP 9] Error: ${errorMsg}`);

    if (error instanceof Error) {
      console.error(`${logPrefix} [STEP 9] Error name: ${error.name}`);
      console.error(`${logPrefix} [STEP 9] Error message: ${error.message}`);
      console.error(`${logPrefix} [STEP 9] Error stack:`);
      console.error(error.stack);

      // Log nodemailer specific error details
      if ((error as any).code) {
        console.error(
          `${logPrefix} [STEP 9] Error code: ${(error as any).code}`
        );
      }
      if ((error as any).command) {
        console.error(
          `${logPrefix} [STEP 9] Failed SMTP command: ${(error as any).command}`
        );
      }
      if ((error as any).response) {
        console.error(
          `${logPrefix} [STEP 9] SMTP response: ${(error as any).response}`
        );
      }
      if ((error as any).responseCode) {
        console.error(
          `${logPrefix} [STEP 9] SMTP response code: ${
            (error as any).responseCode
          }`
        );
      }
      if ((error as any).errno) {
        console.error(
          `${logPrefix} [STEP 9] System error number: ${(error as any).errno}`
        );
      }
      if ((error as any).syscall) {
        console.error(
          `${logPrefix} [STEP 9] System call: ${(error as any).syscall}`
        );
      }
      if ((error as any).hostname) {
        console.error(
          `${logPrefix} [STEP 9] Hostname: ${(error as any).hostname}`
        );
      }
    } else {
      console.error(
        `${logPrefix} [STEP 9] Unknown error type:`,
        typeof error,
        error
      );
    }

    console.error(`${logPrefix} ========================================`);
    throw error;
  }
};

export default sendMail;
