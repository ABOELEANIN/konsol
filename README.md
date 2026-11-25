# ByKonsol

Logistics process orchestration platform for manufacturers and traders in Egypt & MENA.

## Stack
- **Next.js 14** (App Router)
- **Supabase** (PostgreSQL + Auth + Storage + RLS)
- **Tailwind CSS**
- **Vercel** (hosting)

## Modules
- **FIN** – Foreign Inbound
- **LIN** – Local Inbound  
- **FOU** – Foreign Outbound
- **LOU** – Local Outbound

## Development

```bash
npm install
npm run dev
```

Set up `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```
