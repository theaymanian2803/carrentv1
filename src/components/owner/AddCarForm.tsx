import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight, Upload, X, ImageIcon, Check, Loader2 } from 'lucide-react';

const STEPS = ['Vehicle Details', 'Features & Description', 'Photos', 'Review & Submit'];

const FEATURE_OPTIONS = [
  'GPS Navigation', 'Bluetooth', 'Backup Camera', 'Heated Seats',
  'Sunroof', 'Apple CarPlay', 'Android Auto', 'Cruise Control',
  'Keyless Entry', 'USB Charging', 'Child Seat', 'Roof Rack',
];

const CATEGORIES = ['SUV', 'Sedan', 'Luxury', 'Electric'] as const;

interface FormData {
  make: string;
  model: string;
  year: number;
  category: typeof CATEGORIES[number];
  daily_rate: number;
  address: string;
  description: string;
  features: string[];
  images: File[];
  imagePreviewUrls: string[];
}

interface AddCarFormProps {
  backPath?: string;
  defaultStatus?: 'pending_approval' | 'live';
}

const AddCarForm = ({ backPath = '/owner', defaultStatus = 'pending_approval' }: AddCarFormProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState<FormData>({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    category: 'Sedan',
    daily_rate: 50,
    address: '',
    description: '',
    features: [],
    images: [],
    imagePreviewUrls: [],
  });

  const updateForm = (updates: Partial<FormData>) => setForm((prev) => ({ ...prev, ...updates }));

  const toggleFeature = (feature: string) => {
    updateForm({
      features: form.features.includes(feature)
        ? form.features.filter((f) => f !== feature)
        : [...form.features, feature],
    });
  };

  const handleImageDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    addImages(files);
  }, [form.images]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addImages(Array.from(e.target.files));
  };

  const addImages = (files: File[]) => {
    const remaining = 5 - form.images.length;
    const newFiles = files.slice(0, remaining);
    const newUrls = newFiles.map((f) => URL.createObjectURL(f));
    updateForm({
      images: [...form.images, ...newFiles],
      imagePreviewUrls: [...form.imagePreviewUrls, ...newUrls],
    });
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(form.imagePreviewUrls[index]);
    updateForm({
      images: form.images.filter((_, i) => i !== index),
      imagePreviewUrls: form.imagePreviewUrls.filter((_, i) => i !== index),
    });
  };

  const canProceed = () => {
    switch (step) {
      case 0: return form.make && form.model && form.year && form.daily_rate > 0 && form.address;
      case 1: return form.description && form.description.length >= 10;
      case 2: return form.images.length >= 1;
      case 3: return true;
      default: return false;
    }
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!user) return [];
    setUploading(true);
    const urls: string[] = [];

    for (const file of form.images) {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('car-images').upload(path, file);
      if (error) {
        toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
        setUploading(false);
        return [];
      }
      const { data: urlData } = supabase.storage.from('car-images').getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    setUploading(false);
    return urls;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    const imageUrls = await uploadImages();
    if (imageUrls.length === 0 && form.images.length > 0) {
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from('cars').insert({
      owner_id: user.id,
      make: form.make,
      model: form.model,
      year: form.year,
      category: form.category,
      daily_rate: form.daily_rate,
      address: form.address,
      description: form.description,
      features: form.features.reduce((acc, f) => ({ ...acc, [f]: true }), {}),
      images: imageUrls,
      status: defaultStatus,
    });

    setSubmitting(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: 'Car listed!',
        description: defaultStatus === 'live'
          ? 'The car is now live and visible to renters.'
          : 'Your car is pending admin approval.',
      });
      navigate(backPath);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress stepper */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              i < step ? 'bg-primary text-primary-foreground' :
              i === step ? 'bg-primary text-primary-foreground' :
              'bg-muted text-muted-foreground'
            }`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className="hidden sm:block text-xs text-muted-foreground">{label}</span>
            {i < STEPS.length - 1 && <div className="hidden sm:block w-8 h-px bg-border mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Vehicle Details */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Details</CardTitle>
            <CardDescription>Basic information about your car</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make *</Label>
                <Input id="make" placeholder="Toyota" value={form.make} onChange={(e) => updateForm({ make: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model *</Label>
                <Input id="model" placeholder="Camry" value={form.model} onChange={(e) => updateForm({ model: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Year *</Label>
                <Input id="year" type="number" min={2000} max={2027} value={form.year} onChange={(e) => updateForm({ year: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => updateForm({ category: v as typeof CATEGORIES[number] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate">Daily Rate ($) *</Label>
                <Input id="rate" type="number" min={1} value={form.daily_rate} onChange={(e) => updateForm({ daily_rate: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Location / Address *</Label>
                <Input id="address" placeholder="123 Main St, City" value={form.address} onChange={(e) => updateForm({ address: e.target.value })} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Features & Description */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Features & Description</CardTitle>
            <CardDescription>Help renters understand what makes your car special</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="desc">Description *</Label>
              <Textarea
                id="desc"
                placeholder="Tell renters about your car — condition, extras, pickup instructions..."
                className="min-h-[120px]"
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">{form.description.length} characters (min 10)</p>
            </div>
            <div className="space-y-3">
              <Label>Features</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {FEATURE_OPTIONS.map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <Checkbox
                      id={feature}
                      checked={form.features.includes(feature)}
                      onCheckedChange={() => toggleFeature(feature)}
                    />
                    <label htmlFor={feature} className="text-sm cursor-pointer">{feature}</label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Photos */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
            <CardDescription>Upload up to 5 photos of your car (at least 1 required)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleImageDrop}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Drag & drop images here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse • {5 - form.images.length} remaining</p>
              <input id="file-input" type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
            </div>

            {/* Preview grid */}
            {form.imagePreviewUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {form.imagePreviewUrls.map((url, i) => (
                  <div key={i} className="relative group aspect-video rounded-lg overflow-hidden border bg-muted">
                    <img src={url} alt={`Car photo ${i + 1}`} className="w-full h-full object-cover" />
                    {i === 0 && (
                      <Badge className="absolute top-2 left-2 text-xs">Cover</Badge>
                    )}
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Submit</CardTitle>
            <CardDescription>Double-check your listing before submitting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Vehicle</p>
                <p className="font-medium">{form.year} {form.make} {form.model}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Category</p>
                <p className="font-medium">{form.category}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Daily Rate</p>
                <p className="font-medium">${form.daily_rate}/day</p>
              </div>
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">{form.address}</p>
              </div>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground mb-1">Description</p>
              <p>{form.description}</p>
            </div>
            {form.features.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Features</p>
                <div className="flex flex-wrap gap-2">
                  {form.features.map((f) => <Badge key={f} variant="secondary">{f}</Badge>)}
                </div>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Photos ({form.images.length})</p>
              <div className="flex gap-2 overflow-x-auto">
                {form.imagePreviewUrls.map((url, i) => (
                  <img key={i} src={url} alt="" className="h-16 w-24 rounded object-cover border" />
                ))}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4 inline mr-2" />
              Your listing will be reviewed by our team before going live.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={() => step === 0 ? navigate(backPath) : setStep(step - 1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="gap-2">
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting || uploading} className="gap-2">
            {submitting || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {uploading ? 'Uploading photos...' : submitting ? 'Submitting...' : 'List My Car'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default AddCarForm;
