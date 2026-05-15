"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createTemplate,
  deleteTemplate,
  createSection,
  deleteSection,
  createItem,
  deleteItem,
} from "@/lib/actions/nursery";
import type { NurseryItem, NurserySection, NurseryTemplate } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionWithItems = NurserySection & { items: NurseryItem[] };
type TemplateWithSections = NurseryTemplate & { sections: SectionWithItems[] };

interface TemplateBuilderProps {
  template: TemplateWithSections | null;
  classId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TemplateBuilder({ template, classId }: TemplateBuilderProps) {
  const router = useRouter();

  const [templateName, setTemplateName] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [addingItemForSection, setAddingItemForSection] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  // Granular loading key per action so multiple spinners can't overlap
  const [loading, setLoading] = useState<string | null>(null);

  // ── Create template ──────────────────────────────────────────────────────────

  async function handleCreateTemplate() {
    if (!templateName.trim()) return;
    setLoading("create-template");
    const result = await createTemplate(classId, templateName.trim());
    setLoading(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      setTemplateName("");
      toast.success("Template created");
      router.refresh();
    }
  }

  // ── Delete template ──────────────────────────────────────────────────────────

  async function handleDeleteTemplate() {
    if (!template) return;
    if (!confirm("Delete this entire template including all sections and items?")) return;
    setLoading("delete-template");
    const result = await deleteTemplate(template.id, classId);
    setLoading(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Template deleted");
      router.refresh();
    }
  }

  // ── Add section ──────────────────────────────────────────────────────────────

  async function handleCreateSection() {
    if (!template || !newSectionName.trim()) return;
    setLoading("create-section");
    const fd = new FormData();
    fd.append("name", newSectionName.trim());
    fd.append("order", String(template.sections.length));
    const result = await createSection(template.id, classId, fd);
    setLoading(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      setNewSectionName("");
      toast.success("Section added");
      router.refresh();
    }
  }

  // ── Delete section ───────────────────────────────────────────────────────────

  async function handleDeleteSection(sectionId: string) {
    if (!confirm("Delete this section and all its items?")) return;
    setLoading(`del-sec-${sectionId}`);
    const result = await deleteSection(sectionId, classId);
    setLoading(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Section deleted");
      router.refresh();
    }
  }

  // ── Add item ─────────────────────────────────────────────────────────────────

  async function handleCreateItem(sectionId: string, existingCount: number) {
    if (!newItemName.trim()) return;
    setLoading(`add-item-${sectionId}`);
    const result = await createItem(sectionId, classId, newItemName.trim(), existingCount);
    setLoading(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      setNewItemName("");
      setAddingItemForSection(null);
      toast.success("Item added");
      router.refresh();
    }
  }

  // ── Delete item ──────────────────────────────────────────────────────────────

  async function handleDeleteItem(itemId: string) {
    setLoading(`del-item-${itemId}`);
    const result = await deleteItem(itemId, classId);
    setLoading(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Item removed");
      router.refresh();
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="border rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground text-sm">Assessment Template</h2>
        </div>
        {template && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-destructive hover:text-destructive text-xs"
            onClick={handleDeleteTemplate}
            disabled={loading === "delete-template"}
          >
            {loading === "delete-template" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 mr-1" />
            )}
            Delete template
          </Button>
        )}
      </div>

      {!template ? (
        /* ── No template yet ──────────────────────────────────────────────────── */
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            No assessment template yet. Create one to start adding sections and items.
          </p>
          <div className="flex items-center gap-2 max-w-sm">
            <Input
              placeholder="Template name (e.g. Nursery Assessment)"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateTemplate()}
            />
            <Button
              size="sm"
              onClick={handleCreateTemplate}
              disabled={!templateName.trim() || loading === "create-template"}
            >
              {loading === "create-template" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              Create
            </Button>
          </div>
        </div>
      ) : (
        /* ── Existing template ────────────────────────────────────────────────── */
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {template.name}
          </p>

          {/* Section list */}
          {template.sections.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No sections yet — add your first section below.
            </p>
          )}

          <div className="space-y-2">
            {template.sections.map((section) => (
              <div
                key={section.id}
                className="border rounded-md p-3 space-y-2 bg-muted/20"
              >
                {/* Section header */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{section.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteSection(section.id)}
                    disabled={loading === `del-sec-${section.id}`}
                  >
                    {loading === `del-sec-${section.id}` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>

                {/* Items */}
                {section.items.length > 0 && (
                  <ul className="space-y-1 ml-2">
                    {section.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between group"
                      >
                        <span className="text-sm text-muted-foreground">
                          &bull; {item.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={loading === `del-item-${item.id}`}
                        >
                          {loading === `del-item-${item.id}` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Add item inline form */}
                {addingItemForSection === section.id ? (
                  <div className="flex items-center gap-2 ml-2 mt-1">
                    <Input
                      autoFocus
                      placeholder="Item name"
                      className="h-7 text-sm"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          handleCreateItem(section.id, section.items.length);
                        if (e.key === "Escape") {
                          setAddingItemForSection(null);
                          setNewItemName("");
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-7 px-2"
                      onClick={() =>
                        handleCreateItem(section.id, section.items.length)
                      }
                      disabled={
                        !newItemName.trim() ||
                        loading === `add-item-${section.id}`
                      }
                    >
                      {loading === `add-item-${section.id}` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Add"
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => {
                        setAddingItemForSection(null);
                        setNewItemName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 ml-2 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setAddingItemForSection(section.id);
                      setNewItemName("");
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add item
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Add section */}
          <div className="flex items-center gap-2 max-w-sm pt-1">
            <Input
              placeholder="New section name"
              className="h-8 text-sm"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateSection()}
            />
            <Button
              size="sm"
              className="h-8"
              onClick={handleCreateSection}
              disabled={!newSectionName.trim() || loading === "create-section"}
            >
              {loading === "create-section" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5 mr-1" />
              )}
              Add Section
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
