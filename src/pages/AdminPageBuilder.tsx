import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { heroContent, isHero, HERO_DEFAULTS, type HeroContent } from '@/lib/hero';
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

type SectionType = 'car_row' | 'banner';

interface Draft {
  title: string;
  subtitle: string;
  category: RowCategory;
  limit: number;
  heading: string;
  description: string;
  image_url: string;
  cta: string;
  cta_link: string;
}

const toDraft = (section: LandingSection): Draft => {
  const content = section.content as Record<string, unknown>;
  return {
    title: section.title,
    subtitle: String(content.subtitle ?? ''),
    category: (content.category as RowCategory) ?? 'all',
    limit: carRowFilters(section).limit ?? 3,
    heading: String(content.heading ?? ''),
    description: String(content.description ?? ''),
    image_url: String(content.image_url ?? ''),
    cta: String(content.cta ?? ''),
    cta_link: String(content.cta_link ?? ''),
  };
};

const heroToDraft = (section?: LandingSection | null): HeroContent => ({ ...heroContent(section) });

const AdminPageBuilder = () => {
  const { data: sections, isLoading } = useLandingSections();
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const reorderSections = useReorderSections();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [heroDraft, setHeroDraft] = useState<HeroContent | null>(null);
  const [adding, setAdding] = useState(false);

  const [newType, setNewType] = useState<SectionType>('car_row');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<RowCategory>('SUV');
  const [newLimit, setNewLimit] = useState(3);
  const [newHeading, setNewHeading] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImage, setNewImage] = useState('');
  const [newCta, setNewCta] = useState('');

  const all = sections ?? [];
  const hero = all.find(isHero);
  const rows = all
    .filter((section) => isCarRow(section) || section.section_type === 'banner')
    .sort((a, b) => a.sort_order - b.sort_order);

  const getDraft = (section: LandingSection): Draft => drafts[section.id] ?? toDraft(section);
  const setDraft = (section: LandingSection, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [section.id]: { ...getDraft(section), ...patch } }));

  const currentHero = heroDraft ?? heroToDraft(hero);
  const setHeroField = (patch: Partial<HeroContent>) =>
    setHeroDraft({ ...currentHero, ...patch });

  const saveHero = () => {
    const payload = {
      title: currentHero.heading_line1 || 'Hero',
      content: { ...currentHero },
    };
    if (!hero) {
      createSection.mutate(
        { section_type: 'hero', ...payload, sort_order: 0, is_visible: true },
        {
          onSuccess: () => toast({ title: 'Hero créé' }),
          onError: (err) =>
            toast({ title: 'Erreur', description: err.message, variant: 'destructive' }),
        }
      );
      return;
    }
    updateSection.mutate(
      { id: hero.id, ...payload },
      {
        onSuccess: () => {
          toast({ title: 'Hero enregistré' });
          setHeroDraft(null);
        },
        onError: (err) =>
          toast({ title: 'Erreur', description: err.message, variant: 'destructive' }),
      }
    );
  };

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
      { onSuccess: () => toast({ title: section.is_visible ? 'Section masquée' : 'Section affichée' }) }
    );
  };

  const save = (section: LandingSection) => {
    const draft = getDraft(section);
    const content = isCarRow(section)
      ? { category: draft.category, limit: draft.limit, subtitle: draft.subtitle }
      : {
          subtitle: draft.subtitle,
          heading: draft.heading,
          description: draft.description,
          image_url: draft.image_url,
          cta: draft.cta,
          cta_link: draft.cta_link,
        };
    updateSection.mutate(
      { id: section.id, title: draft.title, content },
      {
        onSuccess: () => {
          toast({ title: `${draft.title} enregistrée` });
          setDrafts((prev) => {
            const next = { ...prev };
            delete next[section.id];
            return next;
          });
        },
        onError: (err) =>
          toast({ title: 'Erreur', description: err.message, variant: 'destructive' }),
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

  const addSection = () => {
    if (newType === 'car_row' && !newTitle.trim()) {
      toast({ title: 'Donnez un titre à la rangée', variant: 'destructive' });
      return;
    }
    const title = newTitle.trim() || newHeading.trim() || 'Bannière';
    const content =
      newType === 'car_row'
        ? { category: newCategory, limit: newLimit, subtitle: newSubtitle || 'Disponibles' }
        : {
            subtitle: newSubtitle,
            heading: newHeading,
            description: newDescription,
            image_url: newImage,
            cta: newCta,
            cta_link: '/search',
          };

    createSection.mutate(
      { section_type: newType, title, content, is_visible: true },
      {
        onSuccess: () => {
          toast({ title: `${title} ajoutée` });
          setAdding(false);
          setNewTitle('');
          setNewHeading('');
          setNewSubtitle('');
          setNewDescription('');
          setNewImage('');
          setNewCta('');
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
            <h1 className="text-3xl font-bold">Page d'accueil</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Modifiez le hero, ajoutez des rangées de voitures et des bannières.
            </p>
          </div>
          <Link to="/admin">
            <Button variant="outline" size="sm" className="gap-2">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Button>
          </Link>
        </div>

        <Card className="mb-6 border-dashed">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0" />
            La barre de navigation, la bande de catégories, le bloc hôte et le pied de page restent fixes.
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Hero {hero ? '' : '— non configuré'}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Sur-titre" value={currentHero.eyebrow} onChange={(v) => setHeroField({ eyebrow: v })} />
                  <Field label="Image (URL)" value={currentHero.image_url} onChange={(v) => setHeroField({ image_url: v })} placeholder="https://…" />
                  <Field label="Ligne 1" value={currentHero.heading_line1} onChange={(v) => setHeroField({ heading_line1: v })} />
                  <Field label="Mot en italique" value={currentHero.heading_highlight} onChange={(v) => setHeroField({ heading_highlight: v })} />
                  <Field label="Ligne 3 (optionnelle)" value={currentHero.heading_line2} onChange={(v) => setHeroField({ heading_line2: v })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Description</Label>
                  <Textarea
                    rows={3}
                    value={currentHero.description}
                    onChange={(e) => setHeroField({ description: e.target.value })}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Bouton principal" value={currentHero.cta_primary} onChange={(v) => setHeroField({ cta_primary: v })} />
                  <Field label="Lien principal" value={currentHero.cta_primary_link} onChange={(v) => setHeroField({ cta_primary_link: v })} />
                  <Field label="Lien secondaire" value={currentHero.cta_secondary} onChange={(v) => setHeroField({ cta_secondary: v })} />
                  <Field label="URL secondaire" value={currentHero.cta_secondary_link} onChange={(v) => setHeroField({ cta_secondary_link: v })} />
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={saveHero} disabled={createSection.isPending || updateSection.isPending}>
                    {hero ? 'Enregistrer le hero' : 'Créer le hero'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {rows.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Aucune section. La page affiche la sélection par défaut.
                  </CardContent>
                </Card>
              )}

              {rows.map((section, index) => {
                const isExpanded = expandedId === section.id;
                const draft = getDraft(section);
                const banner = section.section_type === 'banner';
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
                          {banner
                            ? 'Bannière'
                            : `${CATEGORY_LABELS[draft.category]} · ${draft.limit} voiture${draft.limit > 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(index, -1)} disabled={index === 0}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(index, 1)} disabled={index === rows.length - 1}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleVisibility(section)}>
                          {section.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                        </Button>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="px-4 pb-5 pt-0 border-t border-border/40">
                        <div className="mt-4 grid gap-4">
                          <Field label="Titre" value={draft.title} onChange={(v) => setDraft(section, { title: v })} />
                          {banner ? (
                            <>
                              <Field label="Sur-titre" value={draft.subtitle} onChange={(v) => setDraft(section, { subtitle: v })} />
                              <Field label="Titre affiché" value={draft.heading} onChange={(v) => setDraft(section, { heading: v })} />
                              <div className="grid gap-1.5">
                                <Label>Description</Label>
                                <Textarea rows={3} value={draft.description} onChange={(e) => setDraft(section, { description: e.target.value })} />
                              </div>
                              <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Image (URL)" value={draft.image_url} onChange={(v) => setDraft(section, { image_url: v })} placeholder="https://…" />
                                <Field label="Bouton" value={draft.cta} onChange={(v) => setDraft(section, { cta: v })} />
                                <Field label="Lien du bouton" value={draft.cta_link} onChange={(v) => setDraft(section, { cta_link: v })} />
                              </div>
                            </>
                          ) : (
                            <>
                              <Field label="Sous-titre" value={draft.subtitle} onChange={(v) => setDraft(section, { subtitle: v })} />
                              <div className="grid sm:grid-cols-2 gap-4">
                                <div className="grid gap-1.5">
                                  <Label>Catégorie</Label>
                                  <Select value={draft.category} onValueChange={(value) => setDraft(section, { category: value as RowCategory })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {ROW_CATEGORIES.map((category) => (
                                        <SelectItem key={category} value={category}>{CATEGORY_LABELS[category]}</SelectItem>
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
                                    onChange={(e) => setDraft(section, { limit: Math.min(Math.max(Number(e.target.value) || 1, 1), 12) })}
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="mt-6 flex items-center justify-between">
                          <Button variant="ghost" size="sm" className="text-destructive gap-2" onClick={() => remove(section)} disabled={deleteSection.isPending}>
                            <Trash2 className="h-4 w-4" /> Supprimer
                          </Button>
                          <Button size="sm" onClick={() => save(section)} disabled={updateSection.isPending}>
                            Enregistrer
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

            {adding ? (
              <Card className="mt-6">
                <CardHeader><CardTitle className="text-base">Nouvelle section</CardTitle></CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <Label>Type</Label>
                      <Select value={newType} onValueChange={(value) => setNewType(value as SectionType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="car_row">Rangée de voitures</SelectItem>
                          <SelectItem value="banner">Bannière</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Field label="Titre interne" value={newTitle} onChange={setNewTitle} />
                  </div>

                  {newType === 'car_row' ? (
                    <div className="grid gap-4">
                      <Field label="Sous-titre" value={newSubtitle} onChange={setNewSubtitle} placeholder="Disponibles" />
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                          <Label>Catégorie</Label>
                          <Select value={newCategory} onValueChange={(value) => setNewCategory(value as RowCategory)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ROW_CATEGORIES.map((category) => (
                                <SelectItem key={category} value={category}>{CATEGORY_LABELS[category]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1.5">
                          <Label>Nombre de voitures</Label>
                          <Input type="number" min={1} max={12} value={newLimit} onChange={(e) => setNewLimit(Math.min(Math.max(Number(e.target.value) || 1, 1), 12))} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      <Field label="Sur-titre" value={newSubtitle} onChange={setNewSubtitle} />
                      <Field label="Titre affiché" value={newHeading} onChange={setNewHeading} />
                      <div className="grid gap-1.5">
                        <Label>Description</Label>
                        <Textarea rows={3} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Bouton" value={newCta} onChange={setNewCta} />
                        <Field label="Image (URL)" value={newImage} onChange={setNewImage} placeholder="https://…" />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Annuler</Button>
                    <Button size="sm" onClick={addSection} disabled={createSection.isPending}>Ajouter</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button className="mt-6 w-full gap-2" variant="outline" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> Ajouter une section
              </Button>
            )}
          </>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          Le hero est toujours affiché en premier. Les rangées et bannières suivent leur ordre. Une
          catégorie vide n'affiche rien.
        </p>
      </div>
    </div>
  );
};

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export default AdminPageBuilder;
