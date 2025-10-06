import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from '../constants/theme';

const NutritionalTable = ({ nutrition = {}, showPerUnit = '100ml' }) => {
  // Friendly label and unit map for common nutrient keys
  const KNOWN = {
    energy_kcal_100g: { label: 'Energy', unit: 'kcal' },
    energy_100g: { label: 'Energy', unit: 'kcal' },
    calories: { label: 'Calories', unit: 'kcal' },
    energy: { label: 'Energy', unit: 'kcal' },
    proteins_100g: { label: 'Protein', unit: 'g' },
    protein: { label: 'Protein', unit: 'g' },
    proteins: { label: 'Protein', unit: 'g' },
    carbohydrates_100g: { label: 'Carbohydrates', unit: 'g' },
    carbohydrates: { label: 'Carbohydrates', unit: 'g' },
    carbs: { label: 'Carbohydrates', unit: 'g' },
    sugars_100g: { label: 'Sugars', unit: 'g' },
    sugars: { label: 'Sugars', unit: 'g' },
    sugar: { label: 'Sugars', unit: 'g' },
    fat_100g: { label: 'Fat', unit: 'g' },
    fat: { label: 'Fat', unit: 'g' },
    'saturated-fat_100g': { label: 'Saturated fat', unit: 'g' },
    saturated_fat_100g: { label: 'Saturated fat', unit: 'g' },
    'trans-fat_100g': { label: 'Trans fat', unit: 'g' },
    fiber_100g: { label: 'Fiber', unit: 'g' },
    fiber: { label: 'Fiber', unit: 'g' },
    salt_100g: { label: 'Salt', unit: 'g' },
    salt: { label: 'Salt', unit: 'g' },
    sodium_100g: { label: 'Sodium', unit: 'mg' },
    sodium: { label: 'Sodium', unit: 'mg' },
    cholesterol_100g: { label: 'Cholesterol', unit: 'mg' },
    cholesterol: { label: 'Cholesterol', unit: 'mg' },
    vitamin_c_100g: { label: 'Vitamin C', unit: 'mg' },
    vitamin_c: { label: 'Vitamin C', unit: 'mg' },
    vitamin_a_100g: { label: 'Vitamin A', unit: 'µg' },
    vitamin_a: { label: 'Vitamin A', unit: 'µg' },
    magnesium_100g: { label: 'Magnesium', unit: 'mg' },
    magnesium: { label: 'Magnesium', unit: 'mg' },
    potassium_100g: { label: 'Potassium', unit: 'mg' },
    potassium: { label: 'Potassium', unit: 'mg' },
  };

  // Normalize nutrition into entries
  const entries = Object.entries(nutrition || {}).filter(([k, v]) => v !== undefined && v !== null && v !== '');

  // Use a preferred order for common keys
  const preferredOrder = [
    'calories', 'energy_kcal_100g', 'energy_100g',
    'protein', 'proteins', 'proteins_100g',
    'fat', 'fat_100g', 'saturated-fat_100g', 'saturated_fat_100g',
    'carbs', 'carbohydrates', 'carbohydrates_100g',
    'sugars', 'sugars_100g', 'salt', 'salt_100g', 'sodium', 'sodium_100g',
  ];

  const byKey = {};
  entries.forEach(([k, v]) => { byKey[k] = v; });

  const ordered = [];
  preferredOrder.forEach((k) => { if (k in byKey) { ordered.push([k, byKey[k]]); delete byKey[k]; } });
  // remaining keys alphabetically
  const rest = Object.keys(byKey).sort();
  rest.forEach(k => ordered.push([k, byKey[k]]));

  const nutritionItems = ordered.map(([key, rawValue]) => {
    const lower = key.toLowerCase();
    const known = KNOWN[lower] || KNOWN[key];
    const label = known ? known.label : key.replace(/[_\-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const unit = known ? known.unit : '';
    const valueNum = typeof rawValue === 'number' ? rawValue : (rawValue && !Number.isNaN(Number(rawValue)) ? Number(rawValue) : rawValue);
    // format numeric to max 2 decimals
    const value = typeof valueNum === 'number' ? (Math.round(valueNum * 100) / 100) : String(rawValue);
    return { key, label, value, unit };
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nutritional Information</Text>
      </View>

      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Nutrients</Text>
          <Text style={styles.tableHeaderText}>Per {showPerUnit}</Text>
        </View>

        <ScrollView style={styles.tableBody}>
          {nutritionItems.map((item, index) => (
            <View
              key={item.key}
              style={[
                styles.tableRow,
                index % 2 === 0 && styles.tableRowEven,
                index === nutritionItems.length - 1 && styles.tableRowLast
              ]}
            >
              <Text style={styles.nutrientName}>{item.label}</Text>
              <Text style={styles.nutrientValue}>
                {item.value}{item.unit ? ` ${item.unit}` : ''}
              </Text>
            </View>
          ))}
        </ScrollView>

        <Text style={styles.disclaimer}>*Approximate values</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
    marginVertical: SPACING.sm,
  },
  header: {
    backgroundColor: COLORS.backgroundSecondary,
    padding: SPACING.md,
    borderTopLeftRadius: BORDER_RADIUS.md,
    borderTopRightRadius: BORDER_RADIUS.md,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text,
    textAlign: 'center',
  },
  tableContainer: {
    padding: SPACING.md,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  tableHeaderText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text,
  },
  tableBody: {
    maxHeight: 300,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  tableRowEven: {
    backgroundColor: COLORS.backgroundLight,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  nutrientName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text,
    flex: 1,
  },
  nutrientValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text,
    textAlign: 'right',
  },
  disclaimer: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});

export default NutritionalTable;