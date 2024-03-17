import fastify from "fastify";
import {createPoll, getPoll, voteOnPoll} from "@/routes/polls.routes";
import cookie from '@fastify/cookie';
import fastifyWebsocket from "@fastify/websocket";
import {pollResults} from "@/ws/poll-results";

const app = fastify();

const port = 8080;

app.register(cookie, {
    secret: 'polls-node-api',
    hook: 'onRequest'
})

app.register(fastifyWebsocket)

app.register(createPoll);
app.register(getPoll);
app.register(voteOnPoll);
app.register(pollResults);

app.listen({ port: port }).then(() => {
    console.log(`Server is listening on port ${port}`)
})