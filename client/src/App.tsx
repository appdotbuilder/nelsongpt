
import { useState, useEffect, useCallback, useRef } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Menu, Plus, Send, Clock, Settings, Info, Stethoscope } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Chat, Message, AIResponse } from '../../server/src/schema';
import { ChatMessage } from '@/components/ChatMessage';
import { MedicalTemplates } from '@/components/MedicalTemplates';

// Simulated user - in real app this would come from auth
const CURRENT_USER_ID = 'user-123';

function App() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCitations, setShowCitations] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load chat history on mount
  const loadChatHistory = useCallback(async () => {
    try {
      const chatHistory = await trpc.getChatHistory.query({ 
        user_id: CURRENT_USER_ID,
        limit: 50 
      });
      setChats(chatHistory);
      
      // If no current chat and we have chats, select the most recent one
      if (!currentChat && chatHistory.length > 0) {
        setCurrentChat(chatHistory[0]);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }, [currentChat]);

  // Load messages for current chat
  const loadChatMessages = useCallback(async (chatId: string) => {
    try {
      const chatMessages = await trpc.getChatMessages.query({
        chat_id: chatId,
        user_id: CURRENT_USER_ID,
        limit: 100
      });
      setMessages(chatMessages);
    } catch (error) {
      console.error('Failed to load chat messages:', error);
    }
  }, []);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  useEffect(() => {
    if (currentChat) {
      loadChatMessages(currentChat.id);
    }
  }, [currentChat, loadChatMessages]);

  // Create new chat
  const createNewChat = async () => {
    try {
      const newChat = await trpc.createChat.mutate({
        title: 'New Medical Consultation',
        user_id: CURRENT_USER_ID
      });
      
      setChats((prev: Chat[]) => [newChat, ...prev]);
      setCurrentChat(newChat);
      setMessages([]);
      setSidebarOpen(false);
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    let chatToUse = currentChat;
    
    // Create new chat if none exists
    if (!chatToUse) {
      try {
        chatToUse = await trpc.createChat.mutate({
          title: inputMessage.slice(0, 50) + (inputMessage.length > 50 ? '...' : ''),
          user_id: CURRENT_USER_ID
        });
        setCurrentChat(chatToUse);
        setChats((prev: Chat[]) => [chatToUse!, ...prev]);
      } catch (error) {
        console.error('Failed to create chat:', error);
        return;
      }
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      chat_id: chatToUse.id,
      role: 'user',
      content: inputMessage,
      created_at: new Date()
    };

    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response: AIResponse = await trpc.sendMessage.mutate({
        chat_id: chatToUse.id,
        content: inputMessage,
        user_id: CURRENT_USER_ID
      });

      setMessages((prev: Message[]) => [...prev, response.message]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        chat_id: chatToUse.id,
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        created_at: new Date()
      };
      setMessages((prev: Message[]) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Use medical template
  const useTemplate = (template: string) => {
    setInputMessage(template);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#1e1e1e] text-[#f2f2f2]">
      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="fixed top-4 left-4 z-50 md:hidden text-white hover:bg-[#2a2a2a]"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 bg-[#121212] border-[#2a2a2a] p-0">
          <SidebarContent 
            chats={chats}
            currentChat={currentChat}
            setCurrentChat={setCurrentChat}
            createNewChat={createNewChat}
            showCitations={showCitations}
            setShowCitations={setShowCitations}
            showTimestamps={showTimestamps}
            setShowTimestamps={setShowTimestamps}
            useTemplate={useTemplate}
            closeSidebar={() => setSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-80 bg-[#121212] border-r border-[#2a2a2a]">
        <SidebarContent 
          chats={chats}
          currentChat={currentChat}
          setCurrentChat={setCurrentChat}
          createNewChat={createNewChat}
          showCitations={showCitations}
          setShowCitations={setShowCitations}
          showTimestamps={showTimestamps}
          setShowTimestamps={setShowTimestamps}
          useTemplate={useTemplate}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#121212]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <Stethoscope className="h-6 w-6 text-blue-400" />
            <div>
              <h1 className="text-lg font-semibold">NelsonGPT</h1>
              <p className="text-sm text-gray-400">Evidence-based pediatric assistant</p>
            </div>
          </div>
          {currentChat && (
            <Badge variant="secondary" className="bg-[#2a2a2a] text-[#f2f2f2]">
              {messages.length} messages
            </Badge>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Stethoscope className="h-16 w-16 mx-auto text-blue-400 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Welcome to NelsonGPT</h2>
                <p className="text-gray-400 mb-6">
                  Your evidence-based pediatric medical assistant powered by the Nelson Textbook of Pediatrics
                </p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>💊 Pediatric drug dosing calculations</p>
                  <p>🩺 Symptom-to-diagnosis mapping</p>
                  <p>🚨 Emergency protocols & resuscitation</p>
                  <p>📈 Growth & development milestones</p>
                </div>
              </div>
            ) : (
              messages.map((message: Message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  showTimestamps={showTimestamps}
                  showCitations={showCitations}
                />
              ))
            )}
            {isLoading && (
              <div className="flex items-center gap-3 p-4 bg-[#2a2a2a] rounded-lg animate-pulse">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <span className="text-gray-400 ml-2">NelsonGPT is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-[#2a2a2a]">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 bg-[#2a2a2a] rounded-full p-2">
              <Input
                value={inputMessage}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
                placeholder="Ask about pediatric medicine, drug dosing, or emergency protocols..."
                className="flex-1 border-none bg-transparent text-[#f2f2f2] placeholder:text-gray-400 focus-visible:ring-0"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputMessage.trim() || isLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full h-8 w-8"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

interface SidebarContentProps {
  chats: Chat[];
  currentChat: Chat | null;
  setCurrentChat: (chat: Chat) => void;
  createNewChat: () => void;
  showCitations: boolean;
  setShowCitations: (show: boolean) => void;
  showTimestamps: boolean;
  setShowTimestamps: (show: boolean) => void;
  useTemplate: (template: string) => void;
  closeSidebar?: () => void;
}

function SidebarContent({
  chats,
  currentChat,
  setCurrentChat,
  createNewChat,
  showCitations,
  setShowCitations,
  showTimestamps,
  setShowTimestamps,
  useTemplate,
  closeSidebar
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full w-full">
      {/* New Chat Button */}
      <div className="p-4">
        <Button
          onClick={createNewChat}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Medical Consultation
        </Button>
      </div>

      {/* Chat History */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Chats</h3>
          {chats.length === 0 ? (
            <p className="text-sm text-gray-500">No chat history yet</p>
          ) : (
            chats.map((chat: Chat) => (
              <Button
                key={chat.id}
                variant="ghost"
                onClick={() => {
                  setCurrentChat(chat);
                  closeSidebar?.();
                }}
                className={`w-full justify-start text-left h-auto p-3 hover:bg-[#2a2a2a] ${
                  currentChat?.id === chat.id ? 'bg-[#2a2a2a]' : ''
                }`}
              >
                <div className="truncate">
                  <div className="text-sm font-medium text-[#f2f2f2] truncate">
                    {chat.title}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {chat.updated_at.toLocaleDateString()}
                  </div>
                </div>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>

      <Separator className="bg-[#2a2a2a]" />

      {/* Medical Templates */}
      <div className="p-4">
        <MedicalTemplates onUseTemplate={useTemplate} />
      </div>

      <Separator className="bg-[#2a2a2a]" />

      {/* Settings */}
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium">Settings</span>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="citations" className="text-sm text-gray-300">
              Show Citations
            </Label>
            <Switch
              id="citations"
              checked={showCitations}
              onCheckedChange={setShowCitations}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="timestamps" className="text-sm text-gray-300">
              Show Timestamps
            </Label>
            <Switch
              id="timestamps"
              checked={showTimestamps}
              onCheckedChange={setShowTimestamps}
            />
          </div>
        </div>
      </div>

      <Separator className="bg-[#2a2a2a]" />

      {/* About */}
      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:bg-[#2a2a2a]"
        >
          <Info className="h-4 w-4 mr-2" />
          About NelsonGPT
        </Button>
      </div>
    </div>
  );
}

export default App;
