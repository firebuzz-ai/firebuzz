"use client";

import type { Id } from "@firebuzz/convex";
import { api, useQuery, useStablePaginatedQuery } from "@firebuzz/convex";

import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { use, useMemo, useState } from "react";
import { Controls } from "./_components/controls";
import { Table } from "./_components/table";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FormDataPage({ params }: PageProps) {
  const { id } = use(params);
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const campaignId = id as Id<"campaigns">;

  // Get the campaign data by campaign ID
  const campaign = useQuery(api.collections.campaigns.queries.getById, {
    id: campaignId,
  });

  // Get the form data by campaign ID
  const form = useQuery(
    api.collections.forms.queries.getByCampaignId,
    campaign?.type === "lead-generation"
      ? {
          campaignId,
        }
      : "skip"
  );

  // Get submissions with pagination
  const {
    results: submissions,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.collections.forms.submissions.queries.getPaginatedByCampaignId,
    campaign?.type === "lead-generation"
      ? {
          campaignId,
          sortOrder,
          campaignEnvironment: isPreview
            ? ("preview" as const)
            : ("production" as const),
        }
      : "skip",
    {
      initialNumItems: 10,
    }
  );

  // Transform form schema for the table
  const formSchema = useMemo(() => {
    const schema = form?.nodes?.find((node) => node.type === "form")?.data
      .schema;
    if (!schema) return [];
    return schema.map((field) => ({
      id: field.id,
      title: field.title,
      type: field.type,
      inputType: field.inputType,
      required: field.required,
    }));
  }, [form?.nodes]);

  const loadMoreHandler = async () => {
    if (status === "CanLoadMore") {
      void loadMore(10);
    }
  };

  if (campaign && campaign.type !== "lead-generation") {
    return (
      <div className="flex flex-1 justify-center items-center">
        <InfoBox variant="info" iconPlacement="top" className="max-w-md">
          <h3 className="text-lg font-medium text-primary">
            Data is not available
          </h3>
          <p className="text-sm text-muted-foreground">
            This campaign doesn't have a form so data is not available. In order
            to collect data, you need to create a lead generation campaign.
          </p>
        </InfoBox>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex flex-1 justify-center items-center">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="flex overflow-hidden flex-col flex-1 max-w-full max-h-full">
      <Controls
        isPreview={isPreview}
        setIsPreview={setIsPreview}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
      />

      {/* Table */}
      <div className="flex overflow-hidden flex-col flex-1 max-w-full max-h-full">
        {status === "LoadingFirstPage" ? (
          <div className="flex flex-1 justify-center items-center">
            <Spinner size="sm" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="flex flex-1 justify-center items-center">
            <p className="text-sm text-center text-muted-foreground">
              No form submissions found.
            </p>
          </div>
        ) : (
          <Table
            data={submissions}
            selection={selection}
            setSelection={setSelection}
            loadMoreHandler={loadMoreHandler}
            formSchema={formSchema}
          />
        )}
      </div>
    </div>
  );
}
