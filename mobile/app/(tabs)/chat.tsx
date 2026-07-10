// Chat tab — the native counterpart of the web chat
// (src/app/dashboard/chat/page.tsx + src/components/chat-interface.tsx).
// Same message model, same empty state, same "Thinking…" indicator, same
// error handling (errors become assistant messages).

import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Sparkles } from "lucide-react-native";
import { ScreenHeader } from "../../components/screen-header";
import { askQuestion } from "../../lib/api";
import { colors, fonts, radius } from "../../lib/theme";
import type { ChatMessage } from "../../lib/types";

// RN Hermes may not expose crypto.randomUUID — simple unique id fallback.
let idCounter = 0;
function makeId(): string {
  idCounter += 1;
  return `msg-${Date.now()}-${idCounter}`;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <View style={[styles.messageRow, isUser ? styles.rowEnd : styles.rowStart]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={isUser ? styles.bubbleUserText : styles.bubbleAssistantText}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  // The full conversation, the current input text, and a loading flag —
  // same state model as the web ChatInterface.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const listRef = useRef<FlatList<ChatMessage>>(null);

  const scrollToEnd = useCallback(() => {
    // Small delay lets the list render the new row first.
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const handleSend = useCallback(async () => {
    const question = input.trim();
    if (!question || loading) return;

    // Add the user's message to the screen right away — same as web.
    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: question,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    scrollToEnd();

    try {
      const data = await askQuestion(question);
      const assistantMessage: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: data.answer,
        context: data.context,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      // Server errors surface as an assistant message — same as web
      // ("Sorry, something went wrong." / "I couldn't reach the server.").
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content:
            err instanceof Error && err.message
              ? err.message
              : "I couldn't reach the server. Please try again.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }, [input, loading, scrollToEnd]);

  const canSend = !loading && input.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Chat"
        subtitle="Ask anything about your health history and get grounded answers."
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        {messages.length === 0 && !loading ? (
          // Friendly empty state shown before the first question — same as web.
          <View style={styles.empty}>
            <Sparkles size={40} color={colors.sage} />
            <Text style={styles.emptyTitle}>Ask about your health</Text>
            <Text style={styles.emptyBody}>
              {`Try \u201cWhat medications am I taking?\u201d or \u201cSummarize my last visit.\u201d`}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => scrollToEnd()}
            ListFooterComponent={
              loading ? (
                <View style={[styles.messageRow, styles.rowStart]}>
                  <View style={[styles.bubble, styles.bubbleAssistant, styles.thinking]}>
                    <ActivityIndicator size="small" color={colors.mutedForeground} />
                    <Text style={styles.thinkingText}>Thinking…</Text>
                  </View>
                </View>
              ) : null
            }
          />
        )}

        {/* The input row pinned to the bottom — same as web. */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Cognure about your health…"
            placeholderTextColor={colors.mutedForeground}
            editable={!loading}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            accessibilityLabel="Ask Cognure about your health"
          />
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Send size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  list: {
    padding: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: "row",
  },
  rowEnd: { justifyContent: "flex-end" },
  rowStart: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "80%",
    borderRadius: radius["2xl"],
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: colors.sage,
  },
  bubbleAssistant: {
    backgroundColor: colors.card,
    shadowColor: colors.charcoal,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bubbleUserText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: "#ffffff",
  },
  bubbleAssistantText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.charcoal,
  },
  thinking: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  thinkingText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 32,
  },
  emptyTitle: {
    marginTop: 8,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.charcoal,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.charcoal,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
