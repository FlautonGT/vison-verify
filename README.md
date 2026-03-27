## Vison Verify

Hosted verification web app untuk flow eKYC `verify.vison.id`.

## Environment

Copy `.env.example` menjadi `.env` lalu sesuaikan:

```env
PORT=3002
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://api.vison.id
```

- `NEXT_PUBLIC_API_BASE_URL` dipakai browser client untuk call session bootstrap, progress, dan completion ke `api.vison.id`.
- `PORT` dipakai saat menjalankan app secara standalone atau lewat PM2.

## Development

```bash
npm install
npm run dev
```

Buka `http://localhost:3002` atau port yang Anda set di env.

## Production

```bash
npm run build
npm run start
```

## Runtime Flow

- Merchant create session ke `api.vison.id`.
- API mengembalikan `verificationUrl` ke `verify.vison.id/verify/{sessionId}?token=...`.
- Hosted app bootstrap session ke `api.vison.id`.
- Hosted app sync progress dan completion kembali ke `api.vison.id`.

## Commands

```bash
npm run lint
npm run build
```
