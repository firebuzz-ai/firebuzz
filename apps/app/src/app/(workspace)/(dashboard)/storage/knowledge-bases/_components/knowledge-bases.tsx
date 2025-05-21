"use client";
import { KnowledgeBaseTabs } from "@/components/navigation/knowledge-bases/tabs";
import { type Id, api, useCachedRichQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useEffect, useMemo, useState } from "react";

import { NewMemoryItemModal } from "@/components/modals/knowledge-base/new-memory/modal";
import { KnowledgeBaseSettingsSheet } from "@/components/sheets/settings/knowledge-bases/sheet";
import { NewDocumentModal } from "../../documents/_components/modals/new-document/modal";
import { MemoryList } from "./memory-list";
import { NewKnowledgeBaseModal } from "./modals/new-knowledge-base/modal";

export const KnowledgeBases = () => {
  const [id, setId] = useState<Id<"knowledgeBases">>();
  const { data: knowledgeBases, isPending: isLoading } = useCachedRichQuery(
    api.collections.storage.knowledgeBases.queries.getAll,
    {
      showHidden: false,
    }
  );

  const tabs = useMemo(() => {
    return knowledgeBases?.map((knowledgeBase) => ({
      value: knowledgeBase._id,
      href: `/storage/knowledge-bases/${knowledgeBase._id}`,
      label: knowledgeBase.name,
    }));
  }, [knowledgeBases]);

  useEffect(() => {
    if (knowledgeBases && knowledgeBases.length > 0) {
      setId(knowledgeBases[0]._id);
    }
  }, [knowledgeBases]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col flex-1 max-w-full max-h-full overflow-hidden">
      <KnowledgeBaseTabs tabs={tabs ?? []} id={id} setId={setId} />
      <MemoryList knowledgeBaseId={id} />
      {/* Modal */}
      <NewKnowledgeBaseModal />
      {id && <KnowledgeBaseSettingsSheet />}
      <NewDocumentModal />
      <NewMemoryItemModal />
    </div>
  );
};
