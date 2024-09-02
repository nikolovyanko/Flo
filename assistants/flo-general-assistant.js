import { messageFloCakeAssistant } from "./flo-cake-assistant.js";
import { 
    createThread, 
    sendMessage, 
    createRun, 
    retrieveRun, 
    listMessages,
    deleteThread } from "../commons/openaiUtils.js";

const GENERAL_ASSISTANT = {
    ID : process.env.FLO_GENERAL_ASSISTANT_ID,
    NAME : "GeneralAssistant",
};
const FUNCTIONS = { 
    CALL_CAKE_ASSISTANT: "callCakeAssistant", 
    CALL_CATERING_ASSISTANT: "callCateringAssistant",
    CALL_CUPCAKE_ASSISTANT: "callCupcakeAssistant",
    CALL_EVENT_ASSISTANT: "callEventBookingAssistant",
    CALL_WEDDING_ASSISTANT: "callWeddingAssistant",
};

const messageAssistant = async (message, thread) => {
    try {
        thread = thread ?? await createThread();

        await sendMessage(thread, message);
        const run = await createRun(thread, GENERAL_ASSISTANT.ID);
        
        return await runDefaultAssistant(thread, run);
    
    } catch (error) {
        console.error("Error in messageAssistant:", error);
        return {
            thread: thread,
            responseMessage:"Sorry there was a problem executing your request, can you please try again?",
            assistant: GENERAL_ASSISTANT.NAME,
        };
    }
};

const runDefaultAssistant = async (thread, run) => {
    //TODO exception handling

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

    const messages = await listMessages(thread, run.id);
    const responseMessage = await messages.data[0].content[0].text.value;

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
    let resolvedActionMessage = "";
    const toolType = toolCall.type;
    const toolId = toolCall.id;

    if (toolType === "function") {
        const functionName = toolCall.function.name;
        const functionArgs = toolCall.function.arguments;

        // Call the required function
        switch (functionName) {
            case FUNCTIONS.CALL_CAKE_ASSISTANT:
                return await callCakeAssistantMakeOrder(
                    thread,
                    functionArgs,
                );

            default:
                break;
        }
    }
}

};


const callCakeAssistantMakeOrder = async (oldThread, args) => {
    try {
        //First we clear the current thread, as it is for the General Assistant, and we need a new thread for the Cake Assistant
        await deleteThread(oldThread);
        
       const {orderProduct} = JSON.parse(args); // Parse the JSON string into an object
       
        const message = `I want to order ${orderProduct}`;
        
        return await messageFloCakeAssistant(message, null);
    } catch (error) {
        console.error("Failed to parse arguments:", error);
    }
};



export {
    messageAssistant as messageFloGeneralAssistant,
    GENERAL_ASSISTANT
};
