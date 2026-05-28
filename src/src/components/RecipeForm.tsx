import { useEffect, useMemo, useRef, useState } from 'react';
import { getImageUrl } from '../lib/image';
import {
  ALLERGENS,
  RECIPE_TYPES,
  type Allergen,
  type Ingredient,
  type RecipeType,
  type RecipeView,
  type Step,
  type Visibility,
} from '../lib/types';

export interface RecipeFormValue {
  name: string;
  description: string;
  type: RecipeType;
  cuisine: string;
  originCountry: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: number;
  ingredients: Ingredient[];
  steps: Step[];
  allergens: Allergen[];
  kcalPerServing?: number;
  nutritionEstimated?: boolean;
  visibility: Visibility;
}

export interface RecipeFormProps {
  initial?: RecipeView;
  submitLabel: string;
  onSubmit: (value: RecipeFormValue, image: File | null) => Promise<void>;
}

function blankIngredient(): Ingredient {
  return { name: '', amount: '', unit: '', notes: '' };
}
function blankStep(order: number): Step {
  return { order, instruction: '' };
}

export default function RecipeForm({ initial, submitLabel, onSubmit }: RecipeFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [type, setType] = useState<RecipeType>(initial?.type ?? 'main');
  const [cuisine, setCuisine] = useState(initial?.cuisine ?? '');
  const [originCountry, setOriginCountry] = useState(initial?.originCountry ?? '');
  const [servings, setServings] = useState(initial?.servings ?? 4);
  const [prepTimeMinutes, setPrepTime] = useState(initial?.prepTimeMinutes ?? 15);
  const [cookTimeMinutes, setCookTime] = useState(initial?.cookTimeMinutes ?? 30);
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 1);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initial?.ingredients?.length ? initial.ingredients : [blankIngredient(), blankIngredient(), blankIngredient()]
  );
  const [steps, setSteps] = useState<Step[]>(
    initial?.steps?.length ? initial.steps.slice().sort((a, b) => a.order - b.order) : [blankStep(1), blankStep(2)]
  );
  const [allergens, setAllergens] = useState<Set<Allergen>>(new Set(initial?.allergens ?? []));
  const [kcal, setKcal] = useState<string>(initial?.kcalPerServing != null ? String(initial.kcalPerServing) : '');
  const [estimated, setEstimated] = useState<boolean>(!!initial?.nutritionEstimated);
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? 'private');
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const totalTime = useMemo(() => prepTimeMinutes + cookTimeMinutes, [prepTimeMinutes, cookTimeMinutes]);

  const updateIngredient = (idx: number, patch: Partial<Ingredient>) => {
    setIngredients((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addIngredient = () => setIngredients((prev) => [...prev, blankIngredient()]);
  const removeIngredient = (idx: number) =>
    setIngredients((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));

  const updateStep = (idx: number, patch: Partial<Step>) => {
    setSteps((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addStep = () => setSteps((prev) => [...prev, blankStep(prev.length + 1)]);
  const removeStep = (idx: number) =>
    setSteps((prev) =>
      prev.length <= 1
        ? prev
        : prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 }))
    );

  const toggleAllergen = (a: Allergen) => {
    setAllergens((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  };

  const onSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanIngredients = ingredients
      .map((i) => ({ ...i, name: i.name.trim(), amount: i.amount.trim(), unit: i.unit.trim(), notes: i.notes.trim() }))
      .filter((i) => i.name && i.amount);
    if (cleanIngredients.length < 1) {
      setError('Add at least one ingredient with a name and amount.');
      return;
    }
    const cleanSteps = steps
      .map((s, i) => ({ order: i + 1, instruction: s.instruction.trim() }))
      .filter((s) => s.instruction);
    if (cleanSteps.length < 1) {
      setError('Add at least one preparation step.');
      return;
    }

    const value: RecipeFormValue = {
      name: name.trim(),
      description: description.trim(),
      type,
      cuisine: cuisine.trim(),
      originCountry: originCountry.trim(),
      servings: Number(servings) || 1,
      prepTimeMinutes: Number(prepTimeMinutes) || 1,
      cookTimeMinutes: Number(cookTimeMinutes) || 0,
      difficulty: Math.max(1, Math.min(3, Number(difficulty) || 1)),
      ingredients: cleanIngredients,
      steps: cleanSteps,
      allergens: Array.from(allergens),
      kcalPerServing: kcal ? Number(kcal) : undefined,
      nutritionEstimated: kcal ? estimated : undefined,
      visibility,
    };

    setBusy(true);
    try {
      await onSubmit(value, image);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form recipe-form" onSubmit={onSubmitForm}>
      <fieldset className="fieldset">
        <legend>Basics</legend>
        <label className="field">
          <span>Name</span>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea className="input" required rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="grid-2">
          <label className="field">
            <span>Type</span>
            <select className="select" value={type} onChange={(e) => setType(e.target.value as RecipeType)}>
              {RECIPE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Visibility</span>
            <select className="select" value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
              <option value="private">Private — only me</option>
              <option value="unlisted">Unlisted — anyone with the link</option>
              <option value="public">Public — discoverable</option>
            </select>
          </label>
          <label className="field">
            <span>Cuisine</span>
            <input className="input" required value={cuisine} onChange={(e) => setCuisine(e.target.value)} />
          </label>
          <label className="field">
            <span>Origin country</span>
            <input className="input" required value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} />
          </label>
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Timing & yield</legend>
        <div className="grid-4">
          <label className="field">
            <span>Servings</span>
            <input className="input" type="number" min={1} required value={servings} onChange={(e) => setServings(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Prep (min)</span>
            <input className="input" type="number" min={1} required value={prepTimeMinutes} onChange={(e) => setPrepTime(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Cook (min)</span>
            <input className="input" type="number" min={0} required value={cookTimeMinutes} onChange={(e) => setCookTime(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Difficulty (1–3)</span>
            <input className="input" type="number" min={1} max={3} required value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} />
          </label>
        </div>
        <p className="form-hint">Total time: {totalTime} min</p>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Ingredients</legend>
        <ol className="ingredient-list">
          {ingredients.map((ing, idx) => (
            <li key={idx} className="ingredient-row">
              <input className="input" placeholder="Amount" value={ing.amount} onChange={(e) => updateIngredient(idx, { amount: e.target.value })} />
              <input className="input" placeholder="Unit (g, tsp…)" value={ing.unit} onChange={(e) => updateIngredient(idx, { unit: e.target.value })} />
              <input className="input" placeholder="Ingredient" value={ing.name} onChange={(e) => updateIngredient(idx, { name: e.target.value })} />
              <input className="input" placeholder="Notes (optional)" value={ing.notes} onChange={(e) => updateIngredient(idx, { notes: e.target.value })} />
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeIngredient(idx)} aria-label="Remove">×</button>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn-ghost" onClick={addIngredient}>+ Add ingredient</button>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Steps</legend>
        <ol className="step-list">
          {steps.map((s, idx) => (
            <li key={idx} className="step-row">
              <span className="step-num">{idx + 1}</span>
              <textarea className="input" rows={2} placeholder="Describe this step…" value={s.instruction} onChange={(e) => updateStep(idx, { instruction: e.target.value })} />
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeStep(idx)} aria-label="Remove">×</button>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn-ghost" onClick={addStep}>+ Add step</button>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Allergens (optional)</legend>
        <div className="chip-row">
          {ALLERGENS.map((a) => {
            const on = allergens.has(a);
            return (
              <button
                key={a}
                type="button"
                className={`chip ${on ? 'chip-on' : ''}`}
                onClick={() => toggleAllergen(a)}
                aria-pressed={on}
              >
                {a.replace('_', ' ')}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Nutrition (optional)</legend>
        <div className="grid-2">
          <label className="field">
            <span>Calories per serving</span>
            <input className="input" type="number" min={1} value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="e.g. 420" />
          </label>
          <label className="field-inline">
            <input type="checkbox" checked={estimated} onChange={(e) => setEstimated(e.target.checked)} />
            <span>Estimated value</span>
          </label>
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Cover image (optional)</legend>
        <div className="image-upload">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            className="input"
          />
          {(previewUrl || initial?.imageKey) && (
            <div className="image-preview">
              <CoverPreview previewUrl={previewUrl} initial={initial} />
              {image && (
                <button type="button" className="btn btn-ghost" onClick={() => { setImage(null); if (fileRef.current) fileRef.current.value = ''; }}>Remove</button>
              )}
            </div>
          )}
        </div>
      </fieldset>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function CoverPreview({ previewUrl, initial }: { previewUrl: string | null; initial?: RecipeView }) {
  const [existing, setExisting] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!previewUrl && initial?.imageKey) {
      void getImageUrl(initial.imageKey).then((u) => {
        if (!cancelled) setExisting(u);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [previewUrl, initial?.imageKey]);
  const url = previewUrl ?? existing;
  if (!url) return null;
  return <img src={url} alt="" />;
}
