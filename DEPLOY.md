# Deploying ExamTyper

Two ways to put this on a server: one VPS with Docker Compose, which is
the cheapest thing that works, and a set of managed free tiers, which is the
cheapest thing that does not need a server.

---

## The first: one VPS with Docker Compose

This is the recommended path. A small VPS runs everything — the database,
the API and the interface — and Caddy or Nginx puts HTTPS in front of it.

### What you need

- A VPS with 1 vCPU, 1 GB of RAM and 20 GB of disk. The free tiers from
  Hetzner, DigitalOcean and Vultr all have one.
- A domain name pointing at the server's address.
- Docker Engine and the Compose plugin on the server.

### 1. Put the code on the server

```bash
git clone <this repository> /opt/examtyper
cd /opt/examtyper
```

### 2. Write the environment

```bash
cp .env.example .env
```

Then edit `.env`. These are the ones that matter:

```bash
# The environment. In "prod" the test payment gateway refuses to take a
# payment, whatever else is configured.
APP_ENV=prod

# The signing key for the access tokens. Generate a real one:
#   openssl rand -base64 48
JWT_SECRET=<a long random string, at least 32 characters>

# The origins the API accepts. The interface's own address goes here.
APP_CORS_ALLOWED_ORIGINS=https://your-domain

# Where the links in the emails point.
FRONTEND_BASE_URL=https://your-domain

# The database. The password must match POSTGRES_PASSWORD below.
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/examtyper
SPRING_DATASOURCE_USERNAME=examtyper
SPRING_DATASOURCE_PASSWORD=<a long random password>

# The ports the interface and the API are published on.
FRONTEND_PORT=3000
BACKEND_PORT=8080
```

Set `SEED_ENABLED=false` unless you want the demo accounts. If you do
want them, change the three demo passwords first — the defaults are
published in the README.

### 3. Bring it up

```bash
docker compose up -d --build
docker compose ps
```

Wait for the backend to report healthy. The Compose file gates the
interface on the backend's health check, so the interface only starts once
the API is answering.

Check it:

```bash
curl -fsS http://localhost:8080/actuator/health
```

### 4. Put HTTPS in front of it

Caddy is the simplest, because it gets the certificate itself.

```bash
sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`:

```
your-domain {
    handle /api/* {
        reverse_proxy localhost:8080
    }
    handle /actuator/* {
        reverse_proxy localhost:8080
    }
    handle {
        reverse_proxy localhost:3000
    }
}
```

```bash
sudo systemctl reload caddy
```

Caddy asks Let's Encrypt for a certificate and renews it on its own. If you
would rather use Nginx, the configuration is in
`frontend/nginx.conf` and the certificates come from Certbot.

### 5. Back up the database

This is the part that is easy to forget and expensive to regret.

```bash
sudo mkdir -p /opt/examtyper/backups
sudo tee /usr/local/bin/examtyper-backup > /dev/null <<'SCRIPT'
#!/bin/bash
set -euo pipefail
cd /opt/examtyper
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p backups
docker compose exec -T postgres pg_dump -U examtyper examtyper \
  | gzip > "backups/examtyper-$STAMP.sql.gz"
# Keep a month of them.
find backups -name 'examtyper-*.sql.gz' -mtime +30 -delete
SCRIPT
sudo chmod +x /usr/local/bin/examtyper-backup
```

Then run it every night:

```bash
sudo tee /etc/cron.daily/examtyper-backup > /dev/null <<'CRON'
#!/bin/sh
/usr/local/bin/examtyper-backup
CRON
sudo chmod +x /etc/cron.daily/examtyper-backup
```

**Copy the backups off the server.** A backup on the same disk as the
database is not a backup. `rsync` or `rclone` to another machine, or to
object storage, once a week is enough.

To restore:

```bash
gunzip -c backups/examtyper-20260101-030000.sql.gz \
  | docker compose exec -T postgres psql -U examtyper examtyper
```

### 6. Keep it up to date

```bash
cd /opt/examtyper
git pull
docker compose up -d --build
```

The Flyway migrations run on the start-up, before the application accepts
a request. **Take a backup before an upgrade.** A migration that fails
halfway leaves the schema in a state the old code does not expect.

---

## The second: managed free tiers

No server to maintain, and the bills stay at zero while the free tiers
last. The catch is that the database and the API are on different
providers, so the database needs to be reachable from outside — which
means a public address, and therefore a firewall and a strong password.

### The parts

| Part | Where | What it costs |
|---|---|---|
| The interface | Vercel, Netlify or Cloudflare Pages | Free |
| The API | Render, Railway, Fly.io or a small VPS | Free tier, with limits |
| The database | Neon, Supabase or Aiven | Free tier |
| HTTPS | Whoever fronts the interface | Free |

### The database

Neon gives a PostgreSQL with a public connection string and a generous
free tier.

1. Create a project and a database.
2. Copy the connection string. It looks like
   `postgresql://user:password@host/dbname?sslmode=require`.
3. Set the environment on the API:

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://host/dbname?sslmode=require
SPRING_DATASOURCE_USERNAME=user
SPRING_DATASOURCE_PASSWORD=password
```

**The password must be URL-encoded** if it contains anything other than
letters and digits.

4. Turn off the connection poolinger's transaction mode. The application
   uses a connection pool, and the pooler must not wrap the transaction.

### The API

Render, Railway and Fly.io all run a container.

1. Point the build at `backend/Dockerfile`.
2. Set the environment:

```bash
APP_ENV=prod
JWT_SECRET=<a long random string>
APP_CORS_ALLOWED_ORIGINS=https://your-frontend
RAZORPAY... # not needed
```

3. Give it a persistent volume only if you need the container's own
   filesystem — you do not, because the database is elsewhere.

The API needs `APP_CORS_ALLOWED_ORIGINS` set to the interface's exact
address, or the browser will refuse the requests.

### The interface

Vercel, Netlify and Cloudflare Pages all build from the `frontend/`
directory.

1. The build command is `npm run build` and the output directory is
   `dist`.
2. Set `VITE_API_BASE_URL` to the API's address, **including the
   `https://`**. The value is baked into the bundle at build time, so it
   must be set before the build, not after.
3. If the API's address is not known until the deployment is created, build
   it in two steps: deploy once, read the address, set the variable and
   deploy again.

### What this path costs you

- The free tiers have limits, and the limits change. Check them before you
  rely on them.
- The database is on the public internet. The password has to be long, and
  the firewall has to allow only the API's address if the provider lets
  you set one.
- The API's free tier sleeps. The first request after a sleep takes a few
  seconds, which is enough to time out a health check.

---

## The things that bite

### The `X-Forwarded-For` header

The rate limiter counts by the user's address when there is no session. It
only trusts `X-Forwarded-For` outside production, because in production
the proxy overwrites the header and a client that could set it could dodge
the limit. If you put a proxy in front that does **not** overwrite it, set
`APP_ENV` to `prod` — which you should be doing anyway — and every
candidate will be counted by their address.

### The clock

The daily allowance resets at midnight in the **server's** time zone, not
the candidate's. On a VPS in UTC, a candidate in India gets their three
tests at half past five in the morning. If that matters, set the server's
time zone:

```bash
sudo timedatectl set-timezone Asia/Kolkata
```

### The payment mode

`PAYMENTS_MODE=mock` in production gives a free subscription to anybody
who finds the button. The gateway refuses when `APP_ENV=prod`, so this
cannot happen — but the manual mode is a real workflow and needs an
administrator with the time to approve the orders.

### The memory

The default JVM heap is a quarter of the container's memory. On a 1 GB VPS
that is 256 MB, which is enough, but the container's limit and the heap
should be set together if the box is small.

### The logs

The logs are structured, with the request id in every line. The request id
is also returned in the `X-Request-Id` header, so a report of "it broke"
carries the id of the request that broke.

```bash
docker compose logs -f backend | grep 'requestId'
```

---

## A checklist

- [ ] `APP_ENV=prod`
- [ ] `JWT_SECRET` is a long random string, and it is not the default
- [ ] The database password is long and is not the default
- [ ] `APP_CORS_ALLOWED_ORIGINS` is the interface's exact address
- [ ] HTTPS is on, and the plain HTTP port is closed
- [ ] The database is not reachable from the public internet, or its
      firewall and password are strong
- [ ] A backup runs every night, and a copy leaves the server
- [ ] The demo accounts are off, or their passwords have been changed
- [ ] `PAYMENTS_MODE` is `manual` or `disabled`, unless there is a real
      provider
- [ ] The health check is monitored
