import { CustomError } from "../commons/customError.js";
import { callCakeAssistant, callWeddingAssistant, callCateringAssistant, callEventAssistant } from "../commons/shared-functions.js";
import {
    createThread,
    sendMessage,
    createRun,
    retrieveRun,
    getMessage,
    deleteThread
} from "../commons/openaiUtils.js";

const GENERAL_ASSISTANT = {
    ID: process.env.FLO_GENERAL_ASSISTANT_ID,
    NAME: "GeneralAssistant",
};

const FUNCTIONS = {
    CALL_CAKE_ASSISTANT: "callCakeAssistant",
    CALL_CATERING_ASSISTANT: "callCateringAssistant",
    CALL_CUPCAKE_ASSISTANT: "callCupcakeAssistant",
    CALL_EVENT_ASSISTANT: "callEventBookingAssistant",
    CALL_WEDDING_ASSISTANT: "callWeddingAssistant",
};

const messageAssistant = async (message, thread, manychatId) => {
    try {
        thread = thread ?? await createThread();

        await sendMessage(thread, message);
        const run = await createRun(thread, GENERAL_ASSISTANT.ID);

        return await runDefaultAssistant(thread, run);

    } catch (error) {
        console.error(`Error in ${GENERAL_ASSISTANT.NAME} : ${error.message}`, error);
        throw new CustomError(`Error in ${GENERAL_ASSISTANT.NAME} : ${error.message}`, error);

    }
};

const runDefaultAssistant = async (thread, run) => {
    // Poll for the run status until it is completed
    while (run.status !== "completed") {
        // Add a delay of 1.5 second
        await new Promise((resolve) => setTimeout(resolve, 1500));
        run = await retrieveRun(thread, run.id);

        if (run.status === "requires_action") {
            return await handleToolCalls(thread, run);
        }
        //Checking the status at the end of the loop to avoid unnecessary polling
        run = await retrieveRun(thread, run.id);
    }

    const responseMessage = await getMessage(thread, run);
    return {
        thread,
        responseMessage,
        assistant: GENERAL_ASSISTANT.NAME,
    };
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

            // Call the required function
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
