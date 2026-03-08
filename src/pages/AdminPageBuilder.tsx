import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  GripVertical,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Save,
  ArrowUp,
  ArrowDown,
  LayoutDashboard,
} from 'lucide-react';
import { useLandingSections, useUpdateSection, useReorderSections, type LandingSection } from '@/hooks/useLandingSections';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

/* ── Section content editors ── */

function JsonFieldEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-muted/50" />
    </div>
  );
}

function ArrayItemEditor({
  items,
  fields,
  onChange,
  label,
}: {
  items: Record<string, any>[];
  fields: string[];
  onChange: (items: Record<string, any>[]) => void;
  label: string;
}) {
  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addItem = () => {
    const newItem: Record<string, any> = {};
    fields.forEach((f) => (newItem[f] = ''));
    onChange([...items, newItem]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</Label>
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-2 items-start p-3 rounded-lg bg-muted/30 border border-border/50">
          <span className="text-xs text-muted-foreground font-mono mt-2.5 w-5 shrink-0">{idx + 1}</span>
          <div className="flex-1 grid gap-2">
            {fields.map((field) => (
              <Input
                key={field}
                placeholder={field}
                value={item[field] ?? ''}
                onChange={(e) => updateItem(idx, field, e.target.value)}
                className="bg-background text-sm"
              />
            ))}
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 text-destructive h-8 w-8" onClick={() => removeItem(idx)}>
            ×
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem}>+ Add Item</Button>
    </div>
  );
}

/* ── Content editor per section type ── */

function SectionContentEditor({
  section,
  content,
  onChange,
}: {
  section: LandingSection;
  content: Record<string, any>;
  onChange: (c: Record<string, any>) => void;
}) {
  const set = (key: string, val: any) => onChange({ ...content, [key]: val });

  switch (section.section_type) {
    case 'hero':
      return (
        <div className="grid gap-4">
          <JsonFieldEditor label="Subtitle tag" value={content.subtitle ?? ''} onChange={(v) => set('subtitle', v)} />
          <JsonFieldEditor label="Heading Line 1" value={content.heading_line1 ?? ''} onChange={(v) => set('heading_line1', v)} />
          <JsonFieldEditor label="Highlighted word" value={content.heading_highlight ?? ''} onChange={(v) => set('heading_highlight', v)} />
          <JsonFieldEditor label="Heading Line 2" value={content.heading_line2 ?? ''} onChange={(v) => set('heading_line2', v)} />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
            <Textarea value={content.description ?? ''} onChange={(e) => set('description', e.target.value)} className="bg-muted/50" rows={3} />
          </div>
          <JsonFieldEditor label="Primary CTA" value={content.cta_primary ?? ''} onChange={(v) => set('cta_primary', v)} />
          <JsonFieldEditor label="Secondary CTA" value={content.cta_secondary ?? ''} onChange={(v) => set('cta_secondary', v)} />
          <ArrayItemEditor label="Stats" items={content.stats ?? []} fields={['value', 'label']} onChange={(v) => set('stats', v)} />
        </div>
      );

    case 'categories':
      return (
        <div className="grid gap-4">
          <JsonFieldEditor label="Subtitle" value={content.subtitle ?? ''} onChange={(v) => set('subtitle', v)} />
          <JsonFieldEditor label="Heading" value={content.heading ?? ''} onChange={(v) => set('heading', v)} />
          <ArrayItemEditor label="Categories" items={content.items ?? []} fields={['name', 'count', 'tag']} onChange={(v) => set('items', v)} />
        </div>
      );

    case 'steps':
      return (
        <div className="grid gap-4">
          <JsonFieldEditor label="Subtitle" value={content.subtitle ?? ''} onChange={(v) => set('subtitle', v)} />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Heading</Label>
            <Textarea value={content.heading ?? ''} onChange={(e) => set('heading', e.target.value)} className="bg-muted/50" rows={2} />
          </div>
          <ArrayItemEditor label="Steps" items={content.items ?? []} fields={['num', 'title', 'desc', 'icon']} onChange={(v) => set('items', v)} />
        </div>
      );

    case 'features':
      return (
        <div className="grid gap-4">
          <JsonFieldEditor label="Subtitle" value={content.subtitle ?? ''} onChange={(v) => set('subtitle', v)} />
          <JsonFieldEditor label="Heading" value={content.heading ?? ''} onChange={(v) => set('heading', v)} />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
            <Textarea value={content.description ?? ''} onChange={(e) => set('description', e.target.value)} className="bg-muted/50" rows={2} />
          </div>
          <ArrayItemEditor label="Feature cards" items={content.items ?? []} fields={['icon', 'title', 'desc']} onChange={(v) => set('items', v)} />
        </div>
      );

    case 'testimonials':
      return (
        <div className="grid gap-4">
          <JsonFieldEditor label="Subtitle" value={content.subtitle ?? ''} onChange={(v) => set('subtitle', v)} />
          <JsonFieldEditor label="Heading" value={content.heading ?? ''} onChange={(v) => set('heading', v)} />
          <ArrayItemEditor label="Testimonials" items={content.items ?? []} fields={['name', 'role', 'quote']} onChange={(v) => set('items', v)} />
        </div>
      );

    case 'owner_cta':
      return (
        <div className="grid gap-4">
          <JsonFieldEditor label="Subtitle" value={content.subtitle ?? ''} onChange={(v) => set('subtitle', v)} />
          <JsonFieldEditor label="Heading" value={content.heading ?? ''} onChange={(v) => set('heading', v)} />
          <JsonFieldEditor label="Highlight" value={content.highlight ?? ''} onChange={(v) => set('highlight', v)} />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
            <Textarea value={content.description ?? ''} onChange={(e) => set('description', e.target.value)} className="bg-muted/50" rows={2} />
          </div>
          <ArrayItemEditor label="Bullet Points" items={(content.bullets ?? []).map((b: string) => ({ text: b }))} fields={['text']} onChange={(v) => set('bullets', v.map((i: any) => i.text))} />
          <JsonFieldEditor label="CTA Button Text" value={content.cta ?? ''} onChange={(v) => set('cta', v)} />
        </div>
      );

    case 'final_cta':
      return (
        <div className="grid gap-4">
          <JsonFieldEditor label="Heading before" value={content.heading_before ?? ''} onChange={(v) => set('heading_before', v)} />
          <JsonFieldEditor label="Highlighted word" value={content.heading_highlight ?? ''} onChange={(v) => set('heading_highlight', v)} />
          <JsonFieldEditor label="Heading after" value={content.heading_after ?? ''} onChange={(v) => set('heading_after', v)} />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
            <Textarea value={content.description ?? ''} onChange={(e) => set('description', e.target.value)} className="bg-muted/50" rows={2} />
          </div>
          <JsonFieldEditor label="Primary CTA" value={content.cta_primary ?? ''} onChange={(v) => set('cta_primary', v)} />
          <JsonFieldEditor label="Secondary CTA" value={content.cta_secondary ?? ''} onChange={(v) => set('cta_secondary', v)} />
        </div>
      );

    case 'footer':
      return (
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tagline</Label>
            <Textarea value={content.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} className="bg-muted/50" rows={2} />
          </div>
          {(content.columns ?? []).map((col: any, ci: number) => (
            <div key={ci} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
              <Input
                value={col.title}
                onChange={(e) => {
                  const cols = [...(content.columns ?? [])];
                  cols[ci] = { ...cols[ci], title: e.target.value };
                  set('columns', cols);
                }}
                className="bg-background font-semibold"
                placeholder="Column title"
              />
              {(col.links ?? []).map((link: any, li: number) => (
                <div key={li} className="flex gap-2">
                  <Input
                    value={link.label}
                    placeholder="Label"
                    className="bg-background text-sm"
                    onChange={(e) => {
                      const cols = [...(content.columns ?? [])];
                      const links = [...cols[ci].links];
                      links[li] = { ...links[li], label: e.target.value };
                      cols[ci] = { ...cols[ci], links };
                      set('columns', cols);
                    }}
                  />
                  <Input
                    value={link.href}
                    placeholder="URL"
                    className="bg-background text-sm"
                    onChange={(e) => {
                      const cols = [...(content.columns ?? [])];
                      const links = [...cols[ci].links];
                      links[li] = { ...links[li], href: e.target.value };
                      cols[ci] = { ...cols[ci], links };
                      set('columns', cols);
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      );

    default:
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Raw JSON</Label>
          <Textarea
            value={JSON.stringify(content, null, 2)}
            onChange={(e) => {
              try { onChange(JSON.parse(e.target.value)); } catch {}
            }}
            className="bg-muted/50 font-mono text-xs"
            rows={10}
          />
        </div>
      );
  }
}

/* ── Main Page Builder ── */

const AdminPageBuilder = () => {
  const { data: sections, isLoading } = useLandingSections();
  const updateSection = useUpdateSection();
  const reorderSections = useReorderSections();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, any>>>({});

  const sorted = [...(sections ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    const newOrder = sorted.map((s, i) => ({
      id: s.id,
      sort_order: i === index ? sorted[index - 1].sort_order : i === index - 1 ? sorted[index].sort_order : s.sort_order,
    }));
    reorderSections.mutate(newOrder, {
      onSuccess: () => toast({ title: 'Section reordered' }),
    });
  };

  const moveSectionDown = (index: number) => {
    if (index >= sorted.length - 1) return;
    moveSectionUp(index + 1);
  };

  const toggleVisibility = (section: LandingSection) => {
    updateSection.mutate(
      { id: section.id, is_visible: !section.is_visible },
      { onSuccess: () => toast({ title: `${section.title} ${section.is_visible ? 'hidden' : 'shown'}` }) }
    );
  };

  const saveContent = (section: LandingSection) => {
    const draft = drafts[section.id];
    if (!draft) return;
    updateSection.mutate(
      { id: section.id, content: draft },
      {
        onSuccess: () => {
          toast({ title: `${section.title} saved` });
          setDrafts((prev) => {
            const next = { ...prev };
            delete next[section.id];
            return next;
          });
        },
        onError: () => toast({ title: 'Error saving', variant: 'destructive' }),
      }
    );
  };

  const getDraft = (section: LandingSection) => drafts[section.id] ?? (section.content as Record<string, any>);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Page Builder</h1>
            <p className="text-muted-foreground mt-1 text-sm">Drag sections to reorder, edit content, toggle visibility.</p>
          </div>
          <Link to="/admin">
            <Button variant="outline" size="sm" className="gap-2">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((section, index) => {
              const isExpanded = expandedId === section.id;
              const hasDraft = !!drafts[section.id];
              return (
                <Card
                  key={section.id}
                  className={`transition-all duration-200 ${!section.is_visible ? 'opacity-50' : ''} ${isExpanded ? 'ring-1 ring-primary/30' : ''}`}
                >
                  <CardHeader
                    className="flex flex-row items-center gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : section.id)}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{section.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{section.section_type}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveSectionUp(index)} disabled={index === 0}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveSectionDown(index)} disabled={index === sorted.length - 1}>
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
                      <div className="mt-4">
                        <SectionContentEditor
                          section={section}
                          content={getDraft(section)}
                          onChange={(c) => setDrafts((prev) => ({ ...prev, [section.id]: c }))}
                        />
                      </div>
                      <div className="mt-6 flex gap-2">
                        <Button
                          onClick={() => saveContent(section)}
                          disabled={!hasDraft || updateSection.isPending}
                          className="gap-2"
                          size="sm"
                        >
                          <Save className="h-3.5 w-3.5" /> Save Changes
                        </Button>
                        {hasDraft && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDrafts((prev) => {
                              const next = { ...prev };
                              delete next[section.id];
                              return next;
                            })}
                          >
                            Discard
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPageBuilder;
