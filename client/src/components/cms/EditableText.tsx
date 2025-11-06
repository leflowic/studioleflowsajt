import { useState, useRef, useEffect } from "react";
import { useEditMode } from "@/contexts/EditModeContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditableTextProps {
  page: string;
  section: string;
  contentKey: string;
  value: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
  multiline?: boolean;
  placeholder?: string;
}

export function EditableText({
  page,
  section,
  contentKey,
  value,
  className = "",
  as: Tag = "p",
  multiline = false,
  placeholder = "Kliknite da izmenite tekst..."
}: EditableTextProps) {
  const { isEditMode } = useEditMode();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const updateMutation = useMutation({
    mutationFn: async (newValue: string) => {
      const response = await fetch("/api/cms/content/single", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page,
          section,
          contentKey,
          contentValue: newValue,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Greška pri čuvanju izmena");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cms/content`] });
      toast({
        title: "Sačuvano",
        description: "Izmene su uspešno sačuvane",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Došlo je do greške pri čuvanju izmena",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (editValue.trim() === "") {
      toast({
        title: "Greška",
        description: "Tekst ne može biti prazan",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate(editValue);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!isEditMode) {
    return <Tag className={className}>{value}</Tag>;
  }

  if (isEditing) {
    return (
      <div className="relative group">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`${className} w-full border-2 border-primary rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]`}
            placeholder={placeholder}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`${className} w-full border-2 border-primary rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary`}
            placeholder={placeholder}
          />
        )}
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="gap-1"
          >
            <Check className="w-4 h-4" />
            Sačuvaj
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={updateMutation.isPending}
            className="gap-1"
          >
            <X className="w-4 h-4" />
            Otkaži
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative group cursor-pointer hover:bg-primary/5 rounded-lg transition-colors p-2 -m-2"
      onClick={() => setIsEditing(true)}
    >
      <Tag className={className}>{value || placeholder}</Tag>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-primary text-primary-foreground rounded-md p-1">
          <Edit2 className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}
