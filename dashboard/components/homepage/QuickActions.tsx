"use client";

import { Button } from "@/components/ui/button";
import { Plus, Rocket, Server } from "lucide-react";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { t } from "@/lib/settingsI18n";

export default function QuickActions() {
  const language = useLanguagePreference();

  return (
    <div className="flex flex-wrap gap-3">
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        {t(language, "quickActions.newProject")}
      </Button>
      <Button variant="secondary">
        <Rocket className="h-4 w-4 mr-2" />
        {t(language, "quickActions.triggerDeploy")}
      </Button>
      <Button variant="secondary">
        <Server className="h-4 w-4 mr-2" />
        {t(language, "quickActions.addHost")}
      </Button>
    </div>
  );
}
