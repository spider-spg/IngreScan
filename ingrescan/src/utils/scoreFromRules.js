import HEALTH_RULES from '../data/health_rules.json';

// Ported from the provided Python implementation
export function scoreFromRules(nutrients = {}, ingredientsText = '', userProfile = { conditions: [], allergies: [] }) {
  const ingredients = String(ingredientsText || '').toLowerCase();

  // baseline scoring similar to score_nutrients
  const sugar = Number(nutrients.sugars_100g || nutrients.sugars || nutrients['sugars_100g'] || 0);
  const fat = Number(nutrients.fat_100g || nutrients.fat || 0);
  const salt = Number(nutrients.salt_100g || nutrients.salt || nutrients.sodium_100g || 0);

  let score = 10;
  if (sugar > 10) score -= 3;
  if (fat > 15) score -= 2;
  if (salt > 1.5) score -= 2;

  let penalty = 0;
  const warnings = [];

  // Apply health rules per user condition
  (Array.isArray(userProfile.conditions) ? userProfile.conditions : []).forEach((condRaw) => {
    const cond = String(condRaw || '').trim().toLowerCase();
    const rules = HEALTH_RULES[cond];
    if (!rules) return;

    // nutrients
    const nutrientRules = rules.nutrients || {};
    Object.keys(nutrientRules).forEach((nutr) => {
      const limit = nutrientRules[nutr].max;
      const penal = nutrientRules[nutr].penalty || 0;
      const v = Number(nutrients[nutr] || nutrients[nutr.replace('_100g','')] || 0);
      if (typeof limit === 'number' && v > limit) {
        penalty -= penal;
        (rules.warnings || []).forEach(w => warnings.push(w));
      }
    });

    // ingredients (defensive: coerce rule to string)
    (Array.isArray(rules.ingredients) ? rules.ingredients : []).forEach((bad) => {
      try {
        const badStr = String(bad || '').toLowerCase();
        if (badStr && ingredients.includes(badStr)) {
          penalty -= (rules.penalty_points || 3);
          (rules.warnings || []).forEach(w => warnings.push(w));
        }
      } catch (e) {
        // ignore malformed rule entry
      }
    });
  });

  // Allergy check
  (Array.isArray(userProfile.allergies) ? userProfile.allergies : []).forEach((a) => {
    try {
      if (a && ingredients.includes(String(a).toLowerCase())) {
        penalty -= 5;
        warnings.push(`[HIGH] Contains allergen: ${a}`);
      }
    } catch (e) {
      // ignore malformed allergy entry
    }
  });

  // synergy rules
  (HEALTH_RULES.synergy_rules || []).forEach((rule) => {
    const n1 = Number(nutrients[rule.nutrient1] || 0);
    const n2 = Number(nutrients[rule.nutrient2] || 0);
    const t1 = rule.thresholds[0];
    const t2 = rule.thresholds[1];
    if (n1 > t1 && n2 > t2) {
      penalty -= rule.penalty || 0;
      warnings.push(rule.warning || 'Synergy warning');
    }
  });

  const totalPenalty = penalty;
  const finalScore10 = Math.max(0, score + totalPenalty); // 0..10 scale

  // Map to 0..100 for UI that expects healthScore in percent-like scale
  const finalScore100 = Math.round(finalScore10 * 10);

  const tier = finalScore10 >= 8 ? 'Daily' : finalScore10 >= 5 ? 'Moderate' : 'Occasional';

  // Confidence & reliability not computed here (no OFF metadata)
  const confidence = 'MEDIUM';

  // Unique combine warnings
  const uniqWarnings = Array.from(new Set(warnings));

  const explanation = `Score ${finalScore10}/10 — ${tier}`;

  return {
    Product: String(nutrients.product_name || nutrients.name || 'Unknown'),
    // keep both scales for consumers
    Score: finalScore10,
    score10: finalScore10,
    score: finalScore100,
    Tier: tier,
    Confidence: confidence,
    explanation,
    personalizedWarnings: uniqWarnings,
    Warnings: uniqWarnings,
    breakdown: { baseScore: score, penalty: Math.abs(totalPenalty) }
  };
}
