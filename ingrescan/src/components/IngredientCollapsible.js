import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Collapsible from 'react-native-collapsible';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { RISK_LEVELS } from '../constants/data';

const IngredientCollapsible = ({ ingredients = [] }) => {
  const [collapsed, setCollapsed] = useState({});

  const toggleCollapsed = (index) => {
    setCollapsed(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getRiskColor = (riskLevel) => {
    const level = String(riskLevel || 'LOW').toUpperCase();
    switch (level) {
      case 'LOW':
        return COLORS.lowRisk;
      case 'MEDIUM':
        return COLORS.mediumRisk;
      case 'HIGH':
        return COLORS.highRisk;
      default:
        return COLORS.lowRisk;
    }
  };

  const getRiskIcon = (category) => {
    const cat = String(category || '').toLowerCase();
    switch (cat) {
      case 'minerals':
        return '💊';
      case 'additive':
        return '🧪';
      case 'preservative':
        return '🛡️';
      case 'colorant':
        return '🎨';
      case 'sweetener':
        return '🍯';
      default:
        return '📋';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🧪</Text>
        <Text style={styles.headerTitle}>Additives</Text>
      </View>

      {(Array.isArray(ingredients) ? ingredients : []).map((ingredient = {}, index) => (
        <View key={index} style={styles.ingredientContainer}>
          <TouchableOpacity
            style={[
              styles.ingredientHeader,
              { borderLeftColor: getRiskColor(ingredient.riskLevel) }
            ]}
            onPress={() => toggleCollapsed(index)}
            activeOpacity={0.7}
          >
            <View style={styles.ingredientInfo}>
              <View style={styles.ingredientTitleRow}>
                <Text style={styles.ingredientIcon}>
                  {getRiskIcon(ingredient.category)}
                </Text>
                <Text style={styles.ingredientName}>{String(ingredient.name || '')}</Text>
                <MaterialIcons
                  name={collapsed[index] ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={24}
                  color={COLORS.textSecondary}
                />
              </View>
              <View style={styles.riskContainer}>
                <View 
                  style={[
                    styles.riskBadge, 
                    { backgroundColor: getRiskColor(ingredient.riskLevel) }
                  ]}
                >
                  <Text style={styles.riskText}>
                    {(() => {
                      const rl = String(ingredient.riskLevel || 'LOW').toUpperCase();
                      return RISK_LEVELS[rl] || rl;
                    })()}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <Collapsible collapsed={!collapsed[index]}>
            <View style={styles.ingredientContent}>
              <Text style={styles.ingredientDescription}>
                {ingredient.description}
              </Text>
              
              {ingredient.healthImpact && (
                <View style={styles.healthImpactContainer}>
                  <Text style={styles.healthImpactTitle}>Health Impact:</Text>
                  <Text style={styles.healthImpactText}>
                    {ingredient.healthImpact}
                  </Text>
                </View>
              )}
              
              {ingredient.alternatives && ingredient.alternatives.length > 0 && (
                <View style={styles.alternativesContainer}>
                  <Text style={styles.alternativesTitle}>Better Alternatives:</Text>
                  {ingredient.alternatives.map((alt, altIndex) => (
                    <Text key={altIndex} style={styles.alternativeItem}>
                      • {alt}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </Collapsible>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
    marginVertical: SPACING.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerIcon: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text,
  },
  ingredientContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  ingredientHeader: {
    padding: SPACING.md,
    borderLeftWidth: 4,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  ingredientIcon: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    marginRight: SPACING.sm,
  },
  ingredientName: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text,
  },
  riskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  riskText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textOnPrimary,
  },
  ingredientContent: {
    padding: SPACING.md,
    paddingTop: 0,
    backgroundColor: COLORS.backgroundLight,
  },
  ingredientDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.sm,
    marginBottom: SPACING.sm,
  },
  healthImpactContainer: {
    marginBottom: SPACING.sm,
  },
  healthImpactTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  healthImpactText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.sm,
  },
  alternativesContainer: {
    marginTop: SPACING.sm,
  },
  alternativesTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  alternativeItem: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    paddingLeft: SPACING.sm,
  },
});

export default IngredientCollapsible;