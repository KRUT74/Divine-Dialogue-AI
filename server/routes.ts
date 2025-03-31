import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import { z } from "zod";
import { insertSavedItemSchema, insertOpenaiRequestSchema } from "@shared/schema";
import { log } from "./vite";

// OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Check if API key exists
if (!process.env.OPENAI_API_KEY) {
  log("WARNING: OpenAI API key is not set. AI features will not work.", "openai");
}

// Input validation schemas
const faithSchema = z.enum(["buddhism", "christianity", "hinduism", "islam", "judaism", "secular"]);
const languageSchema = z.enum(["english", "spanish", "arabic", "hindi"]);

const blessingRequestSchema = z.object({
  faith: faithSchema,
  language: languageSchema
});

const questionRequestSchema = z.object({
  faith: faithSchema,
  question: z.string().min(1),
  compareMode: z.boolean().optional().default(false),
  language: languageSchema
});

const scriptureRequestSchema = z.object({
  faith: faithSchema,
  source: z.string().min(1),
  reference: z.string().min(1),
  language: languageSchema
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API route for getting daily blessing
  app.post("/api/openai/blessing", async (req: Request, res: Response) => {
    try {
      const { faith, language } = blessingRequestSchema.parse(req.body);
      
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: 
              `You are a spiritual guide for ${faith}. Provide a daily blessing in the form of a JSON response with the following structure:
              {
                "title": "Today's Reflection",
                "quote": "A relevant scripture quote",
                "source": "The source of the quote",
                "reflection": "A reflection on the quote for daily life"
              }
              Make the content authentic, inspiring, and accurate to ${faith} teachings.
              Respond in ${language}.`
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = response.choices[0].message.content ? JSON.parse(response.choices[0].message.content) : {};
      
      // Store the request in history (if user is logged in)
      const userId = (req as any).session?.userId;
      if (userId) {
        await storage.createOpenaiRequest({
          userId,
          requestType: "blessing",
          faith,
          prompt: `Daily blessing for ${faith}`,
          response: result
        });
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("Error in daily blessing endpoint:", error);
      
      // Check for API key issues
      if (error.message && error.message.includes("API key")) {
        res.status(401).json({ error: "OpenAI API key error. Please check your API key configuration." });
      } else {
        res.status(500).json({ error: "Failed to generate blessing" });
      }
    }
  });

  // API route for answering questions
  app.post("/api/openai/question", async (req: Request, res: Response) => {
    try {
      const { faith, question, compareMode, language } = questionRequestSchema.parse(req.body);
      
      let systemPrompt = `You are a knowledgeable spiritual guide for ${faith}. Answer questions accurately, respectfully, and in accordance with ${faith} traditions.`;
      
      if (compareMode) {
        systemPrompt += ` When requested, also provide perspectives from other faiths (Christianity, Buddhism, Hinduism, Islam, Judaism, and Secular viewpoints) on the same question for comparative learning.`;
      }
      
      systemPrompt += ` Format your response as HTML paragraphs and lists for better readability. Respond in ${language}.`;
      
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        response_format: compareMode ? { type: "json_object" } : undefined
      });

      let result;
      
      if (compareMode) {
        result = {
          answer: "An error occurred while processing your request.",
          perspectives: {}
        };
        
        try {
          const parsedResponse = response.choices[0].message.content ? JSON.parse(response.choices[0].message.content) : {};
          result = {
            answer: parsedResponse.answer || parsedResponse.mainAnswer || parsedResponse.response,
            perspectives: parsedResponse.perspectives || parsedResponse.comparisons || {}
          };
        } catch (e) {
          // Fallback to text response if JSON parsing fails
          result = {
            answer: response.choices[0].message.content || '',
            perspectives: {}
          };
        }
      } else {
        result = {
          answer: response.choices[0].message.content || ''
        };
      }
      
      // Store the request in history (if user is logged in)
      const userId = (req as any).session?.userId;
      if (userId) {
        await storage.createOpenaiRequest({
          userId,
          requestType: "question",
          faith,
          prompt: question,
          response: result
        });
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("Error in question endpoint:", error);
      
      // Check for API key issues
      if (error.message && error.message.includes("API key")) {
        res.status(401).json({ error: "OpenAI API key error. Please check your API key configuration." });
      } else {
        res.status(500).json({ error: "Failed to answer question" });
      }
    }
  });

  // API route for scripture lookup
  app.post("/api/openai/scripture", async (req: Request, res: Response) => {
    try {
      const { faith, source, reference, language } = scriptureRequestSchema.parse(req.body);
      
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: 
              `You are a religious scholar specializing in ${faith}. Provide a scripture passage, interpretation, and source in the following JSON format:
              {
                "passage": "The requested scripture text",
                "interpretation": "A scholarly interpretation",
                "source": "Complete source information"
              }
              Look up ${source} ${reference} from ${faith} tradition. Be accurate and respectful.
              If the exact reference doesn't exist, provide the closest relevant passage.
              Respond in ${language}.`
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = response.choices[0].message.content ? JSON.parse(response.choices[0].message.content) : {};
      
      // Store the request in history (if user is logged in)
      const userId = (req as any).session?.userId;
      if (userId) {
        await storage.createOpenaiRequest({
          userId,
          requestType: "scripture",
          faith,
          prompt: `${source} ${reference}`,
          response: result
        });
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("Error in scripture endpoint:", error);
      
      // Check for API key issues
      if (error.message && error.message.includes("API key")) {
        res.status(401).json({ error: "OpenAI API key error. Please check your API key configuration." });
      } else {
        res.status(500).json({ error: "Failed to retrieve scripture" });
      }
    }
  });

  // Save item API
  app.post("/api/saved-items", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const itemData = insertSavedItemSchema.parse({
        ...req.body,
        userId
      });
      
      const savedItem = await storage.createSavedItem(itemData);
      res.status(201).json(savedItem);
    } catch (error) {
      console.error("Error saving item:", error);
      res.status(500).json({ error: "Failed to save item" });
    }
  });

  // Get saved items API
  app.get("/api/saved-items", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const items = await storage.getSavedItemsByUserId(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching saved items:", error);
      res.status(500).json({ error: "Failed to fetch saved items" });
    }
  });

  // Delete saved item API
  app.delete("/api/saved-items/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const itemId = parseInt(req.params.id);
      const item = await storage.getSavedItemById(itemId);
      
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      
      if (item.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      await storage.deleteSavedItem(itemId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting saved item:", error);
      res.status(500).json({ error: "Failed to delete saved item" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
