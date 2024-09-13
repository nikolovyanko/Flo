import axios from "axios";
import {
    createThread,
    sendMessage,
    createRun,
    retrieveRun,
    listMessages,
    deleteThread,
    submitToolsCall
} from "./openaiUtils.js";

const getTodayDate = async () => {
    const url = 'https://worldtimeapi.org/api/timezone/Europe/London';
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
        try {
            const response = await axios.get(url);
            const datetime = response.data.datetime;
            return datetime;
        } catch (error) {
            attempts++;
            if (attempts >= maxAttempts) {
                console.error('Failed to fetch date after multiple attempts', error);
                throw error;
            }
            console.log('Retrying request...');
        }
    }
};

const callLiveAgent = async (thread, summary, manychatId, assistantName) => {
    try {
        const url = process.env.LIVE_AGENT_ENDPOINT;
        await axios.post(url, { summary, manychatId });
        await deleteThread(thread);

        return {
            responseMessage: "stop",
            assistant: assistantName,
        };
    } catch (error) {
        console.error(`Error calling live agent from ${assistantName}:` , error);
        throw error;
    }
};

const whatsAppDetailsCall = async (manychatId) => {
    const response =  await axios.post(process.env.GET_WHATSAPP_ENDPOINT, { manychatId });

        const {full_name, phone} = response.data;
        return `{ "full_name": "${full_name}", "phone": "${phone}" }`;
};

export { getTodayDate, whatsAppDetailsCall, callLiveAgent };