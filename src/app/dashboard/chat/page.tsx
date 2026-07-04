// The Chat page — full-height layout hosting the ChatInterface component.

import { ChatInterface } from "@/components/chat-interface";

export default function ChatPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="border-b border-border bg-card px-6 py-5">
        <h1 className="font-heading text-2xl font-bold text-charcoal">Chat</h1>
        <p className="mt-0.5 text-sm text-charcoal/50">
          Ask anything about your health history and get grounded answers.
        </p>
      </div>

      {/* Chat fills remaining height */}
      <div className="min-h-0 flex-1 overflow-hidden bg-background">
        <ChatInterface />
      </div>
    </div>
  );
}
