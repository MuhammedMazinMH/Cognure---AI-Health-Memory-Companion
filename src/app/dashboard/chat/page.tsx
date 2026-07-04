// The Chat page. It simply hosts the ChatInterface component inside a
// full-height container so the message list can scroll nicely.
//
// This file does not need "use client" itself because ChatInterface is already
// a client component; this page just lays it out.

import { ChatInterface } from "@/components/chat-interface";

export default function ChatPage() {
  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="mb-4 font-heading text-3xl font-bold text-charcoal">
        Chat
      </h1>
      {/* The chat takes up the rest of the screen height. */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-background">
        <ChatInterface />
      </div>
    </div>
  );
}
