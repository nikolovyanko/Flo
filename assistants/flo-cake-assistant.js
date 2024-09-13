import axios from "axios";
import { CustomError } from "../commons/customError.js";
import { messageFloWeddingAssistant } from "./flo-wedding-assistant.js";
import {
    createThread,
    sendMessage,
    createRun,
    retrieveRun,
    listMessages,
    deleteThread,
    submitToolsCall
} from "../commons/openaiUtils.js";
import { getTodayDate, whatsAppDetailsCall, callLiveAgent } from "../commons/shared-functions.js";

const CAKE_ASSISTANT = {
    ID: process.env.FLO_CAKE_ASSISTANT_ID,
    NAME: "CakeOrderAssistant",
    CAKE_ORDER_ENDPOINT: process.env.CAKE_ORDER_ENDPOINT,
};

const FUNCTIONS = {
    //IMPLEMENTED
    CALL_LIVE_AGENT: "callLiveAgent",
    GET_TODAY_DATE: "getTodaysDateInUK",
    CALL_WEDDING_ASSISTANT: "callWeddingAssistant",
    //IMPLEMENTING
    MAKE_CAKE_ORDER: "makeCakeOrder",
    GET_WHATSAPP_DETAILS: "getWhatsappDetails"
};

const messageAssistant = async (message, thread, manychatId) => {
    try {

        thread = thread ?? await createThread();

        await sendMessage(thread, message);
        const run = await createRun(thread, CAKE_ASSISTANT.ID);

        return await runCakeOrderAssistant(thread, run, manychatId);
    } catch (error) {
        console.error(`Error in ${CAKE_ASSISTANT.NAME} : ${error.message}`, error);
        throw new CustomError(`Error in ${CAKE_ASSISTANT.NAME} : ${error.message}`, error);
    }
};

const runCakeOrderAssistant = async (thread, run, manychatId) => {
    // Poll for the run status until it is completed
    while (run.status !== "completed") {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        run = await retrieveRun(thread, run.id);

        if (run.status === "requires_action") {
            return await handleToolCalls(thread, run, manychatId);
        }
        //Checking the status at the end of the loop to avoid unnecessary polling
        run = await retrieveRun(thread, run.id);
    }

    const responseMessage = await getMessage(thread, run);

    return {
        thread,
        responseMessage,
        assistant: CAKE_ASSISTANT.NAME,
    };
};

const getMessage = async (thread, run) => {
    const messages = await listMessages(thread, run.id);

    return await messages.data[0].content[0].text.value;
};

const handleToolCalls = async (thread, run, manychatId) => {
    const toolCalls = run.required_action.submit_tool_outputs.tool_calls;

    //Iterate over the tool calls to identify different functions
    for (const toolCall of toolCalls) {
        const toolType = toolCall.type;
        const toolId = toolCall.id;

        if (toolType === "function") {
            const functionName = toolCall.function.name;
            const functionArgs = toolCall.function.arguments;

            switch (functionName) {
                case FUNCTIONS.CALL_LIVE_AGENT:
                    return await callLiveAgent(thread, functionArgs, manychatId, CAKE_ASSISTANT.NAME);
                case FUNCTIONS.GET_TODAY_DATE:
                    return await getTodayDateInUK(thread, run, toolId);
                case FUNCTIONS.MAKE_CAKE_ORDER:
                    return await makeCakeOrder(thread, run, toolId, functionArgs, manychatId);
                case FUNCTIONS.GET_WHATSAPP_DETAILS:
                    return await getWhatsappDetails(thread, run, toolId, manychatId);
                case FUNCTIONS.CALL_WEDDING_ASSISTANT:
                    return await callWeddingAssistant(thread, functionArgs); 
                default:
                    break;
            }
        }
    }
};

const getTodayDateInUK = async (thread, run, toolId) => {
    try {
        const datetime = await getTodayDate();
        
        const outputString = `{ "info": "${datetime}" }`;
        await submitToolsCall(thread, run, toolId, outputString);
       
        const responseMessage = await getMessage(thread, run);

        return {
            thread,
            responseMessage,
            assistant: CAKE_ASSISTANT.NAME,
        };
    } catch (error) {
        console.error('Error in CAKE.getTodayDateInUK:', error);
        throw error;
    }
};

const makeCakeOrder = async (thread, run, toolId, cakeOrderDetails, manychatId) => {
    try {
        const response = await axios.post(CAKE_ASSISTANT.CAKE_ORDER_ENDPOINT, cakeOrderDetails);
        //TODO destruct the response and add the response message to the output
        //ntje-gefa-crxj-wrbp-ccdo
        await submitToolsCall(thread, run, toolId, response.data);

        const responseMessage = await getMessage(thread, run);

        return {
            thread,
            responseMessage,
            assistant: CAKE_ASSISTANT.NAME,
        }

    } catch (error) {
        console.error('Error in makeCakeOrder:', error);
        throw error;
    }
};

const getWhatsappDetails = async (thread, run, toolId, manychatId) => {
    try {
        const outputString = await whatsAppDetailsCall(manychatId);
        
        await submitToolsCall(thread, run, toolId, outputString);
        const responseMessage = await getMessage(thread, run);

        return {
            thread,
            responseMessage,
            assistant: CAKE_ASSISTANT.NAME,
        };
    } catch (error) {
        console.error('Error in CAKE.getWhatsappDetails:', error);
        throw error;
    }
};

const callWeddingAssistant = async (thread, args) => {
    try {
        await deleteThread(thread);

        const { summary } = JSON.parse(args);

        const message = `${summary}`;

        return await messageFloWeddingAssistant(message, null);
    } catch (error) {
        console.error("Error in CAKE.callWeddingAssistant:", error);
        throw error;
    }
};

export {
    runCakeOrderAssistant,
    messageAssistant as messageFloCakeAssistant,
    CAKE_ASSISTANT,
};
