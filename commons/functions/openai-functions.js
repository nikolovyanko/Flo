import OpenAI from "openai";

let openaiClient;

const initializeOpenAiClient = () => {
    try {
        openaiClient = new OpenAI({apiKey: process.env.OPEN_AI_API_KEY});
    } catch (error) {
        console.error("Failed to initialize OpenAI client:", error);
    }
};


const createThread = async () => {
    const newThread = await openaiClient.beta.threads.create();
    console.log(`Created thread: ${newThread.id}`);
    return newThread.id;
};

const sendMessage = async (thread, message) => {
    await openaiClient.beta.threads.messages.create(thread, {
        role: "user",
        content: message,
    });
};

const createRun = async (thread, assistantId) => {
    return openaiClient.beta.threads.runs.create(thread, {
        assistant_id: assistantId,
    });
};

const retrieveRun = async (thread, runId) => {
    return openaiClient.beta.threads.runs.retrieve(thread, runId);
};

const listMessages = async (thread, runId) => {
    return openaiClient.beta.threads.messages.list(thread, runId);
};

const getMessage = async (thread, run) => {
    const messages = await listMessages(thread, run.id);
    return messages.data[0].content[0].text.value;
};

const deleteThread = async (thread) => {
    await openaiClient.beta.threads.del(thread);
    console.log(`Thread deleted: ${thread}`);
};

const deleteThreads = async (threads) => {
    let responseMessage = "";
    for (const thread of threads) {
        await openaiClient.beta.threads.del(thread);
        responseMessage += `Thread ${thread} deleted\n`;
    }
    return responseMessage;
};

const submitToolsCall = async (thread, run, toolId, outputMessage) => {
    while (run.status !== "completed") {

        if (run.status === "requires_action") {
            await openaiClient.beta.threads.runs.submitToolOutputs(
                thread,
                run.id,
                {
                    tool_outputs: [
                        {
                            tool_call_id: toolId,
                            output: outputMessage,
                        },
                    ],
                },
            );
        }
        run = await retrieveRun(thread, run.id);
    }
};


export {
    initializeOpenAiClient,
    createThread,
    sendMessage,
    createRun,
    retrieveRun,
    listMessages,
    getMessage,
    deleteThread,
    deleteThreads,
    submitToolsCall
};