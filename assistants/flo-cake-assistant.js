import { 
    createThread, 
    sendMessage, 
    createRun, 
    retrieveRun, 
    listMessages} from "../commons/openaiUtils.js";

const CAKE_ASSISTANT = {
    ID : process.env.FLO_CAKE_ASSISTANT_ID,
    NAME : "CakeOrderAssistant",
};

const FUNCTIONS = { NONE: "non for the moment" };

const messageAssistant = async (message, thread) => {
    try {

        thread = thread ?? await createThread();
        // Create a message
        
        await sendMessage(thread, message);
        const run = await createRun(thread, CAKE_ASSISTANT.ID);

        return await runCakeOrderAssistant(thread, run);
    } catch (error) {
        console.error("Error in messageAssistant:", error);
        return {
            thread: thread,
            responseMessage:"Sorry there was a problem executing your request, can you please try again?",
            assistant: CAKE_ASSISTANT.NAME,
        };
    }
};

const runCakeOrderAssistant = async (thread, run) => {
    //TODO exception handling
    
    // Poll for the run status until it is completed
    while (run.status !== "completed") {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        run = await retrieveRun(thread, run.id);

        if (run.status === "requires_action") {
            await handleToolCalls(thread, run);
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

const handleToolCalls = async (thread, run) => {
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

export {
    runCakeOrderAssistant,
    messageAssistant as messageFloCakeAssistant,
    CAKE_ASSISTANT,
};
