import axios from "axios";
import { CustomError } from "../commons/customError.js";
import {
    createThread,
    sendMessage,
    createRun,
    retrieveRun,
    listMessages,
    deleteThread
} from "../commons/openaiUtils.js";

const CAKE_ASSISTANT = {
    ID: process.env.FLO_CAKE_ASSISTANT_ID,
    NAME: "CakeOrderAssistant",
    LIVE_AGENT_ENDPOINT: process.env.LIVE_AGENT_ENDPOINT,
};

const FUNCTIONS = { CALL_LIVE_AGENT: "callLiveAgent" };
//TODO put the logic for callLiveAgent function inside the openaiUtils.js file and add parameter for summary 
//the summary will be individual for every assistant however it will be treated the same way.

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

    const messages = await listMessages(thread, run.id);

    const responseMessage = await messages.data[0].content[0].text.value;

    return {
        thread,
        responseMessage,
        assistant: CAKE_ASSISTANT.NAME,
    };
};

const handleToolCalls = async (thread, run, manychatId) => {
    const toolCalls =
        run.required_action.submit_tool_outputs.tool_calls;

    //iterate over the tool calls to identify different functions
    for (const toolCall of toolCalls) {
        let resolvedActionMessage = "";
        const toolType = toolCall.type;
        const toolId = toolCall.id;

        if (toolType === "function") {
            const functionName = toolCall.function.name;
            const functionArgs = toolCall.function.arguments;

            // Call the needed function
            switch (functionName) {
                case FUNCTIONS.NONE:
                    resolvedActionMessage = makeOrder(functionArgs);
                    break;
                case FUNCTIONS.CALL_LIVE_AGENT:
                    return await callLiveAgent(thread, functionArgs, manychatId);
                default:
                    break;
            }
        }

        // Handle each tool call as needed
        // await openaiClient.beta.threads.runs.submitToolOutputs(
        //     thread,
        //     run.id,
        //     {
        //         tool_outputs: [
        //             {
        //                 tool_call_id: toolId,
        //                 output: resolvedActionMessage,
        //             },
        //         ],
        //     },
        // );
    }
};


const callLiveAgent = async (thread, summary, manychatId) => {
    try {
        await axios.post(CAKE_ASSISTANT.LIVE_AGENT_ENDPOINT, { summary, manychatId });
        await deleteThread(thread);

        return {
            responseMessage: "stop",
            assistant: CAKE_ASSISTANT.NAME,
        };
    } catch (error) {
        console.error('Error calling live agent:', error);
        throw error;
    }
};

export {
    runCakeOrderAssistant,
    messageAssistant as messageFloCakeAssistant,
    CAKE_ASSISTANT,
};
