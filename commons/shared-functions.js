import axios from "axios";
import { messageFloCakeAssistant } from "../assistants/flo-cake-assistant.js";
import { messageFloWeddingAssistant } from "../assistants/flo-wedding-assistant.js";
import { messageFloCateringAssistant } from "../assistants/flo-catering-assistant.js";
import { messageFloEventAssistant } from "../assistants/flo-event-assistant.js";
import { getMessage, deleteThread, submitToolsCall } from "./openaiUtils.js";

const fetchTodayDateTime = async () => {
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

const getTodayDateInUK = async (thread, run, toolId, assistantName) => {
    try {
        const datetime = await fetchTodayDateTime();

        const outputString = `{ "today_date_time": "${datetime}" }`;
        await submitToolsCall(thread, run, toolId, outputString);

        const responseMessage = await getMessage(thread, run);

        return {
            thread,
            responseMessage,
            assistant: assistantName,
        };
    } catch (error) {
        console.error(`Error in ${assistantName} getTodayDateInUK:`, error);
        throw error;
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
        console.error(`Error calling live agent from ${assistantName}:`, error);
        throw error;
    }
};

const getWhatsappDetails = async (thread, run, toolId, manychatId, assistantName) => {
    try {
        const response = await axios.post(process.env.GET_WHATSAPP_ENDPOINT, { manychatId });
        const { full_name, phone } = response.data;
        const outputString = `{ "full_name": "${full_name}", "phone": "${phone}" }`;

        await submitToolsCall(thread, run, toolId, outputString);
        const responseMessage = await getMessage(thread, run);

        return {
            thread,
            responseMessage,
            assistant: assistantName,
        };
    } catch (error) {
        console.error(`Error in ${assistantName} getWhatsappDetails:`, error);
        throw error;
    }
};

const callCakeAssistant = async (thread, args, assistantName) => {
    try {
        //First we clear the current thread, as it is for the General Assistant, and we need a new thread for the Cake Assistant
        await deleteThread(thread);
        const { orderProduct } = JSON.parse(args); // Parse the JSON string into an object
        const message = `I want to order a custom cake ${orderProduct}`;
        return await messageFloCakeAssistant(message, null);
    } catch (error) {
        console.error(`Error in ${assistantName} callCakeAssistantMakeOrder:`, error);
        throw error;
    }
};

const callWeddingAssistant = async (thread, args, assistantName) => {
    try {
        await deleteThread(thread);
        const { summary } = JSON.parse(args);
        const message = `${summary}`;
        return await messageFloWeddingAssistant(message, null);
    } catch (error) {
        console.error(`Error in ${assistantName} callWeddingAssistant:`, error);
        throw error;
    }
};

//TODO check the right argument it might not be summary
const callCateringAssistant = async (thread, args, assistantName) => {
    try {
        await deleteThread(thread);
        const { summary } = JSON.parse(args);
        const message = `${summary}`;
        return await messageFloCateringAssistant(message, null);
    } catch (error) {
        console.error(`Error in ${assistantName} callCateringAssistant:`, error);
        throw error;
    }
};

//TODO check the right argument it might not be summary
const callEventAssistant = async (thread, args, assistantName) => {
    try {
        await deleteThread(thread);
        const { location, event_type } = JSON.parse(args);
        const message = `The event type :${event_type} at location: ${location}`;
        return await messageFloEventAssistant(message, null);
    } catch (error) {
        console.error(`Error in ${assistantName} callEventAssistant:`, error);
        throw error;
    }
};

export {
    getTodayDateInUK,
    getWhatsappDetails,
    callLiveAgent,
    callCakeAssistant,
    callWeddingAssistant,
    callCateringAssistant,
    callEventAssistant
};