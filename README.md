# cf-link-shorter

URL shortener service based on Cloudflare Worker and Cloudflare KV.

## Features

- Generate Short URLs: Support generating short links via web page or API, automatically creating unique short codes.
- URL Redirection: Accessing the short code automatically redirects to the original long URL.
- Delete Short URLs: Support deleting short links via API (supports short code or complete short URL).
- Clean and attractive frontend interface.

## Quick Start

### 1. Deploy to Cloudflare Workers

1. Create a Cloudflare Worker and bind a KV namespace (e.g., `short_link`).
2. Upload the `worker.js` code.
3. Bind the KV in the Worker's environment variables:
   - Variable name: `short_link`
   - Bind to your KV namespace

### 2. Access the Service

- Access the root path `/` or `/index.html` to use the web page for generating short links.
- Access `/<short-code>` to be automatically redirected to the original long URL.

### 3. API Documentation

#### Generate Short URL

- **POST** `/api/`
- Request body: `{ "url": "https://example.com", "token": "your_token" }`
- Response: `{ "short": "xxxxxx" }`

#### Delete Short URL

- **DELETE** `/api/`
- Supports passing `{ "short": "xxxxxx", "token": "your_token" }` or `{ "url": "https://your.domain/xxxxxx", "token": "your_token" }`
- Also supports query parameters `?short=xxxxxx&token=your_token` or `?url=https://your.domain/xxxxxx&token=your_token`
- Response: `{ "success": true }`

#### Short URL Redirection

- **GET** `/{short}`
- Accessing the short code automatically 302 redirects to the original URL

## Frontend Interface

- Access `/` to generate short links through a form, with a clean and attractive page design.

## Dependencies

- Cloudflare Worker
- Cloudflare KV

## To-Do

- [ ] (Important) Add Cloudflare Workers Secrets for token storage.
- [ ] (Important) Add rate limiting to prevent abuse.
- [ ] Add more frontend features, such as link statistics.
- [ ] Add domain authentication.
- [ ] Add a custom domain feature for short links: different short codes for different domains.
- [ ] Add a QR code generation feature. (WebUI only)

## License

MIT
