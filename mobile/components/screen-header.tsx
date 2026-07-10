// ScreenHeader — composes the shared Header with the "Add Memory" upload
// modal, mirroring the web layout where src/components/header.tsx renders
// <UploadModal /> on every dashboard page.
//
// Screens pass `onMemoryAdded` so they can refetch their data after a
// successful upload → memorize flow (same as the web's router.refresh()).

import { useState } from "react";
import { Header } from "./header";
import { AddMemoryButton, UploadModal } from "./upload-modal";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Called after a successful memorize so the screen can refetch. */
  onMemoryAdded?: () => void;
}

export function ScreenHeader({ title, subtitle, onMemoryAdded }: ScreenHeaderProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Header
        title={title}
        subtitle={subtitle}
        action={<AddMemoryButton onPress={() => setModalOpen(true)} />}
      />
      <UploadModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={onMemoryAdded}
      />
    </>
  );
}
