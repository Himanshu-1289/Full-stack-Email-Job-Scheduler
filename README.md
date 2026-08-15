Full-Stack Email Job Scheduler

A full-stack application for scheduling and sending email campaigns with Google authentication, persistent scheduling, background processing, rate limiting, and a dashboard for tracking scheduled and sent emails.

---

 1. Tech Stack

Backend

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- Redis
- BullMQ
- Nodemailer
- Google OAuth
- JWT authentication

Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Google OAuth

 Infrastructure

- Docker
- Docker Compose

---

 2. Project Structure

reachinbox-scheduler/
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   ├── src/
│   │   ├── config/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── queues/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── workers/
│   │
│   ├── .env.example
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
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml
├── .gitignore
└── README.md
