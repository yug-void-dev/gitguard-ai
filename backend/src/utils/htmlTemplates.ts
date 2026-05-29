/**
 * @file src/utils/htmlTemplates.ts
 * @description Centralized templates for security warning pages and HTML responses.
 */

/**
 * Returns a beautifully styled, premium-grade HTML warning page for untrusted redirects.
 *
 * @param targetUrl The fully validated target URL to proceed to
 * @param hostname The target domain to display warning for
 */
export function getSecurityWarningHtml(targetUrl: string, hostname: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Warning - Leaving GitGuard AI</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f172a;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      background: rgba(30, 41, 59, 0.8);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 32px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    h1 {
      color: #f43f5e;
      font-size: 24px;
      margin-top: 0;
    }
    p {
      color: #94a3b8;
      font-size: 16px;
      line-height: 1.6;
    }
    .url-display {
      background: #020617;
      padding: 12px;
      border-radius: 8px;
      font-family: monospace;
      word-break: break-all;
      color: #38bdf8;
      margin: 20px 0;
      border: 1px solid #1e293b;
    }
    .actions {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-top: 24px;
    }
    .btn {
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s ease;
      cursor: pointer;
      display: inline-block;
    }
    .btn-allow {
      background: #f43f5e;
      color: white;
      border: none;
    }
    .btn-allow:hover {
      background: #e11d48;
      transform: translateY(-2px);
    }
    .btn-deny {
      background: #334155;
      color: #cbd5e1;
      border: none;
    }
    .btn-deny:hover {
      background: #475569;
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>⚠️ Security Warning</h1>
    <p>You are about to leave GitGuard AI and be redirected to an untrusted external site.</p>
    <p>Please verify the domain before continuing:</p>
    <div class="url-display">${hostname}</div>
    <p>Full URL: <span style="word-break: break-all; color: #64748b;">${targetUrl}</span></p>
    <div class="actions">
      <a href="${targetUrl}" class="btn btn-allow" rel="noopener noreferrer nofollow">Accept and Proceed</a>
      <button onclick="window.close();" class="btn btn-deny">Deny and Close</button>
    </div>
  </div>
</body>
</html>
  `.trim();
}
