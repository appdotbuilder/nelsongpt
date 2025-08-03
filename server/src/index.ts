
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createChatInputSchema,
  sendMessageInputSchema,
  getChatHistoryInputSchema,
  getChatMessagesInputSchema,
  searchNelsonContentInputSchema,
  calculateDosageInputSchema,
  getEmergencyProtocolInputSchema
} from './schema';

// Import handlers
import { createChat } from './handlers/create_chat';
import { sendMessage } from './handlers/send_message';
import { getChatHistory } from './handlers/get_chat_history';
import { getChatMessages } from './handlers/get_chat_messages';
import { searchNelsonContent } from './handlers/search_nelson_content';
import { calculateDosage } from './handlers/calculate_dosage';
import { getEmergencyProtocol } from './handlers/get_emergency_protocol';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'NelsonGPT API'
    };
  }),

  // Chat management endpoints
  createChat: publicProcedure
    .input(createChatInputSchema)
    .mutation(({ input }) => createChat(input)),

  getChatHistory: publicProcedure
    .input(getChatHistoryInputSchema)
    .query(({ input }) => getChatHistory(input)),

  getChatMessages: publicProcedure
    .input(getChatMessagesInputSchema)
    .query(({ input }) => getChatMessages(input)),

  // Core AI chat functionality
  sendMessage: publicProcedure
    .input(sendMessageInputSchema)
    .mutation(({ input }) => sendMessage(input)),

  // Medical knowledge search
  searchNelsonContent: publicProcedure
    .input(searchNelsonContentInputSchema)
    .query(({ input }) => searchNelsonContent(input)),

  // Pediatric dosage calculations
  calculateDosage: publicProcedure
    .input(calculateDosageInputSchema)
    .mutation(({ input }) => calculateDosage(input)),

  // Emergency protocols
  getEmergencyProtocol: publicProcedure
    .input(getEmergencyProtocolInputSchema)
    .query(({ input }) => getEmergencyProtocol(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors({
        origin: process.env['CLIENT_URL'] || 'http://localhost:3000',
        credentials: true
      })(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  
  server.listen(port);
  console.log(`🚀 NelsonGPT TRPC server listening at port: ${port}`);
  console.log(`📚 Medical AI assistant ready for pediatric consultations`);
}

start().catch(console.error);
