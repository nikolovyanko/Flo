import { CustomError } from "../commons/customError.js";
import {
    createThread,
    sendMessage,
    createRun,
    retrieveRun,
    getMessage,
    deleteThread,
    submitToolsCall
} from "../commons/openaiUtils.js";
import { getTodayDateInUK, getWhatsappDetails, callLiveAgent } from "../commons/shared-functions.js";

const CATERING_ASSISTANT = {
    ID: process.env.FLO_CATERING_ASSISTANT_ID,
    NAME: "CateringAssistant"
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
        const run = await createRun(thread, CATERING_ASSISTANT.ID);
        return await runCateringAssistant(thread, run, manychatId);
    } catch (error) {
        console.error(`Error in ${CATERING_ASSISTANT.NAME} : ${error.message}`, error);
        throw new CustomError(`Error in ${CATERING_ASSISTANT.NAME} : ${error.message}`, error);
    }
};

const runCateringAssistant = async (thread, run, manychatId) => {
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
        assistant: CATERING_ASSISTANT.NAME,
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
                    return await callLiveAgent(thread, functionArgs, manychatId, CATERING_ASSISTANT.NAME);
                case FUNCTIONS.GET_TODAY_DATE:
                    return await getTodayDateInUK(thread, run, toolId, CATERING_ASSISTANT.NAME);
                case FUNCTIONS.GET_WHATSAPP_DETAILS:
                    return await getWhatsappDetails(thread, run, toolId, manychatId, CATERING_ASSISTANT.NAME);
                default:
                    break;
            }
        }
    }
};

export { 
    CATERING_ASSISTANT,
    messageAssistant as messageFloCateringAssistant,
};