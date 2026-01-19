import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Send, X, Loader2, History, Trash2, ArrowRight, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { parseAIError, formatAIErrorMessage } from "@/lib/ai/errorHandling";

interface ChatAction {
  label: string;
  path: string;
}

interface TicketRequest {
  subject: string;
  message: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: ChatAction[];
  ticketRequest?: TicketRequest;
}

interface Conversation {
  id: string;
  messages: Message[];
  createdAt: string;
  preview: string;
}

interface SupportChatbotProps {
  language?: "fr" | "en";
  onScrollToContact?: () => void;
}

const STORAGE_KEY = "lavcom_chatbot_history";
const MAX_CONVERSATIONS = 10;

export function SupportChatbot({ language = "fr", onScrollToContact }: SupportChatbotProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const welcomeMessage = language === "fr"
    ? "Bonjour ! Je suis l'assistant Lavcom. Comment puis-je vous aider ?"
    : "Hello! I'm the Lavcom assistant. How can I help you?";

  const placeholderText = language === "fr"
    ? "Posez votre question..."
    : "Ask your question...";

  const suggestedQuestions = language === "fr"
    ? [
        "Comment importer un CSV ?",
        "C'est quoi CB vs ESP ?",
        "Où voir mon CA ?",
      ]
    : [
        "How do I import a CSV?",
        "What is Card vs Cash?",
        "Where can I see my revenue?",
      ];

  // Load conversations from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Conversation[];
        setConversations(parsed);
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
  }, []);

  // Save conversations to localStorage
  const saveConversations = useCallback((convs: Conversation[]) => {
    try {
      const toSave = convs.slice(0, MAX_CONVERSATIONS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      setConversations(toSave);
    } catch (e) {
      console.error("Failed to save chat history:", e);
    }
  }, []);

  // Initialize welcome message when opening
  useEffect(() => {
    if (isOpen && messages.length === 0 && !currentConversationId) {
      setMessages([{ role: "assistant", content: welcomeMessage }]);
    }
  }, [isOpen, welcomeMessage, currentConversationId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input
  useEffect(() => {
    if (isOpen && !showHistory && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, showHistory]);

  const generateConversationId = () => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const getPreview = (msgs: Message[]) => {
    const userMsg = msgs.find(m => m.role === "user");
    if (userMsg) {
      return userMsg.content.length > 50 ? userMsg.content.substring(0, 50) + "..." : userMsg.content;
    }
    return language === "fr" ? "Nouvelle conversation" : "New conversation";
  };

  const saveCurrentConversation = useCallback((msgs: Message[]) => {
    if (msgs.length <= 1) return;

    const convId = currentConversationId || generateConversationId();
    
    const newConv: Conversation = {
      id: convId,
      messages: msgs,
      createdAt: new Date().toISOString(),
      preview: getPreview(msgs),
    };

    const existingIndex = conversations.findIndex(c => c.id === convId);
    let updated: Conversation[];
    
    if (existingIndex >= 0) {
      updated = [...conversations];
      updated[existingIndex] = newConv;
    } else {
      updated = [newConv, ...conversations];
    }

    saveConversations(updated);
    if (!currentConversationId) {
      setCurrentConversationId(convId);
    }
  }, [currentConversationId, conversations, saveConversations, language]);

  const createSupportTicket = async (ticketRequest: TicketRequest) => {
    setIsCreatingTicket(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email || "";
      const userName = userData?.user?.user_metadata?.first_name || 
                       userData?.user?.email?.split("@")[0] || 
                       (language === "fr" ? "Utilisateur" : "User");

      // Get conversation context
      const conversationContext = messages
        .filter(m => m.role === "user")
        .map(m => m.content)
        .join("\n---\n");

      const fullMessage = `${ticketRequest.message}\n\n--- Contexte de la conversation ---\n${conversationContext}`;

      const { error } = await supabase
        .from("contact_messages")
        .insert({
          name: userName,
          email: userEmail,
          subject: `[Chatbot] ${ticketRequest.subject}`,
          message: fullMessage,
          status: "new",
        });

      if (error) throw error;

      toast({
        title: language === "fr" ? "Ticket créé" : "Ticket created",
        description: language === "fr" 
          ? "Votre demande a été transmise. Nous vous répondrons rapidement."
          : "Your request has been submitted. We'll get back to you shortly.",
      });

      // Add confirmation message to chat
      const confirmationMsg: Message = {
        role: "assistant",
        content: language === "fr"
          ? "✅ Votre ticket de support a été créé avec succès. Notre équipe vous contactera sous peu."
          : "✅ Your support ticket has been created successfully. Our team will contact you shortly.",
      };
      const updatedMessages = [...messages, confirmationMsg];
      setMessages(updatedMessages);
      saveCurrentConversation(updatedMessages);

    } catch (error) {
      console.error("Failed to create ticket:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: language === "fr" 
          ? "Impossible de créer le ticket. Veuillez utiliser le formulaire ci-dessous."
          : "Could not create ticket. Please use the form below.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("support-chatbot", {
        body: {
          messages: newMessages
            .filter(m => m.role !== "assistant" || m.content !== welcomeMessage)
            .map(m => ({ role: m.role, content: m.content })),
          language,
        },
      });

      if (error) throw error;

      if (data?.error) {
        const errorMsg: Message = { role: "assistant", content: data.error };
        const updatedMessages = [...newMessages, errorMsg];
        setMessages(updatedMessages);
        saveCurrentConversation(updatedMessages);
      } else if (data?.message) {
        const assistantMsg: Message = { 
          role: "assistant", 
          content: data.message,
          actions: data.actions,
          ticketRequest: data.ticketRequest,
        };
        const updatedMessages = [...newMessages, assistantMsg];
        setMessages(updatedMessages);
        saveCurrentConversation(updatedMessages);
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      
      // TAEX-210: Parse AI error with trace ID support
      const parsedError = parseAIError(error);
      const errorMessage = formatAIErrorMessage(parsedError, language);
      
      const errorMsg: Message = { 
        role: "assistant", 
        content: errorMessage
      };
      const updatedMessages = [...newMessages, errorMsg];
      setMessages(updatedMessages);
      saveCurrentConversation(updatedMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const handleActionClick = (action: ChatAction) => {
    if (action.path === "#contact-form") {
      setIsOpen(false);
      onScrollToContact?.();
    } else {
      setIsOpen(false);
      navigate(action.path);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([{ role: "assistant", content: welcomeMessage }]);
    setShowHistory(false);
  };

  const loadConversation = (conv: Conversation) => {
    setCurrentConversationId(conv.id);
    setMessages(conv.messages);
    setShowHistory(false);
  };

  const deleteConversation = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = conversations.filter(c => c.id !== convId);
    saveConversations(updated);
    if (currentConversationId === convId) {
      startNewConversation();
    }
  };

  const clearAllHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConversations([]);
    startNewConversation();
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-md max-w-[200px] text-xs text-muted-foreground">
          {language === "fr" 
            ? "Besoin d'une réponse rapide ? Essayez l'assistant."
            : "Need a quick answer? Try the assistant."}
        </div>
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          size="icon"
          aria-label={language === "fr" ? "Ouvrir l'assistant" : "Open assistant"}
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[380px] max-w-[calc(100vw-3rem)] shadow-2xl z-50 flex flex-col max-h-[520px]">
      <CardHeader className="py-3 px-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-sm font-medium">
              {language === "fr" ? "Assistant Lavcom" : "Lavcom Assistant"}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowHistory(!showHistory)}
              aria-label={language === "fr" ? "Historique" : "History"}
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsOpen(false)}
              aria-label={language === "fr" ? "Fermer" : "Close"}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex flex-col flex-1 min-h-0">
        {showHistory ? (
          <div className="flex flex-col h-full">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="text-sm font-medium">
                {language === "fr" ? "Historique" : "History"}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={startNewConversation}>
                  {language === "fr" ? "Nouvelle" : "New"}
                </Button>
                {conversations.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllHistory} className="text-destructive">
                    {language === "fr" ? "Tout effacer" : "Clear all"}
                  </Button>
                )}
              </div>
            </div>
            <ScrollArea className="flex-1">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {language === "fr" ? "Aucune conversation" : "No conversations"}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv)}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors group",
                        currentConversationId === conv.id && "bg-muted"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{conv.preview}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(conv.createdAt).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => deleteConversation(conv.id, e)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message, i) => (
                  <div key={i}>
                    <div
                      className={cn(
                        "flex",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                    {/* Action buttons */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2 ml-1">
                        {message.actions.map((action, actionIdx) => (
                          <Button
                            key={actionIdx}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 gap-1"
                            onClick={() => handleActionClick(action)}
                          >
                            {action.label}
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        ))}
                      </div>
                    )}
                    {/* Ticket creation button */}
                    {message.ticketRequest && (
                      <div className="mt-2 ml-1">
                        <Button
                          variant="default"
                          size="sm"
                          className="text-xs h-7 gap-1"
                          onClick={() => createSupportTicket(message.ticketRequest!)}
                          disabled={isCreatingTicket}
                        >
                          {isCreatingTicket ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Ticket className="h-3 w-3" />
                          )}
                          {language === "fr" ? "Créer un ticket" : "Create ticket"}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>

              {/* Suggested questions - only show at start */}
              {messages.length === 1 && !isLoading && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {language === "fr" ? "Questions fréquentes :" : "Common questions:"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((q, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => handleSuggestedQuestion(q)}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>

            <form onSubmit={handleSubmit} className="p-3 border-t flex-shrink-0">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={placeholderText}
                  disabled={isLoading}
                  className="text-sm"
                  maxLength={500}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!input.trim() || isLoading}
                  className="flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}