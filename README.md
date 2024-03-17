# Polls Websocket Node.js API

## Used libraries:
- Fastify
- Typescript
- Prisma
- Redis
- Zod

## How to run:

### Prerequisites:

- Node.js and npm installed: [Node.js Download](https://nodejs.org/en/download)
- Docker installed: [Docker Download](https://www.docker.com/products/docker-desktop/)
- Git installed: [Git Download](https://git-scm.com/downloads)

## Configuration Steps:

### 1. Clone the repository:
```bash
git clone https://github.com/alvarogonoring/polls-node-api.git
cd polls-node-api
```
### 2. Install Dependencies with npm:
```bash
npm install
```
### 3. Start the Docker Container for the Database:
```bash
docker-compose up
```
### 4. Run TypeORM Migrations:
```bash
npx prisma migrate dev
```
### 5. Start the Server:
```bash
npm run dev
```

## Available Endpoints:

To fetch any api call, just apoint the url for http://localhost:8080

### POST /polls

Request Body:
```bash
{
  title: string;
  options: string[];
}
```

### GET /polls/:pollId

### POST /polls/:pollId/votes

Request body:
```bash
{
  pollOptionId: string;
}
```

### WS /polls/:pollId/results

Message:
```bash
{
  pollOptionId: string;
  votes: number;
}
```

