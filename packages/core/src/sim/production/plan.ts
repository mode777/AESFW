/**
 * Recipe planning helpers (GDD-10.4). A batch process uses the full recipe
 * amounts; a continuous process uses the per-tick amounts (the recipe amount
 * divided by its duration, floored).
 *
 * Source: GDD-10.4
 */
import { mulDiv } from '../../fx/index.js';
import type { ItemAmount, Producer, RecipeSpec, ResourceSource } from './types.js';

/** True when `value` is a producer component. */
export function isProducer(value: unknown): value is Producer {
  return typeof value === 'object' && value !== null && Array.isArray((value as Producer).recipes);
}

/** True when `value` is a resource-source component. */
export function isResourceSource(value: unknown): value is ResourceSource {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as ResourceSource).outputs) &&
    typeof (value as ResourceSource).policy === 'string'
  );
}

/** Returns the selected recipe specification, or `null`. */
export function recipeOf(producer: Producer): RecipeSpec | null {
  const handle = producer.recipe;
  if (handle === null) return null;
  return producer.recipes.find((recipe) => recipe.recipe === handle) ?? null;
}

/** The effective completion duration: the recipe duration for batch, `1` for continuous. */
export function effectiveDuration(recipe: RecipeSpec): number {
  return recipe.mode === 'batch' ? recipe.duration : 1;
}

const perTick = (recipe: RecipeSpec, amount: ItemAmount): ItemAmount => ({
  resource: amount.resource,
  quantity: mulDiv(amount.quantity, 1, recipe.duration, 'floor'),
});

/** The inputs a process reserves this cycle. */
export function planInputs(recipe: RecipeSpec): readonly ItemAmount[] {
  return recipe.mode === 'batch'
    ? recipe.inputs
    : recipe.inputs.map((item) => perTick(recipe, item));
}

/** The outputs a process produces this cycle. */
export function planOutputs(recipe: RecipeSpec): readonly ItemAmount[] {
  return recipe.mode === 'batch'
    ? recipe.outputs
    : recipe.outputs.map((item) => perTick(recipe, item));
}
