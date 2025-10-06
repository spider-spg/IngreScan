// Simple allergen-aware scoring helper
// Returns an object: { score, containsAllergens, matchedAllergens, explanation }
export function scoreProductWithAllergens(product = {}, userAllergens = []) {
  const norm = (s) => (s || '').toString().toLowerCase();

  // Collect ingredient text candidates
  const candidates = [];
  if (Array.isArray(product.ingredients)) {
    product.ingredients.forEach(i => {
      if (typeof i === 'string') candidates.push(i);
      else if (i && i.name) candidates.push(i.name);
    });
  }
  if (product.ingredients_text) candidates.push(product.ingredients_text);
  if (product.ingredientList) candidates.push(product.ingredientList);
  if (product.raw && product.raw.ingredients_text) candidates.push(product.raw.ingredients_text);
  if (product.productSnapshot && product.productSnapshot.ingredients_text) candidates.push(product.productSnapshot.ingredients_text);

  // Join and normalize
  const allText = candidates.join('\n').toLowerCase();

  // Normalize userAllergens to lowercase keywords
  const allergens = (userAllergens || []).map(a => norm(a)).filter(Boolean);

  const matched = [];
  allergens.forEach((alg) => {
    // match whole words or substring safe checks
    try {
      const re = new RegExp('\\b' + alg.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + '\\b', 'i');
      if (re.test(allText) || allText.includes(alg)) matched.push(alg);
    } catch (e) {
      if (allText.includes(alg)) matched.push(alg);
    }
  });

  const containsAllergens = matched.length > 0;

  // Base score: if product has a precomputed healthScore, start from that; otherwise default 70
  let base = Number(product.healthScore || product.score || 70) || 70;

  let explanation = 'Base score from product data';

  let penalty = 0;
  if (containsAllergens) {
    // Large penalty for allergens (user-specific): reduce to low score
    penalty = Math.max(40, Math.round(base * 0.7));
    base = Math.max(5, base - penalty);
    explanation = `Contains user allergens: ${matched.join(', ')}`;
  }

  // Clamp to 0-100
  const score = Math.max(0, Math.min(100, Math.round(base)));

  return { score, containsAllergens, matchedAllergens: matched, explanation, allergenPenalty: penalty };
}
