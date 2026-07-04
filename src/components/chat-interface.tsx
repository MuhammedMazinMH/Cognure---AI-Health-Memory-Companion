// The chat window where the user asks questions about their health memory.
// CLIENT component: it manages the message list and calls /api/ask.
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Sparkles } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-client";
import type { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChatInterface() {
  const supabase = getBrowserSupabase();

  // The full conversation, the current input text, and a loading flag.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // A ref to the bottom of the list so we can auto-scroll to new messages.
  const bottomRef = useRef<HTMLDivElement>(null);

  // Whenever messages change, scroll smoothly to the newest one.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send the typed question to the API and append the answer.
  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    // Add the user's message to the screen right away.
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // We need the access token so the API knows who is asking.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();

      // Build the assistant's reply (or an error message).
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.ok
          ? data.answer
          : data.error ?? "Sorry, something went wrong.",
        context: res.ok ? data.context : undefined,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "I couldn't reach the server. Please try again.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* The scrollable list of messages. */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          // Friendly empty state shown before the first question.
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <Sparkles className="mb-3 h-10 w-10 text-sage" />
            <p className="font-medium text-charcoal">Ask about your health</p>
            <p className="mt-1 max-w-sm text-sm">
              Try “What medications am I taking?” or “Summarize my last visit.”
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              // A gentle fade + slide so messages feel alive.
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                  message.role === "user"
                    ? "bg-sage text-white"
                    : "bg-card text-charcoal shadow-sm"
                )}
              >
                {message.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator while we wait for the answer. */}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-2.5 text-sm text-muted-foreground shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking…
            </div>
          </div>
        )}

        {/* Invisible anchor we scroll to. */}
        <div ref={bottomRef} />
      </div>

      {/* The input row pinned to the bottom. */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t bg-card p-4"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Cognure about your health…"
          disabled={loading}
        />
        <Button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-sage text-white hover:bg-sage/90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
