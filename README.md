**1. Tech Stack**
                         **Backend**
Node.js
Express
TypeScript
PostgreSQL
Prisma ORM
Redis
BullMQ
Nodemailer
Google OAuth
JWT authentication
                         **Frontend**
Next.js
React
TypeScript
Tailwind CSS
Google OAuth
Infrastructure
Docker
Docker Compose


**2. Project Structure**
reachinbox-scheduler/
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── queues/
│   │   ├── workers/
│   │   └── ...
│   │
│   ├── .env
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── types/
│   │
│   ├── .env.local
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
└── README.md


**3. How to Run the Project**
Prerequisites

Install:-
Node.js
npm
Docker Desktop
Google account for OAuth testing

Make sure Docker Desktop is running before starting the backend services.

**4. Backend Setup**

Go to the backend directory:

cd E:\Outbox\reachinbox-scheduler\reachinbox-scheduler\backend

Install dependencies:

npm install

Create:

backend/.env

using .env.example as a template.

Example:

PORT=4000
FRONTEND_URL=http://localhost:3000


JWT_SECRET=change-me-super-secret


DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reachinbox?schema=public"


REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=


GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret


ETHEREAL_USER=
ETHEREAL_PASS=


MIN_DELAY_MS_BETWEEN_EMAILS=2000
MAX_EMAILS_PER_HOUR=200


WORKER_CONCURRENCY=5


5. Start Backend Infrastructure

From the project root:

cd E:\Outbox\reachinbox-scheduler\reachinbox-scheduler

Start Docker services:

docker compose up -d

This starts:

PostgreSQL
Redis
Express API
BullMQ email worker

Check the services:

docker compose ps

All services should show as running.

6. Database Setup

The project uses Prisma with PostgreSQL.

Because the project currently does not contain Prisma migration files, the database can be synchronized using:

cd backend
npx prisma db push

This creates the tables defined in:

backend/prisma/schema.prisma

The Prisma client is generated automatically.

7. Seed the Sender

The project includes a seed script that creates a default Ethereal sender.

From the project root:

docker compose exec api npx prisma db seed

The seed creates:

Default Ethereal Sender

If it already exists, the seed command safely skips it.

8. Ethereal Email Setup

Ethereal Email is used as a fake SMTP server for development/testing.

It allows the application to send emails without sending real emails to external recipients.

The backend supports:

ETHEREAL_USER=
ETHEREAL_PASS=

If these are left empty during development, the application can create an Ethereal test account.

The seed command prints the Ethereal credentials:

Created sender: Default Ethereal Sender ...
Ethereal inbox preview: https://ethereal.email/login
user: ...
pass: ...

Open:

https://ethereal.email/login

and log in with those credentials.

The sent test messages can then be viewed inside the Ethereal inbox.

Ethereal emails are test emails and normally do not arrive in a real Gmail inbox.

9. Frontend Setup

Open another terminal.

Go to:

cd E:\Outbox\reachinbox-scheduler\reachinbox-scheduler\frontend

Install dependencies:

npm install

Create:

frontend/.env.local

Example:

NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

Start the frontend:

npm run dev

The application will be available at:

http://localhost:3000


10. Google OAuth Setup

Google OAuth is used for application login.

Create an OAuth client in Google Cloud Console and configure the application with the generated Client ID.

The same Google Client ID should be used in:

Backend
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
Frontend
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id

The OAuth configuration must be completed before using the Sign in with Google button.

**11. Architecture Overview**
                 ┌─────────────────────┐
                 │      Next.js        │
                 │      Frontend       │
                 │     localhost:3000  │
                 └──────────┬──────────┘
                            │
                            │ HTTP API
                            ▼
                 ┌─────────────────────┐
                 │   Express Backend   │
                 │     localhost:4000  │
                 └──────────┬──────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │PostgreSQL│  │  Redis   │  │  Google  │
        │ + Prisma │  │ + BullMQ │  │  OAuth   │
        └──────────┘  └────┬─────┘  └──────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Email Worker │
                    │  Concurrency │
                    │      = 5     │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ SMTP/Ethereal│
                    └──────────────┘
12. How Scheduling Works

When a user creates a scheduled email:

The frontend sends the email information to the Express API.
The backend validates the request.
The scheduled email is persisted in PostgreSQL using Prisma.
The email is associated with a configured sender.
A BullMQ job is created for processing.
Redis stores and manages the queue.
At the appropriate time, the worker picks up the job.
The worker checks the rate limit.
The email is sent through the configured SMTP provider.
The email status is updated in PostgreSQL.

This separates scheduling/persistence from actual email delivery.

13. Persistence and Restart Recovery

PostgreSQL is the source of truth for scheduled and sent emails.

Scheduled emails are persisted before they are processed.

Therefore, restarting the application does not simply erase scheduled jobs.

The scheduler also contains recovery logic that checks the database for emails that should be processed but are not currently queued.

This allows the application to rebuild/recover pending work after:

API restart
Worker restart
Docker container restart
Application crash

Redis/BullMQ handles background processing while PostgreSQL maintains the durable application state.

14. Rate Limiting

Email sending is rate-limited per sender.

The application supports:

MIN_DELAY_MS_BETWEEN_EMAILS=2000
MAX_EMAILS_PER_HOUR=200
Delay

For example:

2000 ms = 2 seconds

The worker waits between email sends to avoid sending messages too quickly.

Hourly limit

For example:

MAX_EMAILS_PER_HOUR=200

means one sender can send a maximum of 200 emails during an hourly window.

The rate limiter uses Redis for fast coordination and PostgreSQL persistence for rate-window information.

This helps maintain the limit even when multiple worker processes are processing jobs.

15. Worker Concurrency

The worker supports configurable concurrency:

WORKER_CONCURRENCY=5

This means the worker can process up to 5 email jobs concurrently.

BullMQ + Redis manages the queue while the worker processes jobs.

Concurrency improves throughput while the rate limiter prevents the application from exceeding the configured sending limits.

16. Backend Features Implemented
Scheduler
Create scheduled emails
Configure start time
Configure delay between emails
Configure hourly sending limit
Queue scheduled email jobs
Process jobs using BullMQ
Persistence
PostgreSQL database
Prisma ORM
Persist scheduled emails
Persist sent emails
Persist sender configuration
Persist rate-limit windows
Recovery of pending/unprocessed emails after restart
Rate Limiting
Per-sender hourly limits
Configurable maximum emails/hour
Configurable delay between emails
Redis-based rate limiting
Persistent rate-window tracking
Concurrency
BullMQ background queue
Dedicated email worker
Configurable worker concurrency
Concurrent processing of email jobs
Safe coordination through Redis
Authentication
Google OAuth
JWT-based authentication
Protected API routes
Email
SMTP/Nodemailer integration
Ethereal Email support
Sender configuration
Email delivery status tracking


17. Frontend Features Implemented
Login
Google Sign-In
OAuth authentication
User session handling
Logout
Dashboard
Scheduled Emails view
Sent Emails view
Email status tracking
User information
Logout functionality
Compose Email

The compose interface supports:

Sender selection
Subject
Email body
Recipient/lead file upload
CSV/text recipient lists
Start time
Delay between emails
Hourly sender limit
Schedule action
Email Tables

The dashboard displays:

Scheduled emails
Sent emails
Recipient information
Subject
Status
Scheduling/sending information
Sender Management
Fetch configured senders
Display available sender
Select sender while composing an email
Display sender hourly limit


18. Testing the Application

Start Docker:

docker compose up -d

Check services:

docker compose ps

Check API:

http://localhost:4000/health

Expected response:

{"ok":true}

Start frontend:

cd frontend
npm run dev

Open:

http://localhost:3000

Login with Google.

Then:

Open Dashboard.
Click Compose New Email.
Select Default Ethereal Sender.
Enter a subject.
Enter the email body.
Upload a CSV/text file containing a test recipient.
Set the start time.
Set delay, e.g. 2000 ms.
Set hourly limit, e.g. 200.
Click Schedule.
Check Scheduled Emails.
After processing, check Sent Emails.
Open the Ethereal inbox to verify the actual test message.

19. Useful Docker Commands
Start everything
docker compose up -d
Stop everything
docker compose down
Check containers
docker compose ps
API logs
docker compose logs api --tail=50
Worker logs
docker compose logs worker --tail=50
PostgreSQL logs
docker compose logs postgres --tail=50
Redis logs
docker compose logs redis --tail=50
Rebuild after changing Dockerfile/code
docker compose build --no-cache
docker compose up -d


20. Current Implementation Summary
Area	Implementation
Frontend	Next.js + React + TypeScript
Backend	Express + Node.js + TypeScript
Database	PostgreSQL
ORM	Prisma
Queue	BullMQ
Queue Storage	Redis
Worker	Dedicated BullMQ worker
Worker Concurrency	Configurable, default 5
Rate Limiting	Redis + PostgreSQL
Authentication	Google OAuth + JWT
Email	Nodemailer + SMTP
Development SMTP	Ethereal Email
Scheduling	Persistent DB + BullMQ
Restart Recovery	Database-based recovery
Containerization	Docker Compose

