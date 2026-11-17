# Jobber App

An in-progress TypeScript microservices backend for a freelance marketplace, currently consisting of a shared library and an event-driven email notification service.

This repository is a learning project that follows the "Jobber" freelance-marketplace microservices architecture. Two packages exist today: a shared library published to GitHub Packages, and a notification service that consumes RabbitMQ messages and sends templated emails. It demonstrates message-driven communication with RabbitMQ, centralized logging to Elasticsearch/Kibana, private package publishing with GitHub Actions, and containerized local infrastructure. The remaining marketplace services are not built yet (see [Project Status](#project-status)).

## What's Implemented

| Package / Service | Responsibility | Status |
| --- | --- | --- |
| `microservices/jobber-shared` | Shared npm package (`@muhamed-mustafa/jobber-shared`): TypeScript interfaces for auth, buyer, seller, gig, chat, order, review and search; custom error classes; gateway-token middleware; Winston logger with Elasticsearch transport; Cloudinary upload helper; string helpers | Implemented, published at `0.0.5` |
| `microservices/notification-service` | Express service that consumes email jobs from RabbitMQ and sends EJS-templated emails over SMTP (Nodemailer + `email-templates`); exposes a health endpoint | Partially implemented: auth email consumer is wired, order email consumer is written but disabled |
| `volumes/docker-compose.yml` | Local infrastructure: Redis, MongoDB, MySQL, PostgreSQL, RabbitMQ, Elasticsearch, Kibana, plus the notification service container | Working for infrastructure; Redis, MongoDB, MySQL and PostgreSQL are provisioned for future services and are not used by any code in this repo yet |
| `.github/workflows/publish.yml` | Builds and publishes the shared library to GitHub Packages | Implemented |

## Architecture

### Messaging

The notification service does not expose business endpoints. It is driven by RabbitMQ messages on `direct` exchanges:

| Exchange | Routing key | Queue | Handler | State |
| --- | --- | --- | --- | --- |
| `jobber-email-notification` | `auth-email` | `auth-email-queue` | `EmailMessageHandler` | Active |
| `jobber-order-notification` | `order-email` | `order-email-queue` | `OrderMessageHandler` | Commented out in `src/server.ts` |

Each consumer asserts its exchange, asserts a durable queue, binds it with the routing key, and acknowledges a message after the handler has run. The message body is JSON containing a `template` name, a `receiverEmail`, and the template variables (for example `username`, `verifyLink`, `resetLink`, `otp`).

No other service publishes to these exchanges yet. On startup the notification service publishes one test message itself (a `verifyEmail` message addressed to the `email` environment variable) to exercise the pipeline end to end.

### Email templates

EJS templates live in `microservices/notification-service/src/emails`, each with an `html.ejs` and a `subject.ejs`:
`verifyEmail`, `forgotPassword`, `resetPasswordSuccess`, `otpEmail`, `offer`, `orderPlaced`, `orderReceipt`, `orderDelivered`, `orderExtension`, `orderExtensionApproval`.

### HTTP

The only route is `GET /notifications/health`, which returns a plain-text health message.

### Logging

Every component creates a logger through `winstonLogger()` from the shared library. It writes to the console and ships logs to Elasticsearch through `winston-elasticsearch`; Kibana (from the compose file) can be used to browse them. On startup the service also polls the Elasticsearch cluster health endpoint until it responds.

`elastic-apm-node` is listed as a dependency and APM variables are set in the compose file, but APM is not initialized in the code and no APM server is defined in the compose file.

### Shared library publishing

`jobber-shared` is built with Babel (CJS and ESM output) plus `tsc` for type declarations. The `Publish` workflow runs on pushes and pull requests to `main`: it installs dependencies, runs `npm run build`, writes an `.npmrc` pointing at `npm.pkg.github.com`, and runs `npm publish` using the workflow's `GITHUB_TOKEN`. The version in `package.json` has to be bumped for a publish to succeed. The notification service consumes the package as `@muhamed-mustafa/jobber-shared`.

## Tech Stack

- **Language / runtime:** TypeScript, Node.js
- **HTTP:** Express
- **Messaging:** RabbitMQ (`amqplib`)
- **Email:** Nodemailer, `email-templates`, EJS
- **Logging:** Winston, `winston-elasticsearch`, Elasticsearch 9, Kibana 9
- **Tooling:** Jest + ts-jest, ESLint, Prettier, Nodemon, PM2, Babel (library build)
- **Infrastructure:** Docker, Docker Compose, GitHub Actions, GitHub Packages

## Getting Started

### Prerequisites

- Node.js 20 or newer and npm
- Docker and Docker Compose
- A GitHub personal access token with the `read:packages` scope (the shared library is installed from GitHub Packages)
- SMTP credentials for sending mail (a test inbox service such as Ethereal works)

### 1. Start the infrastructure

The compose file references `microservices/notification-service/.env`, so create that file first (see [Environment Variables](#environment-variables)). Then start the backing services:

```bash
cd volumes
docker compose up -d rabbitmq elasticsearch kibana
```

RabbitMQ's management UI is exposed on port `15672`, Elasticsearch on `9200` and Kibana on `5601`. The other databases in the compose file (`redis`, `mongodb`, `mysql`, `postgres`) can be started the same way but nothing in this repo connects to them yet.

### 2. Install the notification service

Both packages ship an `.npmrc` that reads the registry token from `NPM_TOKEN`:

```bash
export NPM_TOKEN=<your-github-personal-access-token>
cd microservices/notification-service
npm install
```

### 3. Run it

The service reads its configuration from `process.env` and does not load a `.env` file itself, so the variables must be present in the shell (or supplied by Docker Compose).

```bash
npm run dev      # nodemon + tsconfig-paths, runs src/app.ts
npm run build    # tsc + tsc-alias, copies email templates into build/
npm run start    # runs the compiled build under PM2
```

Other scripts: `npm run lint:check`, `npm run lint:fix`, `npm run prettier:check`, `npm run prettier:fix`, `npm test`.

To run the service in a container instead, `docker compose up notifications` builds it from `Dockerfile.dev`. The image build installs the shared library from GitHub Packages, so the registry token has to be available to the build.

### Building the shared library

```bash
cd microservices/jobber-shared
npm install
npm run build
```

The build scripts set environment variables inline (`NODE_ENV=production ...`), so they need a POSIX shell.

## Environment Variables

Notification service (`src/config.ts`):

| Variable | Meaning |
| --- | --- |
| `NODE_ENV` | Runtime environment name |
| `PORT` | HTTP port the service listens on (the Dockerfiles expose `4001`) |
| `CLIENT_URL` | Frontend base URL, used for links inside emails |
| `RABBITMQ_ENDPOINT` | AMQP connection URL |
| `ELASTIC_SEARCH_URL` | Elasticsearch node URL used for logging and the health check |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP server port |
| `SENDER_EMAIL` | SMTP username and "from" address |
| `SENDER_EMAIL_PASSWORD` | SMTP password |
| `email` | Recipient address for the test message published at startup |

Other variables:

| Variable | Used by | Meaning |
| --- | --- | --- |
| `NPM_TOKEN` | `.npmrc` in both packages | GitHub token for installing or publishing `@muhamed-mustafa/jobber-shared` |
| `JWT_SECRET` | `verifyGatewayRequest` in `jobber-shared` | Secret used to verify the gateway token on incoming requests |

## Testing

The notification service has one Jest test, `src/queues/test/email.consumer.test.ts`. It mocks the RabbitMQ connection and verifies that `EmailConsumer` asserts the exchange and queue, binds them with the routing key, and starts consuming.

```bash
cd microservices/notification-service
npm test
```

The shared library has no tests.

## Project Status

This is a work in progress. Done so far: the shared library, its publishing pipeline, the local infrastructure, and the auth-email path of the notification service.

Not built yet:

- API gateway, auth, users (buyer/seller), gig, chat, order and review services. Their TypeScript interfaces already exist in `jobber-shared`, and the gateway middleware already lists their service names.
- A frontend client.
- The order email consumer (handler and templates exist; the consumer is disabled).
- APM instrumentation, and CI for the notification service (the `Jenkinsfile` is an empty placeholder).

Known gaps:

- No `.env.example` is provided.
- In the compose file the `notifications` container is not attached to the `elastic` network that Elasticsearch runs on.
- Test coverage is limited to a single consumer test.

## Author

[Muhammed Mustafa](https://github.com/muhamed-mustafa)
