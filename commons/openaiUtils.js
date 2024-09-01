
import OpenAI from "openai";
let openaiClient;

const initializeOpenAiClient = () => {
    try {
        const client = new OpenAI({ apiKey: process.env.OPEN_AI_API_KEY });
        openaiClient = client;
      } catch (error) {
        console.error("Failed to initialize OpenAI client:", error);
      }};
    

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
    return await openaiClient.beta.threads.runs.create(thread, {
        assistant_id: assistantId,
    });
};

const retrieveRun = async (thread, runId) => {
    return await openaiClient.beta.threads.runs.retrieve(thread, runId);
};

const listMessages = async (thread, runId) => {
    return await openaiClient.beta.threads.messages.list(thread, runId);
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

export {
  initializeOpenAiClient,
  createThread,
  sendMessage,
  createRun,
  retrieveRun,
  listMessages,
  deleteThread,
  deleteThreads
};