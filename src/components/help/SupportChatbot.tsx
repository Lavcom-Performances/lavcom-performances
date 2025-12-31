import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SupportChatbotProps {
  language?: "fr" | "en";
}

export function SupportChatbot({ language = "fr" }: SupportChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: "assistant", content: welcomeMessage }]);
    }
  }, [isOpen, welcomeMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

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
          messages: newMessages.filter(m => m.role !== "assistant" || m.content !== welcomeMessage).map(m => ({
            role: m.role,
            content: m.content,
          })),
          language,
        },
      });

      if (error) throw error;

      if (data?.error) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.error 
        }]);
      } else if (data?.message) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.message 
        }]);
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: language === "fr" 
          ? "Désolé, une erreur est survenue. Veuillez réessayer."
          : "Sorry, an error occurred. Please try again."
      }]);
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

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
        size="icon"
        aria-label={language === "fr" ? "Ouvrir l'assistant" : "Open assistant"}
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[360px] max-w-[calc(100vw-3rem)] shadow-2xl z-50 flex flex-col max-h-[500px]">
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
      </CardHeader>
      
      <CardContent className="p-0 flex flex-col flex-1 min-h-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, i) => (
              <div
                key={i}
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
      </CardContent>
    </Card>
  );
}
