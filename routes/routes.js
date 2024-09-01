import express from "express";
import {messageFloGeneralAssistant} from "../assistants/flo-general-assistant.js";
import { messageFloCakeAssistant } from "../assistants/flo-cake-assistant.js";
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

// Start conversation with Flo General Assistant
router.post("/floGeneral", async (req, res, next) => {
  try {
    const { message, thread } = req.body;
    const { thread: newThread, responseMessage, assistant} = await messageFloGeneralAssistant(message, thread);
    const response = formatResponse(responseMessage);

    return res.json({ thread: newThread, response, assistant });
  
  } catch (error) {    
    next(error);
  }
});

// Start conversation with Cake Assistant
router.post("/floCake", async (req, res, next) => {
  try {
    const { message, thread } = req.body;
    const { thread: newThread, responseMessage, assistant } = await messageFloCakeAssistant(message, thread);
    const response = formatResponse(responseMessage);
    
    return res.json({ thread: newThread, response, assistant });

  } catch (error) {
    next(error);
  }
});

export { router };
