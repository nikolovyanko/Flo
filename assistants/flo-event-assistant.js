import { CustomError } from "../commons/err/customError.js";
import {
    getTodayDateInUK,
    getWhatsappDetails,
    callLiveAgent,
    FUNCTIONS,
    runAssistant
} from "../commons/functions/shared-functions.js";

const EVENT_ASSISTANT = {
    ID: process.env.FLO_EVENT_ASSISTANT_ID,
    NAME: "EventAssistant"
};

const messageAssistant = async (message, thread, manychatId) => {
    try {
        return await runAssistant(
            message,
            thread,
            manychatId,
            EVENT_ASSISTANT,
            handleToolCalls
        );
    } catch (error) {
        console.error(`Error in ${EVENT_ASSISTANT.NAME} : ${error.message}`, error);
        throw new CustomError(`Error in ${EVENT_ASSISTANT.NAME} : ${error.message}`, error);
    }
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
                    return await callLiveAgent(thread, functionArgs, manychatId, EVENT_ASSISTANT.NAME);
                case FUNCTIONS.GET_TODAY_DATE:
                    return await getTodayDateInUK(thread, run, toolId, EVENT_ASSISTANT.NAME);
                case FUNCTIONS.GET_WHATSAPP_DETAILS:
                    return await getWhatsappDetails(thread, run, toolId, manychatId, EVENT_ASSISTANT.NAME);
                default:
                    break;
            }
        }
    }
};

export {
    EVENT_ASSISTANT,
    messageAssistant as messageFloEventAssistant,
};