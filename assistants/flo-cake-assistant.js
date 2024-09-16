import axios from "axios";
import { CustomError } from "../commons/err/customError.js";
import {getMessage, submitToolsCall} from "../commons/functions/openai-functions.js";
import {
    getTodayDateInUK,
    getWhatsappDetails,
    callLiveAgent,
    callWeddingAssistant,
    FUNCTIONS,
    runAssistant
} from "../commons/functions/shared-functions.js";

const CAKE_ASSISTANT = {
    ID: process.env.FLO_CAKE_ASSISTANT_ID,
    NAME: "CakeOrderAssistant",
    CAKE_ORDER_ENDPOINT: process.env.CAKE_ORDER_ENDPOINT,
};

const messageAssistant = async (message, thread, manychatId) => {
    try {
        return await runAssistant(
            message,
            thread,
            manychatId,
            CAKE_ASSISTANT,
            handleToolCalls
        );
    } catch (error) {
        console.error(`Error in ${CAKE_ASSISTANT.NAME} : ${error.message}`, error);
        throw new CustomError(`Error in ${CAKE_ASSISTANT.NAME} : ${error.message}`, error);
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
