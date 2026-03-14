"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddHostButtonProps {
  onClick: () => void;
}

export default function AddHostButton({ onClick }: AddHostButtonProps) {
  return (
    <Button onClick={onClick}>
      <Plus className="mr-2 h-4 w-4" />
      Add Host
    </Button>
  );
}
