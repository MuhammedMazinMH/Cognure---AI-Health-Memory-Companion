// "Add a memory" upload modal — full parity with the web app's
// src/components/upload-modal.tsx:
//
//   pick file (PDF/TXT) → extract text (PDF, client-side) → POST /api/upload
//   → POST /api/remember → success summary with entity counts and
//   medication-interaction warnings. Errors keep the pending memorize payload
//   so "Retry Memorize" works exactly like the web.
//
// Web-specific pieces replaced with native equivalents:
//   drag-and-drop zone  -> expo-document-picker sheet
//   browser pdfjs       -> hidden WebView running the same pdfjs loop

import { useCallback, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import {
  AlertCircle,
  CheckCircle2,
  UploadCloud,
  X,
} from "lucide-react-native";
import { rememberText, uploadDocument } from "../lib/api";
import { colors, fonts, radius } from "../lib/theme";
import { PdfExtractor, type PdfExtractorHandle } from "./pdf-extractor";

// ── Progress steps (same order and labels as web) ───────────────────────────

type Step = "extracting" | "uploading" | "memorizing" | "done";
const STEPS: Step[] = ["extracting", "uploading", "memorizing", "done"];

const STEP_LABELS: Record<Step, string> = {
  extracting: "Extracting text",
  uploading: "Uploading document",
  memorizing: "Memorizing entities",
  done: "Done!",
};

function StepIndicator({
  step,
  current,
}: {
  step: Step;
  current: Step | "idle" | "error";
}) {
  const currentIdx = STEPS.indexOf(current as Step);
  const stepIdx = STEPS.indexOf(step);

  const isComplete = currentIdx > stepIdx;
  const isActive = current === step;

  return (
    <View style={stepStyles.row}>
      <View
        style={[
          stepStyles.badge,
          isComplete && stepStyles.badgeComplete,
          isActive && stepStyles.badgeActive,
        ]}
      >
        {isComplete ? (
          <CheckCircle2 size={14} color="#ffffff" />
        ) : (
          <Text
            style={[
              stepStyles.badgeText,
              isActive && { color: colors.sage },
            ]}
          >
            {stepIdx + 1}
          </Text>
        )}
      </View>
      <Text
        style={[
          stepStyles.label,
          isActive && stepStyles.labelActive,
          isComplete && { color: colors.sage },
        ]}
      >
        {STEP_LABELS[step]}
        {isActive ? "…" : ""}
      </Text>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeComplete: { backgroundColor: colors.sage },
  badgeActive: {
    backgroundColor: "rgba(138, 154, 135, 0.2)", // sage/20
    borderWidth: 2,
    borderColor: colors.sage,
  },
  badgeText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  labelActive: {
    fontFamily: fonts.bodySemi,
    color: colors.charcoal,
  },
});

// ── Main modal ───────────────────────────────────────────────────────────────

interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called after a successful memorize so screens can refetch data. */
  onSuccess?: () => void;
}

export function UploadModal({ visible, onClose, onSuccess }: UploadModalProps) {
  const extractorRef = useRef<PdfExtractorHandle>(null);

  const [status, setStatus] = useState<"idle" | Step | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [entityCounts, setEntityCounts] = useState<Record<string, number>>({});
  const [interactionCount, setInteractionCount] = useState(0);

  // Held between upload and memorize so "Retry Memorize" works (same as web).
  const pendingMemorize = useRef<{ content: string; documentId: string } | null>(
    null
  );

  const resetModal = useCallback(() => {
    setStatus("idle");
    setError(null);
    setFileName(null);
    setEntityCounts({});
    setInteractionCount(0);
    pendingMemorize.current = null;
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    resetModal();
  }, [onClose, resetModal]);

  // Memorize step — called automatically or from "Retry Memorize".
  const runMemorize = useCallback(
    async (content: string, documentId: string) => {
      setStatus("memorizing");
      try {
        const rememberData = await rememberText(content, documentId);

        // Reduce the returned entities array into a per-type count map so the
        // success banner can show "Found: 3 medications, 1 diagnosis." etc.
        const counts = (rememberData.entities ?? []).reduce<Record<string, number>>(
          (acc, entity) => {
            acc[entity.type] = (acc[entity.type] ?? 0) + 1;
            return acc;
          },
          {}
        );
        setEntityCounts(counts);
        setInteractionCount((rememberData.interactions ?? []).length);
        setStatus("done");
        onSuccess?.();

        // Auto-close after 2.5 s (same as web).
        setTimeout(() => {
          handleClose();
        }, 2500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Entity extraction failed.");
        setStatus("error");
      }
    },
    [onSuccess, handleClose]
  );

  // Full flow: pick → extract (PDF) → upload → memorize.
  const handlePick = useCallback(async () => {
    setError(null);
    pendingMemorize.current = null;

    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "text/plain"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const name = asset.name ?? "document";
    const mimeType =
      asset.mimeType ??
      (name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/plain");

    const isAllowed =
      mimeType === "application/pdf" ||
      mimeType === "text/plain" ||
      /\.(pdf|txt)$/i.test(name);

    if (!isAllowed) {
      setError("Please upload a PDF or TXT file.");
      setStatus("error");
      return;
    }

    setFileName(name);

    try {
      // Step 1: extract text (PDF only, client-side — same as web).
      setStatus("extracting");
      const isPdf =
        mimeType === "application/pdf" || name.toLowerCase().endsWith(".pdf");

      let extractedText: string | undefined;
      if (isPdf) {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (!extractorRef.current) {
          throw new Error("PDF reader is not ready yet. Please try again.");
        }
        extractedText = await extractorRef.current.extractText(base64);
      }

      // Step 2: upload the file.
      setStatus("uploading");
      const document = await uploadDocument(name, mimeType, asset.uri, extractedText);

      // Step 3: auto-memorize.
      pendingMemorize.current = {
        content: document.content,
        documentId: document.id,
      };
      await runMemorize(document.content, document.id);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }, [runMemorize]);

  const busy =
    status === "extracting" || status === "uploading" || status === "memorizing";

  const entitySummary = Object.entries(entityCounts)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${count} ${type}${count !== 1 ? "s" : ""}`)
    .join(", ");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={busy ? undefined : handleClose}
    >
      {/* Hidden WebView that performs pdfjs extraction. */}
      <PdfExtractor ref={extractorRef} />

      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Add a memory</Text>
              <Text style={styles.description}>
                Upload a health document (PDF or TXT). Cognure will read it and
                remember the important details automatically.
              </Text>
            </View>
            {!busy && (
              <TouchableOpacity
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.closeButton}
              >
                <X size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView bounces={false} contentContainerStyle={{ gap: 14 }}>
            {/* Pick zone — only interactive when idle or after an error */}
            {(status === "idle" || status === "error") && (
              <Pressable
                accessibilityRole="button"
                onPress={handlePick}
                style={({ pressed }) => [
                  styles.dropZone,
                  pressed && styles.dropZonePressed,
                ]}
              >
                <UploadCloud size={40} color={colors.sage} />
                <View style={{ alignItems: "center" }}>
                  <Text style={styles.dropTitle}>Choose a file</Text>
                  <Text style={styles.dropSub}>tap to browse your device</Text>
                </View>
                <Text style={styles.dropHint}>PDF or TXT</Text>
              </Pressable>
            )}

            {/* Progress steps */}
            {busy && (
              <View style={styles.progressBox}>
                <Text style={styles.progressTitle}>
                  Processing <Text style={{ color: colors.sage }}>{fileName}</Text>
                </Text>
                <StepIndicator step="extracting" current={status} />
                <StepIndicator step="uploading" current={status} />
                <StepIndicator step="memorizing" current={status} />
                <StepIndicator step="done" current={status} />
              </View>
            )}

            {/* Success */}
            {status === "done" && (
              <View style={styles.successBox}>
                <View style={styles.successHeader}>
                  <CheckCircle2 size={20} color={colors.sage} />
                  <Text style={styles.successTitle}>Memorized successfully!</Text>
                </View>
                <Text style={styles.successBody}>
                  <Text style={{ fontFamily: fonts.bodyMedium }}>{fileName}</Text>{" "}
                  has been processed.
                </Text>
                {entitySummary ? (
                  <Text style={styles.successMeta}>Found: {entitySummary}</Text>
                ) : null}
                {interactionCount > 0 && (
                  <Text style={styles.warningText}>
                    {interactionCount} medication interaction warning
                    {interactionCount !== 1 ? "s" : ""} detected — check the
                    Memory Graph.
                  </Text>
                )}
              </View>
            )}

            {/* Error with optional Retry Memorize */}
            {status === "error" && error && (
              <View style={styles.errorBox}>
                <View style={styles.errorRow}>
                  <AlertCircle size={18} color={colors.coral} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
                {pendingMemorize.current && (
                  <TouchableOpacity
                    style={styles.retryButton}
                    accessibilityRole="button"
                    onPress={() => {
                      const p = pendingMemorize.current;
                      if (p) runMemorize(p.content, p.documentId);
                    }}
                  >
                    <Text style={styles.retryText}>Retry Memorize</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── "Add Memory" trigger button (web: sage button with UploadCloud icon) ────

export function AddMemoryButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.addButton}
      onPress={onPress}
      accessibilityRole="button"
    >
      <UploadCloud size={15} color="#ffffff" />
      <Text style={styles.addButtonText}>Add Memory</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(44, 44, 42, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "85%",
    backgroundColor: colors.card,
    borderRadius: radius["2xl"],
    padding: 20,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  title: {
    fontFamily: fonts.headingSemi,
    fontSize: 20,
    color: colors.charcoal,
  },
  description: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  dropZone: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  dropZonePressed: {
    borderColor: "rgba(138, 154, 135, 0.6)", // sage/60
    backgroundColor: "rgba(231, 224, 208, 0.4)", // accent/40
  },
  dropTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.charcoal,
  },
  dropSub: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  dropHint: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.mutedForeground,
  },
  progressBox: {
    gap: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(236, 230, 216, 0.3)", // muted/30
    padding: 18,
  },
  progressTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.charcoal,
    marginBottom: 2,
  },
  successBox: {
    gap: 8,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(138, 154, 135, 0.3)", // sage/30
    backgroundColor: "rgba(138, 154, 135, 0.05)", // sage/5
    padding: 18,
  },
  successHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  successTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.sage,
  },
  successBody: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.charcoal,
  },
  successMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  warningText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: "#dc2626", // red-600, same as web warning
  },
  errorBox: {
    gap: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(224, 122, 95, 0.3)", // coral/30
    backgroundColor: "rgba(224, 122, 95, 0.05)", // coral/5
    padding: 16,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.coral,
  },
  retryButton: {
    alignSelf: "flex-start",
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: "#ffffff",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.xl,
    backgroundColor: colors.sage,
  },
  addButtonText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: "#ffffff",
  },
});
