import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  useCreateSection,
  useDeleteSection,
  useLandingSections,
  useReorderSections,
  useUpdateSection,
} from '@/hooks/useLandingSections';
import { carRowFilters, isCarRow, ROW_CATEGORIES, type RowCategory } from '@/lib/carRows';
import type { LandingSection } from '@/lib/data/types';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  LayoutDashboard,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react';

const CATEGORY_LABELS: Record<RowCategory, string> = {
  all: 'Toutes les voitures',
  SUV: 'SUV',
  Sedan: 'Berline',
  Luxury: 'Luxe',
  Electric: 'Électrique',
};

interface Draft {
  title: string;
  subtitle: string;
  category: RowCategory;
  limit: number;
}

const toDraft = (section: LandingSection): Draft => ({
  title: section.title,
  subtitle: String(section.content.subtitle ?? ''),
  category: (section.content.category as RowCategory) ?? 'all',
  limit: carRowFilters(section).limit ?? 3,
});

const AdminPageBuilder = () => {
  const { data: sections, isLoading } = useLandingSections();
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const reorderSections = useReorderSections();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<RowCategory>('SUV');
  const [newLimit, setNewLimit] = useState(3);

  const rows = (sections ?? [])
    .filter(isCarRow)
    .sort((a, b) => a.sort_order - b.sort_order);

  const getDraft = (section: LandingSection): Draft =>
    drafts[section.id] ?? toDraft(section);

  const setDraft = (section: LandingSection, patch: Partial<Draft>) =>
    setDrafts((prev) => ({
      ...prev,
      [section.id]: { ...getDraft(section), ...patch },
    }));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const newOrder = rows.map((section, i) => ({
      id: section.id,
      sort_order:
        i === index
          ? rows[target].sort_order
          : i === target
            ? rows[index].sort_order
            : section.sort_order,
    }));
    reorderSections.mutate(newOrder, {
      onSuccess: () => toast({ title: 'Section déplacée' }),
    });
  };

  const toggleVisibility = (section: LandingSection) => {
    updateSection.mutate(
      { id: section.id, is_visible: !section.is_visible },
      {
        onSuccess: () =>
          toast({ title: section.is_visible ? 'Section masquée' : 'Section affichée' }),
      }
    );
  };

  const save = (section: LandingSection) => {
    const draft = getDraft(section);
    updateSection.mutate(
      {
        id: section.id,
        title: draft.title,
        content: {
          category: draft.category,
          limit: draft.limit,
          subtitle: draft.subtitle,
        },
      },
      {
        onSuccess: () => {
          toast({ title: `${draft.title} enregistrée` });
          setDrafts((prev) => {
            const next = { ...prev };
            delete next[section.id];
            return next;
          });
        },
        onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
      }
    );
  };

  const remove = (section: LandingSection) => {
    if (!window.confirm(`Supprimer la section « ${section.title} » ?`)) return;
    deleteSection.mutate(section.id, {
      onSuccess: () => toast({ title: 'Section supprimée' }),
      onError: () => toast({ title: 'Suppression impossible', variant: 'destructive' }),
    });
  };

  const addRow = () => {
    const title = newTitle.trim();
    if (!title) {
      toast({ title: 'Donnez un titre à la section', variant: 'destructive' });
      return;
    }
    createSection.mutate(
      {
        section_type: 'car_row',
        title,
        content: { category: newCategory, limit: newLimit, subtitle: 'Disponibles' },
        is_visible: true,
      },
      {
        onSuccess: () => {
          toast({ title: `${title} ajoutée` });
          setNewTitle('');
          setAdding(false);
        },
        onError: (err) =>
          toast({ title: 'Ajout impossible', description: err.message, variant: 'destructive' }),
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Sections de la page d'accueil</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Ajoutez des rangées de voitures, choisissez leur catégorie et leur ordre.
            </p>
          </div>
          <Link to="/admin">
            <Button variant="outline" size="sm" className="gap-2">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Button>
          </Link>
        </div>

        <Card className="mb-6 border-dashed">
          <CardContent className="flex items-center gap-3 py-5 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0" />
            L'en-tête, le hero, la bande de catégories, le bloc hôte et le pied de page restent fixes.
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.length === 0 && (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  Aucune rangée personnalisée. La page affiche la sélection par défaut.
                </CardContent>
              </Card>
            )}

            {rows.map((section, index) => {
              const isExpanded = expandedId === section.id;
              const draft = getDraft(section);
              return (
                <Card
                  key={section.id}
                  className={`transition-all ${!section.is_visible ? 'opacity-50' : ''} ${
                    isExpanded ? 'ring-1 ring-primary/30' : ''
                  }`}
                >
                  <CardHeader
                    className="flex flex-row items-center gap-3 p-4 cursor-pointer"
                    onClick={() => {
                      setExpandedId(isExpanded ? null : section.id);
                      if (!isExpanded && !drafts[section.id]) {
                        setDrafts((prev) => ({ ...prev, [section.id]: toDraft(section) }));
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{section.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {CATEGORY_LABELS[draft.category]} · {draft.limit} voiture
                        {draft.limit > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => move(index, 1)}
                        disabled={index === rows.length - 1}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleVisibility(section)}
                      >
                        {section.is_visible ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="px-4 pb-5 pt-0 border-t border-border/40">
                      <div className="mt-4 grid gap-4">
                        <div className="grid gap-1.5">
                          <Label>Titre</Label>
                          <Input
                            value={draft.title}
                            onChange={(e) => setDraft(section, { title: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label>Sous-titre</Label>
                          <Input
                            value={draft.subtitle}
                            placeholder="Disponibles"
                            onChange={(e) => setDraft(section, { subtitle: e.target.value })}
                          />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="grid gap-1.5">
                            <Label>Catégorie</Label>
                            <Select
                              value={draft.category}
                              onValueChange={(value) =>
                                setDraft(section, { category: value as RowCategory })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROW_CATEGORIES.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {CATEGORY_LABELS[category]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-1.5">
                            <Label>Nombre de voitures</Label>
                            <Input
                              type="number"
                              min={1}
                              max={12}
                              value={draft.limit}
                              onChange={(e) =>
                                setDraft(section, {
                                  limit: Math.min(Math.max(Number(e.target.value) || 1, 1), 12),
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive gap-2"
                          onClick={() => remove(section)}
                          disabled={deleteSection.isPending}
                        >
                          <Trash2 className="h-4 w-4" /> Supprimer
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => save(section)}
                          disabled={updateSection.isPending}
                        >
                          Enregistrer
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {adding ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Nouvelle rangée</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Titre</Label>
                <Input
                  autoFocus
                  placeholder="SUVs"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label>Catégorie</Label>
                  <Select
                    value={newCategory}
                    onValueChange={(value) => setNewCategory(value as RowCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROW_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {CATEGORY_LABELS[category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Nombre de voitures</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={newLimit}
                    onChange={(e) =>
                      setNewLimit(Math.min(Math.max(Number(e.target.value) || 1, 1), 12))
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                  Annuler
                </Button>
                <Button size="sm" onClick={addRow} disabled={createSection.isPending}>
                  Ajouter
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button className="mt-6 w-full gap-2" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Ajouter une rangée de voitures
          </Button>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          Les rangées masquées restent enregistrées. Les voitures affichées viennent des annonces
          en ligne ; une catégorie vide n'affiche rien.
        </p>
      </div>
    </div>
  );
};

export default AdminPageBuilder;
