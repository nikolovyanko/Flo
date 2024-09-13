import { CustomError } from "../commons/customError.js";
import {
    createThread,
    sendMessage,
    createRun,
    retrieveRun,
    getMessage
} from "../commons/openaiUtils.js";
import { getTodayDateInUK, getWhatsappDetails, callLiveAgent } from "../commons/shared-functions.js";

const WEDDING_ASSISTANT = {
    ID: process.env.FLO_WEDDING_ASSISTANT_ID,
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
                    return await getTodayDateInUK(thread, run, toolId, WEDDING_ASSISTANT.NAME);
                case FUNCTIONS.GET_WHATSAPP_DETAILS:
                    return await getWhatsappDetails(thread, run, toolId, manychatId, WEDDING_ASSISTANT.NAME);
                default:
                    break;
            }
        }
    }
};

export {
    WEDDING_ASSISTANT,
    messageAssistant as messageFloWeddingAssistant,
};