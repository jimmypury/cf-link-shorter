const TOKEN = "your_secret_token"; // Your authentication token
const SHORT_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // Short code character set
const SHORT_CODE_LENGTH = 6; // Short code length
const GENERATE_MAX_TRY = 5; // Maximum attempts to generate a unique short code

function generateShortCode(length = SHORT_CODE_LENGTH) {
  const chars = SHORT_CHARS;
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function generateUniqueShortCode(env, length = SHORT_CODE_LENGTH, maxTry = GENERATE_MAX_TRY) {
  const kv = env.short_link; // KV variable mapping is short_link
  for (let i = 0; i < maxTry; i++) {
    const code = generateShortCode(length);
    const exists = await kv.get(code);
    if (!exists) return code;
  }
  return null;
}

export default {
  async fetch(request, env) {
    const kv = env.short_link;
    const url = new URL(request.url);
    // Static pages /index.html or /
    if (
      request.method === "GET" &&
      (url.pathname === "/index.html" || url.pathname === "/")
    ) {
      // Return index.html content
      return new Response(
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>URL Shortener</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f6f8fa; margin: 0; padding: 0; }
    .container { max-width: 400px; margin: 60px auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 32px; }
    h2 { text-align: center; color: #333; }
    .container input[type="url"], .container input[type="text"], .container button { width: 100%; box-sizing: border-box; }
    input[type="url"], input[type="text"] { padding: 10px; margin: 16px 0; border: 1px solid #ccc; border-radius: 4px; }
    button { padding: 10px; background: #0078e7; color: #fff; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
    button:hover { background: #005bb5; }
    .result { margin-top: 24px; text-align: center; }
    .error { color: #d32f2f; margin-top: 16px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h2>URL Shortener</h2>
    <form id="shorten-form">
      <input type="url" id="long-url" placeholder="Enter long URL, e.g. https://example.com" required>
      <input type="text" id="token" placeholder="Enter Token" required style="margin-bottom: 16px;">
      <button type="submit">Generate Short URL</button>
    </form>
    <div class="result" id="result"></div>
    <div class="error" id="error"></div>
  </div>
  <script>
    const form = document.getElementById('shorten-form');
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      resultDiv.textContent = '';
      errorDiv.textContent = '';
      const longUrl = document.getElementById('long-url').value.trim();
      const token = document.getElementById('token').value.trim();
      if (!longUrl || !token) return;
      try {
        const res = await fetch('/api/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: longUrl, token })
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Request failed');
        }
        const data = await res.json();
        const shortUrl = \`\${window.location.origin}/\${data.short}\`;
        resultDiv.innerHTML = \`Short URL: <a href="\${shortUrl}" target="_blank">\${shortUrl}</a>\`;
      } catch (err) {
        errorDiv.textContent = err.message || 'Generation failed';
      }
    });
  </script>
</body>
</html>`,
        {
          headers: { "content-type": "text/html; charset=UTF-8" },
        }
      );
    }
    // API endpoint to generate short links
    if (
      request.method === "POST" &&
      (url.pathname === "/api/" || url.pathname === "/api/shorten")
    ) {
      try {
        const { url: longUrl, token } = await request.json();
        if (!token || token !== TOKEN) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (!longUrl || typeof longUrl !== "string") {
          return new Response("Invalid URL", { status: 400 });
        }
        // Generate a unique short code
        const shortCode = await generateUniqueShortCode(env);
        if (!shortCode) {
          return new Response("Failed to generate unique short code", {
            status: 500,
          });
        }
        await kv.put(shortCode, longUrl);
        return new Response(JSON.stringify({ short: shortCode }), {
          headers: { "content-type": "application/json" },
        });
      } catch {
        return new Response("Bad Request", { status: 400 });
      }
    }
    // API endpoint to delete short links
    // Support deletion via short code or complete short URL
    if (
      request.method === "DELETE" &&
      (url.pathname === "/api/" || url.pathname === "/api/shorten")
    ) {
      try {
        let shortCode = null;
        let token = null;
        const contentType = request.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const body = await request.json();
          token = body.token;
          if (body.short) {
            shortCode = body.short;
          } else if (body.url) {
            // Support providing complete short URL
            try {
              const u = new URL(body.url);
              shortCode = u.pathname.replace(/^\//, "");
            } catch {}
          }
        } else if (url.searchParams.has("short") || url.searchParams.has("url")) {
          token = url.searchParams.get("token");
          if (url.searchParams.has("short")) {
            shortCode = url.searchParams.get("short");
          } else if (url.searchParams.has("url")) {
            try {
              const u = new URL(url.searchParams.get("url"));
              shortCode = u.pathname.replace(/^\//, "");
            } catch {}
          }
        }
        if (!token || token !== TOKEN) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (!shortCode) {
          return new Response("Missing short code", { status: 400 });
        }
        await kv.delete(shortCode);
        return new Response(JSON.stringify({ success: true }), {
          headers: { "content-type": "application/json" },
        });
      } catch {
        return new Response("Bad Request", { status: 400 });
      }
    }
    // Redirection
    if (
      request.method === "GET" &&
      url.pathname.length > 1 &&
      !url.pathname.startsWith("/api")
    ) {
      const shortCode = url.pathname.slice(1);
      const longUrl = await kv.get(shortCode);
      if (longUrl) {
        return Response.redirect(longUrl, 302);
      } else {
        return new Response("Not found", { status: 404 });
      }
    }
    // Other requests
    return new Response("Cloudflare Worker Short Link Service", {
      status: 200,
    });
  },
};
