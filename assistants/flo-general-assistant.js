import {CustomError} from "../commons/err/customError.js";
import {
    callCakeAssistant,
    callWeddingAssistant,
    callCateringAssistant,
    callEventAssistant,
    runAssistant,
    FUNCTIONS
} from "../commons/functions/shared-functions.js";

const GENERAL_ASSISTANT = {
    ID: process.env.FLO_GENERAL_ASSISTANT_ID,
    NAME: "GeneralAssistant",
};

const messageAssistant = async (message, thread, manychatId) => {
    try {
        return await runAssistant(
            message,
            thread,
            manychatId,
            GENERAL_ASSISTANT,
            handleToolCalls
        );
    } catch (error) {
        console.error(`Error in ${GENERAL_ASSISTANT.NAME} : ${error.message}`, error);
        throw new CustomError(`Error in ${GENERAL_ASSISTANT.NAME} : ${error.message}`, error);

    }
};

const handleToolCalls = async (thread, run) => {
    const toolCalls =
        run.required_action.submit_tool_outputs.tool_calls;

    //iterate over the tool calls to identify different functions
    for (const toolCall of toolCalls) {
        const toolType = toolCall.type;
        const toolId = toolCall.id;

        if (toolType === "function") {
            const functionName = toolCall.function.name;
            const functionArgs = toolCall.function.arguments;

            switch (functionName) {
                case FUNCTIONS.CALL_CAKE_ASSISTANT:
                    return await callCakeAssistant(thread, functionArgs, GENERAL_ASSISTANT.NAME);

                case FUNCTIONS.CALL_CATERING_ASSISTANT:
                    return await callCateringAssistant(thread, functionArgs, GENERAL_ASSISTANT.NAME);

                case FUNCTIONS.CALL_EVENT_ASSISTANT:
                    return await callEventAssistant(thread, functionArgs, GENERAL_ASSISTANT.NAME);

                case FUNCTIONS.CALL_WEDDING_ASSISTANT:
                    return await callWeddingAssistant(thread, functionArgs, GENERAL_ASSISTANT.NAME);
                default:
                    break;
            }
        }
    }

};

export {
    messageAssistant as messageFloGeneralAssistant,
    GENERAL_ASSISTANT
};
