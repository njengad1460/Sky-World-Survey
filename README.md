# Sky Survey Platform

A full-stack survey management platform built with **React** and **Express.js**. Features AWS Cognito authentication, role-based admin access, XML-based API communication, and PDF certificate uploads to S3.

---

## Prerequisites

- **Node.js** v24+ and **pnpm** v10.23+
- **Docker** & **Docker Compose**
- **MySQL** 8.0+ (or use the Docker service)
- **AWS Account** with Cognito User Pool, S3 bucket, and ECR (for production)

---

## Installation

```bash
git clone https://github.com/davy1460/Sky-World-Survey.git
cd Sky-World-Survey

# Set up environment variables
cp .env.example .env
cp .env.example simple-survey-api/.env
# Edit both .env files with your database and AWS credentials

# Install dependencies
cd simple-survey-api && pnpm install
cd ../simple-survey-web && pnpm install
```

---

## Running Locally

### Docker Compose (Recommended)

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000/api |
| MySQL | localhost:3306 |

### Without Docker

```bash
# Terminal 1 — Start the backend
cd simple-survey-api
pnpm run dev          # Runs on port 5000

# Terminal 2 — Start the frontend
cd simple-survey-web
pnpm run dev          # Runs on port 5173
```

> Ensure MySQL is running and the schema from `init/sql_schema.sql` has been imported.

---

## Technologies Used

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite 8, React Router 7, Axios, AWS Amplify 6 |
| **Backend** | Express.js 5, MySQL2, Multer, jstoxml, aws-jwt-verify |
| **Database** | MySQL 8.0 (InnoDB) |
| **Cloud** | AWS Cognito (auth), S3 (file storage), ECR (container registry), CloudFront (CDN) |
| **DevOps** | Docker, Docker Compose, Nginx, GitHub Actions, Terraform |

---

## Assumptions Made

1. Users authenticate via **AWS Cognito** — no custom password storage is implemented.
2. The frontend sends Cognito **ID tokens** (not access tokens) so the backend can extract the user's registration email.
3. The API communicates exclusively in **XML** format (not JSON).
4. Admin access is controlled through **Cognito User Pool Groups** (`admin`, `Admin`, or `Admins`).
5. Only **PDF** files are accepted for certificate uploads; files are stored directly in S3.
6. In development mode without Cognito credentials, the backend auto-assigns a mock admin user.
7. All surveys are publicly viewable, but **submitting** a response requires authentication.
8. The applicant email recorded per response is the **Cognito registration email**, not a survey form field.
