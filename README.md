# Full-Stack Email Job Scheduler

A full-stack email scheduling application that lets users authenticate with Google, create email campaigns, schedule messages, process them through background workers, and track scheduled and sent emails from a dashboard.

---

## ✨ Features

### Backend

- Express.js REST API
- Google OAuth + JWT authentication
- PostgreSQL database with Prisma
- Redis-backed BullMQ job queue
- Persistent scheduled emails
- Background email worker
- Per-sender hourly rate limiting
- Configurable delay between emails
- SMTP email delivery using Ethereal
- Recovery of pending scheduled emails after restart

### Frontend

- Google sign-in
- Dashboard
- Scheduled Emails table
- Sent Emails table
- Compose Email modal
- Sender selection
- CSV/text recipient upload
- Configurable start time
- Configurable email delay
- Configurable hourly limit

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Queue | BullMQ |
| Cache / Queue Storage | Redis |
| Email | Nodemailer + Ethereal |
| Authentication | Google OAuth + JWT |
| Infrastructure | Docker + Docker Compose |

---

## 🏗️ Architecture

```text
                 ┌─────────────────────┐
                 │       Browser       │
                 │   Next.js Frontend  │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │    Express API      │
                 │ Authentication/API  │
                 └──────┬────────┬─────┘
                        │        │
              ┌─────────┘        └──────────┐
              ▼                             ▼
     ┌─────────────────┐          ┌─────────────────┐
     │   PostgreSQL    │          │      Redis      │
     │     Prisma      │          │    BullMQ       │
     └─────────────────┘          └────────┬────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │  Email Worker   │
                                  │    Nodemailer   │
                                  └────────┬────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │ Ethereal / SMTP │
                                  └─────────────────┘
```

---

## 📁 Project Structure

```text
reachinbox-scheduler/
│
├── backend/
│   ├── prisma/
│   └── src/
│       ├── config/
│       ├── db/
│       ├── middleware/
│       ├── queues/
│       ├── routes/
│       ├── services/
│       ├── utils/
│       └── workers/
│
├── frontend/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── lib/
│       └── types/
│
├── docker-compose.yml
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Install:

- Node.js
- npm
- Docker Desktop
- Google account for OAuth testing

Make sure Docker Desktop is running.

---

## 🔐 Environment Variables

### Backend

Create:

```text
backend/.env
```

using:

```text
backend/.env.example
```

Required configuration includes:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reachinbox
REDIS_HOST=localhost
REDIS_PORT=6379

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

JWT_SECRET=your-jwt-secret

PORT=4000
```

### Frontend

Create:

```text
frontend/.env.local
```

using:

```text
frontend/.env.example
```

Example:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

> Never commit real credentials, passwords, tokens, or `.env` files.

---

## ▶️ Running the Backend

From the project root:

```powershell
docker compose up -d --build
```

Check services:

```powershell
docker compose ps
```

The backend API runs at:

```text
http://localhost:4000
```

Health check:

```text
http://localhost:4000/health
```

View API logs:

```powershell
docker compose logs api
```

View worker logs:

```powershell
docker compose logs worker
```

---

## 🗄️ Database Setup

Synchronize the Prisma schema:

```powershell
docker compose exec api npx prisma db push
```

Seed the default test sender:

```powershell
docker compose exec api npx prisma db seed
```

The seed creates an Ethereal test sender.

---

## 💻 Running the Frontend

Open another terminal:

```powershell
cd frontend
```

Install dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## 🔑 Google OAuth Setup

Google OAuth is used for application login.

Configure a Google OAuth client and add the local application origin:

```text
http://localhost:3000
```

Place the client ID in:

```text
frontend/.env.local
```

and configure the required backend Google credentials in:

```text
backend/.env
```

---

## 📧 Ethereal Email

Ethereal Email is used as a test SMTP service.

It allows the application to send test messages without delivering them to real recipient inboxes.

Run:

```powershell
docker compose exec api npx prisma db seed
```

The seed command creates the default Ethereal sender and displays the Ethereal credentials and preview URL.

After sending an email, use the Ethereal preview URL to inspect the message.

---

# ⚙️ How Scheduling Works

1. User signs in with Google.
2. User opens the dashboard.
3. User creates an email campaign.
4. The campaign stores the sender, recipients, subject, body, start time, delay, and hourly limit.
5. The backend stores campaign information in PostgreSQL.
6. BullMQ creates background jobs using Redis.
7. The worker processes jobs when they become available.
8. Nodemailer sends the email through SMTP.
9. The result is stored in PostgreSQL.
10. The dashboard displays scheduled and sent emails.

---

# 🔄 Persistence After Restart

Scheduled email information is persisted in PostgreSQL rather than being kept only in application memory.

Redis and BullMQ manage background jobs.

This allows the application to recover pending work when services restart.

Example:

```text
Schedule email
      ↓
PostgreSQL
      ↓
Redis / BullMQ
      ↓
Restart services
      ↓
Worker starts again
      ↓
Pending jobs continue processing
```

---

# 🚦 Rate Limiting

Each sender has an hourly email limit.

For example:

```text
Hourly limit = 200 emails
```

The application tracks sending activity per sender and prevents the configured hourly limit from being exceeded.

Redis is used for fast rate-limit tracking while persistent database records provide reliable state management.

---

# ⏱️ Email Delay

The compose form allows a delay between email jobs.

For example:

```text
Delay = 2000 ms
```

means approximately:

```text
2 seconds between emails
```

This prevents a large number of messages from being sent simultaneously.

---

# 🔄 Concurrency

Email sending is separated from the API using BullMQ workers.

```text
Frontend
   ↓
Express API
   ↓
BullMQ / Redis
   ↓
Email Worker
   ↓
SMTP
```

The API remains responsive while email jobs are processed in the background.

Rate limits and configured delays are applied while processing jobs.

---

# 📊 Dashboard

The dashboard provides:

- Scheduled Emails
- Sent Emails
- Sender selection
- Campaign information
- Email status
- Compose New Email
- Logout

---

# 📝 Compose Email

A campaign can contain:

- Sender
- Subject
- Email body
- Recipient list
- Start time
- Delay between emails
- Hourly sending limit

Recipients can be imported using:

- CSV files
- Text files

---

# 🧪 Testing

A typical test flow is:

```text
Google Login
     ↓
Dashboard
     ↓
Compose Email
     ↓
Select Ethereal Sender
     ↓
Upload Recipients
     ↓
Set Start Time
     ↓
Set Delay / Hourly Limit
     ↓
Schedule
     ↓
BullMQ Worker
     ↓
Ethereal Email Preview
```

---

# 🔁 Restart Test

To verify persistence:

### 1. Schedule an email

Create a campaign with a future start time.

### 2. Stop the services

```powershell
docker compose down
```

### 3. Start them again

```powershell
docker compose up -d
```

### 4. Verify

The scheduled campaign remains stored in PostgreSQL and pending work can continue after the services restart.

---

# 📋 Assignment Feature Mapping

| Requirement | Implementation |
|---|---|
| Scheduler | Express + BullMQ |
| Persistence | PostgreSQL + Prisma |
| Background processing | Redis + BullMQ Worker |
| Rate limiting | Per-sender hourly limit |
| Concurrency | Background queue worker |
| Login | Google OAuth |
| Dashboard | Next.js dashboard |
| Compose | Email campaign modal |
| Scheduled emails | Scheduled Emails table |
| Sent emails | Sent Emails table |
| Email testing | Ethereal SMTP |
| Docker | Docker Compose |

---

# ⚠️ Assumptions & Trade-offs

- Ethereal Email is used for testing instead of a production email provider.
- Google OAuth is configured for local development.
- Docker Compose is used to simplify local infrastructure setup.
- PostgreSQL provides persistent application data.
- Redis provides queue and fast rate-limit operations.
- BullMQ separates email processing from API requests.
- Production deployment would require HTTPS, production SMTP credentials, secure secret management, and production OAuth configuration.

---

## 📌 Useful Commands

### Start everything

```powershell
docker compose up -d --build
```

### Stop everything

```powershell
docker compose down
```

### Check services

```powershell
docker compose ps
```

### API logs

```powershell
docker compose logs api
```

### Worker logs

```powershell
docker compose logs worker
```

### Database setup

```powershell
docker compose exec api npx prisma db push
```

### Seed sender

```powershell
docker compose exec api npx prisma db seed
```

### Start frontend

```powershell
cd frontend
npm run dev
```



11. Restarting the services
12. Confirming scheduled data persists
13. Briefly demonstrating rate limiting or delay behavior
