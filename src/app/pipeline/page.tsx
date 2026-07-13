"use client";
import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PipelineBoard } from "@/components/features/pipeline/PipelineBoard";
import { Toaster } from "sonner";

export default function PipelinePage() {
  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        <PipelineBoard />
      </div>
      <Toaster position="top-right" richColors />
    </AppLayout>
  );
}