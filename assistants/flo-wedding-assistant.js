import { CustomError } from "../commons/customError.js";
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

const WEDDING_ASSISTANT = {
    ID: process.env.FLO_WEDDING_ID,
    NAME: "WeddingAssistant"
};

const FUNCTIONS = {
    CALL_LIVE_AGENT: "callLiveAgent",
    GET_TODAY_DATE: "getTodaysDateInUK",
    GET_WHATSAPP_DETAILS: "getWhatsappDetails"
};

const messageAssistant = async (message, thread, manychatId) => {
    try {

        thread = thread ?? await createThread();

        await sendMessage(thread, message);
        const run = await createRun(thread, WEDDING_ASSISTANT.ID);

        return await runWeddingAssistant(thread, run, manychatId);
    } catch (error) {
        console.error(`Error in ${WEDDING_ASSISTANT.NAME} : ${error.message}`, error);
        throw new CustomError(`Error in ${WEDDING_ASSISTANT.NAME} : ${error.message}`, error);
    }
};

const runWeddingAssistant = async (thread, run, manychatId) => {
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
        assistant: WEDDING_ASSISTANT.NAME,
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
                    return await callLiveAgent(thread, functionArgs, manychatId, WEDDING_ASSISTANT.NAME);
                case FUNCTIONS.GET_TODAY_DATE:
                    return await getTodayDateInUK(thread, run, toolId);
                case FUNCTIONS.GET_WHATSAPP_DETAILS:
                    return await getWhatsappDetails(thread, run, toolId, manychatId);
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
            assistant: WEDDING_ASSISTANT.NAME,
        };
    } catch (error) {
        console.error('Error in WEDDING.getTodayDateInUK:', error);
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
            assistant: WEDDING_ASSISTANT.NAME,
        };
    } catch (error) {
        console.error('Error in WEDDING.getWhatsappDetails:', error);
        throw error;
    }
};

export {
    messageAssistant as messageFloWeddingAssistant,
    WEDDING_ASSISTANT,
};