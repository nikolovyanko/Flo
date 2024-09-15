import axios from "axios";
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
import { getTodayDateInUK, getWhatsappDetails, callLiveAgent, callWeddingAssistant } from "../commons/shared-functions.js";

const CAKE_ASSISTANT = {
    ID: process.env.FLO_CAKE_ASSISTANT_ID,
    NAME: "CakeOrderAssistant",
    CAKE_ORDER_ENDPOINT: process.env.CAKE_ORDER_ENDPOINT,
};

const FUNCTIONS = {
    CALL_LIVE_AGENT: "callLiveAgent",
    GET_TODAY_DATE: "getTodaysDateInUK",
    CALL_WEDDING_ASSISTANT: "callWeddingAssistant",
    GET_WHATSAPP_DETAILS: "getWhatsappDetails",
    //IMPLEMENTING
    MAKE_CAKE_ORDER: "makeCakeOrder",
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
        await new Promise((resolve) => setTimeout(resolve, 1000));
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
                case FUNCTIONS.MAKE_CAKE_ORDER:
                    return await makeCakeOrder(thread, run, toolId, functionArgs, manychatId);

                case FUNCTIONS.CALL_LIVE_AGENT:
                    return await callLiveAgent(thread, functionArgs, manychatId, CAKE_ASSISTANT.NAME);

                case FUNCTIONS.GET_TODAY_DATE:
                    return await getTodayDateInUK(thread, run, toolId, CAKE_ASSISTANT.NAME);

                case FUNCTIONS.GET_WHATSAPP_DETAILS:
                    return await getWhatsappDetails(thread, run, toolId, manychatId, CAKE_ASSISTANT.NAME);

                case FUNCTIONS.CALL_WEDDING_ASSISTANT:
                    return await callWeddingAssistant(thread, functionArgs, CAKE_ASSISTANT.NAME);

                default:
                    break;
            }
        }
    }
};

const makeCakeOrder = async (thread, run, toolId, cakeOrderDetails, manychatId) => {
    try {
         //ntje-gefa-crxj-wrbp-ccdo
        const bodyJson = JSON.parse(cakeOrderDetails);
        bodyJson.manychatId = manychatId;
        const response = await axios.post(CAKE_ASSISTANT.CAKE_ORDER_ENDPOINT, bodyJson);
        const { link : paymentLink } = response.data;

        await submitToolsCall(thread, run, toolId, paymentLink);
        const responseMessage = await getMessage(thread, run);
        return {
            thread,
            responseMessage,
            assistant: CAKE_ASSISTANT.NAME,
        }

    } catch (error) {
        console.error(`Error in ${CAKE_ASSISTANT.NAME}.makeCakeOrder:`, error);
        throw error;
    }
};

export {
    CAKE_ASSISTANT,
    messageAssistant as messageFloCakeAssistant,
};
