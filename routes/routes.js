import express from "express";
import { messageFloGeneralAssistant, GENERAL_ASSISTANT } from "../assistants/flo-general-assistant.js";
import { messageFloCakeAssistant, CAKE_ASSISTANT } from "../assistants/flo-cake-assistant.js";
import { messageFloWeddingAssistant, WEDDING_ASSISTANT } from "../assistants/flo-wedding-assistant.js";
import { validateApiKey } from "../middlewares/auth.js";
import { deleteThreads } from "../commons/openaiUtils.js";

const router = express.Router();

router.use(validateApiKey);

const formatResponse = (responseMessage) => {
  const regex = /【.*source】/g;
  return responseMessage.replace(regex, "");
};

router.delete("/threadDel", async (req, res, next) => {
  try {
    const threads = req.body.threads;
    const responseMessage = await deleteThreads(threads);
    return res.json({ message: responseMessage });
  } catch (error) {
    next(error);
  }
});

router.post("/messageFlo", async (req, res, next) => {
  try {
    const { message, thread, manychatId } = req.body;
    let { assistant } = req.body;
    assistant = assistant || GENERAL_ASSISTANT.NAME;

    let result;
    switch (assistant) {
      case GENERAL_ASSISTANT.NAME:
        result = await handleAssistantMessage(message, thread, manychatId, messageFloGeneralAssistant);
        break;

      case CAKE_ASSISTANT.NAME:
        result = await handleAssistantMessage(message, thread, manychatId, messageFloCakeAssistant);
        break;

        case WEDDING_ASSISTANT.NAME:
        result = await handleAssistantMessage(message, thread, manychatId, messageFloWeddingAssistant);
        break;
        
      default:
        return res.status(400).json({ error: "Invalid assistant name" });
    }

    return res.json(result);

  } catch (error) {
    if (error.name === "CustomError") {
      return res.status(400).json({ error: error.message });
    } else {
      next(error);
    }
  }
});

const handleAssistantMessage = async (message, thread, manychatId, assistantFunction) => {
  const { thread: newThread, responseMessage, assistant } = await assistantFunction(message, thread, manychatId);
  const response = formatResponse(responseMessage);
  return { thread: newThread, response, assistant };
};

export { router };
