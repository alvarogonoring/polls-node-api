import {z} from "zod";
import {prisma} from "@/db/prisma";
import {FastifyInstance} from "fastify";
import {randomUUID} from "node:crypto";
import {redis} from "@/db/redis";
import {voting} from "@/utils/voting-pub-sub";

export async function createPoll(app: FastifyInstance) {
    app.post('/polls', async (req, res) => {
        const createPollBody = z.object({
            title: z.string(),
            options: z.array(z.string())
        })

        const {title, options} = createPollBody.parse(req.body);

        const poll = await prisma.poll.create({
            data: {
                title,
                options: {
                    createMany: {
                        data: options.map(option => {
                            return {title: option}
                        })
                    }
                }
            }
        });

        return res.status(201).send({pollId: poll.id})
    })
}

export async function getPoll(app: FastifyInstance) {
    app.get('/polls/:pollId', async (req, res) => {
        const getPollParams = z.object({
            pollId: z.string().uuid()
        })

        const {pollId} = getPollParams.parse(req.params);

        const poll = await prisma.poll.findUnique({
            where: {
                id: pollId
            },
            include: {
                options: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            }
        });

        if (!poll) {
            return res.status(400).send({ message: 'Poll not found.' });
        }

        const result = await redis.zrange(pollId, 0, -1, 'WITHSCORES');

        const votes = result.reduce((previousValue, currentValue, index) => {
            if (index % 2 === 0) {
                const score = result[index + 1]

                Object.assign(previousValue, { [currentValue]: Number(score) })
            }

            return previousValue
        }, {} as Record<string, number>)

        return res.send({
            poll: {
                id: poll.id,
                title: poll.title,
                options: poll.options.map(option => {
                    return {
                        id: option.id,
                        title: option.title,
                        score: option.id in votes ? votes[option.id] : 0
                    }
                })
            }
        })
    })
}

export async function voteOnPoll(app: FastifyInstance) {
    app.post('/polls/:pollId/votes', async (req, res) => {
        const voteOnPollBody = z.object({
            pollOptionId: z.string().uuid()
        })

        const voteOnPollParams = z.object({
            pollId: z.string().uuid()
        })

        const {pollId} = voteOnPollParams.parse(req.params);
        const {pollOptionId} = voteOnPollBody.parse(req.body);

        let {sessionId} = req.cookies as { sessionId: string };

        if (sessionId) {
            const userPreviousVoteOnPoll = await prisma.vote.findUnique({
                where: {
                    pollId_sessionId: {
                        sessionId,
                        pollId
                    }
                }
            })

            if (userPreviousVoteOnPoll && userPreviousVoteOnPoll.pollOptionId !== pollOptionId) {
                await prisma.vote.delete({
                    where: {
                        id: userPreviousVoteOnPoll.id
                    }
                })

                const votes = await redis.zincrby(pollId, -1, userPreviousVoteOnPoll.pollOptionId)

                voting.publish(pollId, {
                    pollOptionId: userPreviousVoteOnPoll.pollOptionId,
                    votes: Number(votes)
                })
            } else if (userPreviousVoteOnPoll) {
                return res.status(400).send({ message: 'You already voted on this poll.'})
            }
        }

        if (!sessionId) {
            const sessionId = randomUUID();

            res.setCookie('sessionId', sessionId, {
                httpOnly: true,
                maxAge: 60 * 60 * 24 * 30,
                path: '/',
                signed: true
            })
        }

        await prisma.vote.create({
            data: {
                sessionId,
                pollId,
                pollOptionId
            }
        })

        const votes = await redis.zincrby(pollId, 1, pollOptionId)

        voting.publish(pollId, {
            pollOptionId,
            votes: Number(votes)
        })

        return res.status(201).send()
    })
}