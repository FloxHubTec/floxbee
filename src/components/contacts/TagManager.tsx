import React, { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Tag,
    Trash2,
    Edit2,
    Plus,
    Search,
    Loader2,
    Check,
    X
} from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TagManagerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const TagManager: React.FC<TagManagerProps> = ({ open, onOpenChange }) => {
    const { contacts, isLoading } = useContacts();
    const [searchQuery, setSearchQuery] = useState('');
    const [editingTag, setEditingTag] = useState<string | null>(null);
    const [newTagName, setNewTagName] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Lista de tags únicas
    const availableTags = useMemo(() => {
        const allTags = contacts?.flatMap(c => c.tags || []) || [];
        return Array.from(new Set(allTags)).sort();
    }, [contacts]);

    const filteredTags = availableTags.filter(tag =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // RENOVAR TAG GLOBALMENTE
    const handleRenameTag = async (oldName: string) => {
        if (!newTagName.trim() || newTagName === oldName) {
            setEditingTag(null);
            return;
        }

        setIsUpdating(true);
        try {
            // Buscamos todos os contatos que possuem a tag antiga
            const contactsToUpdate = contacts?.filter(c => c.tags?.includes(oldName)) || [];

            for (const contact of contactsToUpdate) {
                const newTags = contact.tags?.map(t => t === oldName ? newTagName.trim() : t) || [];
                const { error } = await supabase
                    .from('contacts')
                    .update({ tags: newTags })
                    .eq('id', contact.id);

                if (error) throw error;
            }

            toast.success(`Tag "${oldName}" renomeada para "${newTagName}"`);
            setEditingTag(null);
            setNewTagName('');
        } catch (error: any) {
            toast.error("Erro ao renomear tag: " + error.message);
        } finally {
            setIsUpdating(false);
        }
    };

    // DELETAR TAG GLOBALMENTE
    const handleDeleteTag = async (tagName: string) => {
        if (!confirm(`Tem certeza que deseja remover a tag "${tagName}" de TODOS os contatos?`)) return;

        setIsUpdating(true);
        try {
            const contactsToUpdate = contacts?.filter(c => c.tags?.includes(tagName)) || [];

            for (const contact of contactsToUpdate) {
                const newTags = contact.tags?.filter(t => t !== tagName) || [];
                const { error } = await supabase
                    .from('contacts')
                    .update({ tags: newTags })
                    .eq('id', contact.id);

                if (error) throw error;
            }

            toast.success(`Tag "${tagName}" removida de todos os contatos`);
        } catch (error: any) {
            toast.error("Erro ao deletar tag: " + error.message);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-primary" />
                        Gerenciar Tags
                    </DialogTitle>
                    <DialogDescription>
                        Renomeie ou exclua tags globalmente de todos os contatos.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar tags..."
                            className="pl-10 h-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                        {isLoading || isUpdating ? (
                            <div className="flex flex-col items-center justify-center py-8 space-y-2">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                <p className="text-xs text-muted-foreground">Processando alterações...</p>
                            </div>
                        ) : filteredTags.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                Nenhuma tag encontrada.
                            </div>
                        ) : (
                            filteredTags.map((tag) => (
                                <div
                                    key={tag}
                                    className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border group"
                                >
                                    {editingTag === tag ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <Input
                                                autoFocus
                                                className="h-8 text-sm"
                                                value={newTagName}
                                                onChange={(e) => setNewTagName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleRenameTag(tag);
                                                    if (e.key === 'Escape') setEditingTag(null);
                                                }}
                                            />
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleRenameTag(tag)}>
                                                <Check className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setEditingTag(null)}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="font-normal">
                                                    {tag}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground">
                                                    ({contacts?.filter(c => c.tags?.includes(tag)).length} contatos)
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    onClick={() => {
                                                        setEditingTag(tag);
                                                        setNewTagName(tag);
                                                    }}
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteTag(tag)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
