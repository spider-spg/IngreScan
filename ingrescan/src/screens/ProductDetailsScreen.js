import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  SafeAreaView,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { NutritionalTable, IngredientCollapsible, ProductCard } from '../components';
import ReviewForm from '../components/ReviewForm';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { SAMPLE_PRODUCTS } from '../constants/data';

const { width: screenWidth } = Dimensions.get('window');

const ProductDetailsScreen = ({ route, navigation }) => {
  const initialProduct = route.params && route.params.product ? route.params.product : {};
  const [productState, setProductState] = useState(initialProduct);
  const product = productState;
  const analysis = product.analysis || null;

  useEffect(() => {
    // If product has no name but we have a barcode, try to fetch the authoritative product doc
    const tryFetch = async () => {
      try {
        const barcode = product.barcode || product.barcodeKey || product.code || product.id || product.product_code || product.barcodeNumber || null;
        const missingName = !(product.product_name || product.productName || product.name || product.title);
        if (missingName && barcode) {
          const pRef = doc(db, 'products', String(barcode));
          const snap = await getDoc(pRef);
          if (snap && snap.exists()) {
            const remote = snap.data() || {};
            // Merge remote fields into current product, but preserve any existing analysis on the product
            const merged = { ...remote, ...product, analysis: product.analysis || remote.analysis };
            setProductState(merged);
          }
        }
      } catch (e) {
        console.warn('ProductDetails: failed to fetch product doc', e && e.message ? e.message : e);
      }
    };
    tryFetch();
  }, []);
  const [activeTab, setActiveTab] = useState('ingredients');
  const [isFavorite, setIsFavorite] = useState(false);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [showRawNutrition, setShowRawNutrition] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Normalize score for display: engine may return 0-10 or 0-100. We convert to 0-100.
  const rawScore = analysis?.score ?? product.healthScore ?? 0;
  const scoreValue = (rawScore <= 10 ? Math.round(rawScore * 10) : Math.round(rawScore));
  // Normalize image, nutrition and ingredients for products coming from OFF or Firestore
  const imageUri = product.image || product.image_url || (product.raw && (product.raw.image_small_url || product.raw.image_url)) || null;

  // Build nutrition object expected by NutritionalTable
  const buildNutrition = () => {
    // Merge all potential nutrition sources (productSnapshot, product.nutriments/nutrition, product.raw, analysis)
    const collect = (obj) => {
      if (!obj || typeof obj !== 'object') return {};
      if (obj.__raw && typeof obj.__raw === 'object') return obj.__raw;
      return obj;
    };

    const sources = [
      collect(product && product.productSnapshot && (product.productSnapshot.nutriments || product.productSnapshot.nutrition)),
      collect(product && product.nutriments),
      collect(product && product.nutrition),
      collect(product && product.raw && product.raw.nutriments),
      collect(analysis && analysis.nutrients),
      collect(analysis && analysis.raw_nutrients),
    ];

    // Merge with later sources overriding earlier ones
    const merged = Object.assign({}, ...sources.filter(s => s && typeof s === 'object'));

    // Coerce numeric-looking strings to numbers for display & sorting
    Object.keys(merged).forEach((k) => {
      const v = merged[k];
      if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) {
        merged[k] = Number(v);
      }
    });

    return merged;
  };

  const displayNutrition = buildNutrition();

  // Build ingredients array expected by IngredientCollapsible (array of objects)
  const buildIngredients = () => {
    // Prefer analysis ingredients from server (strings or objects)
    if (analysis) {
      if (Array.isArray(analysis.ingredients) && analysis.ingredients.length) return analysis.ingredients.map(i => (typeof i === 'string' ? { name: i } : i));
      if (typeof analysis.ingredients === 'string' && analysis.ingredients.trim()) {
        return String(analysis.ingredients).split(/,|;|\n/).map(s => ({ name: s.trim(), riskLevel: 'LOW', description: '' })).filter(i => i.name);
      }
    }

    // product.ingredients array
    if (Array.isArray(product.ingredients) && product.ingredients.length) return product.ingredients.map(i => (typeof i === 'string' ? { name: i } : i));

    // check nested raw fields
    const txtCandidates = [
      product.ingredients_text,
      product.ingredientList,
      product.raw && product.raw.ingredients_text,
      product.productSnapshot && product.productSnapshot.ingredients_text,
      product.productSnapshot && product.productSnapshot.ingredientList,
    ];
    const txt = txtCandidates.find(t => typeof t === 'string' && t.trim()) || '';
    if (!txt) return [];
    // split by comma/semicolon/newline and create simple ingredient items
    return String(txt).split(/,|;|\n/).map(s => ({ name: s.trim(), riskLevel: 'LOW', description: '' })).filter(i => i.name);
  };

  const ingredientList = buildIngredients();
  const getHealthScoreColor = (score) => {
    if (score >= 80) return COLORS.lowRisk;
    if (score >= 60) return COLORS.mediumRisk;
    return COLORS.highRisk;
  };

  const getHealthScoreText = (score) => {
    if (score >= 80) return 'Excellent Choice';
    if (score >= 60) return 'Good Choice';
    if (score >= 40) return 'Moderate Choice';
    return 'Consider Alternatives';
  };

  const handleFavoritePress = () => {
    setIsFavorite(!isFavorite);
    Alert.alert(
      isFavorite ? 'Removed from Favorites' : 'Added to Favorites',
      isFavorite ? 'Product removed from your favorites' : 'Product added to your favorites'
    );
  };

  const handleSharePress = () => {
    Alert.alert('Share', 'Share functionality coming soon!');
  };

  const handleAlternativePress = (alternative) => {
    Alert.alert('Alternative Product', `${alternative.name} details coming soon!`);
  };

  // Sample alternatives for demo
  const alternatives = [
    { id: '2', name: 'Natural Spring Water', brand: 'HIMALAYAN', healthScore: 90 },
    { id: '3', name: 'Alkaline Water', brand: 'EVOCUS', healthScore: 85 },
  ];

  // Normalize a display name to handle different shapes coming from history or product docs
  const displayName = product.product_name || product.productName || product.name || product.title || 'Unnamed Product';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Product Header */}
        <View style={styles.productHeader}>
          <View style={styles.productImageContainer}>
            {product.image ? (
              <Image source={{ uri: product.image }} style={styles.productImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <MaterialIcons name="fastfood" size={48} color={COLORS.textLight} />
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.favoriteButton}
              onPress={handleFavoritePress}
            >
              <MaterialIcons 
                name={isFavorite ? "favorite" : "favorite-border"} 
                size={24} 
                color={isFavorite ? COLORS.error : COLORS.textSecondary} 
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{displayName}</Text>
            <Text style={styles.brandName}>{product.brand}</Text>
            {product.size && <Text style={styles.productSize}>{product.size}</Text>}
            
            <View style={styles.originContainer}>
              <Text style={styles.originFlag}>🇮🇳</Text>
              <Text style={styles.originText}>स्वदेशी • {product.size}</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={handleSharePress}
          >
            <MaterialIcons name="share" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Health Score */}
        <View style={styles.healthScoreContainer}>
          <View style={styles.healthScoreCard}>
            <View style={styles.scoreDisplay}>
              <View 
                style={[
                  styles.scoreCircle, 
                  { backgroundColor: getHealthScoreColor(product.healthScore) }
                ]}
              >
                <Text style={styles.scoreNumber}>{product.healthScore}</Text>
              </View>
              <View style={styles.scoreInfo}>
                <Text style={styles.scoreTitle}>Health Score</Text>
                <Text style={[
                  styles.scoreStatus, 
                  { color: getHealthScoreColor(product.healthScore) }
                ]}>
                  {getHealthScoreText(product.healthScore)}
                </Text>
              </View>
            </View>
            
            {((product.personalizedWarnings && product.personalizedWarnings.length > 0) || (analysis && analysis.personalizedWarnings && analysis.personalizedWarnings.length > 0)) && (
              <View style={styles.warningContainer}>
                <MaterialIcons name="warning" size={20} color={COLORS.warning} />
                <Text style={styles.warningText}>
                  {(analysis && analysis.personalizedWarnings && analysis.personalizedWarnings[0]) || (product.personalizedWarnings && product.personalizedWarnings[0])}
                </Text>
              </View>
            )}

            {/* One-line explanation (collapsible) */}
            {analysis && (
              <View style={{ marginTop: SPACING.md }}>
                <TouchableOpacity onPress={() => setExplanationOpen(!explanationOpen)}>
                  <Text style={{ fontWeight: '700', color: COLORS.text }}>{analysis.explanation}</Text>
                </TouchableOpacity>
                {explanationOpen && (
                  <View style={{ marginTop: SPACING.sm }}>
                    <Text style={{ color: COLORS.textSecondary }}>{`Breakdown: base ${analysis.breakdown.baseScore}, penalty ${analysis.breakdown.penalty}`}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'ingredients' && styles.activeTab
            ]}
            onPress={() => setActiveTab('ingredients')}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'ingredients' && styles.activeTabText
            ]}>
              Ingredients
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'nutrition' && styles.activeTab
            ]}
            onPress={() => setActiveTab('nutrition')}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'nutrition' && styles.activeTabText
            ]}>
              Nutrients
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'ingredients' ? (
            <IngredientCollapsible ingredients={ingredientList} />
          ) : (
            <>
              <NutritionalTable 
                nutrition={displayNutrition} 
                showPerUnit={product.size || '100ml'} 
              />
              <TouchableOpacity style={{ marginTop: 8 }} onPress={() => setShowRawNutrition(s => !s)}>
                <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Show raw nutrition ({Object.keys(displayNutrition || {}).length})</Text>
              </TouchableOpacity>
              {showRawNutrition && (
                <ScrollView style={{ marginTop: 8, maxHeight: 220, backgroundColor: COLORS.surface, padding: SPACING.sm, borderRadius: 8 }}>
                  <Text style={{ color: COLORS.text, fontSize: 12 }}>{JSON.stringify(displayNutrition, null, 2)}</Text>
                </ScrollView>
              )}
            </>
          )}
        </View>

        {/* Sustainability Info */}
        <View style={styles.sustainabilityContainer}>
          <View style={styles.sustainabilityCard}>
            <View style={styles.sustainabilityHeader}>
              <MaterialIcons name="eco" size={24} color={COLORS.success} />
              <Text style={styles.sustainabilityTitle}>Environmental Impact</Text>
            </View>
            <Text style={styles.sustainabilityText}>
              🌍 Medium carbon footprint - packaged in plastic. Consider recycling after use.
            </Text>
          </View>
        </View>

        {/* Alternatives Section */}
        {alternatives.length > 0 && (
          <View style={styles.alternativesSection}>
            <Text style={styles.sectionTitle}>Better Alternatives</Text>
            <Text style={styles.sectionSubtitle}>
              Similar products with higher health scores
            </Text>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.alternativesContainer}
            >
              {alternatives.map((alternative) => (
                <View key={alternative.id} style={styles.alternativeItem}>
                  <ProductCard
                    product={alternative}
                    onPress={() => handleAlternativePress(alternative)}
                    showDetails={true}
                    style={styles.alternativeCard}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => Alert.alert('Report', 'Report functionality coming soon!')}
          >
            <MaterialIcons name="flag" size={20} color={COLORS.textSecondary} />
            <Text style={styles.secondaryButtonText}>Report Issue</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => navigation.navigate('Scan')}
          >
            <MaterialIcons name="qr-code-scanner" size={20} color={COLORS.textOnPrimary} />
            <Text style={styles.primaryButtonText}>Scan Another</Text>
          </TouchableOpacity>
        </View>

        {/* Review Section */}
        <View style={{ paddingHorizontal: SPACING.lg, marginTop: SPACING.md }}>
          {!showReviewForm ? (
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: COLORS.surface }]} onPress={() => setShowReviewForm(true)}>
              <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Write a Review</Text>
            </TouchableOpacity>
          ) : (
            <ReviewForm 
              initialRating={5}
              onSubmit={async ({ rating, text }) => {
                const user = auth.currentUser;
                if (!user) { Alert.alert('Sign in required', 'Please sign in to submit reviews'); return; }
                setSubmittingReview(true);
                try {
                  const scanId = product.barcode || product.barcodeKey || product.id || String(product.product_code || product.code || product.barcodeNumber || 'unknown');
                  const reviewsCol = collection(db, 'users', user.uid, 'scans', String(scanId), 'reviews');
                  await addDoc(reviewsCol, { rating, text, createdAt: serverTimestamp(), author: { uid: user.uid, email: user.email, name: user.displayName || '' } });
                  Alert.alert('Thanks!', 'Your review was saved.');
                  setShowReviewForm(false);
                } catch (e) {
                  console.warn('Failed to save review', e && e.message ? e.message : e);
                  Alert.alert('Error', 'Failed to save review');
                } finally {
                  setSubmittingReview(false);
                }
              }}
              submitting={submittingReview}
            />
          )}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  scrollView: {
    flex: 1,
  },
  productHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    alignItems: 'flex-start',
    ...SHADOWS.small,
  },
  productImageContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    padding: SPACING.xs,
    ...SHADOWS.small,
  },
  productInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  productName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  brandName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginBottom: SPACING.xs,
  },
  productSize: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  originContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originFlag: {
    fontSize: TYPOGRAPHY.fontSize.base,
    marginRight: SPACING.xs,
  },
  originText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  shareButton: {
    padding: SPACING.sm,
  },
  healthScoreContainer: {
    padding: SPACING.lg,
  },
  healthScoreCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  scoreNumber: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textOnPrimary,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  scoreStatus: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  warningText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.warning,
    marginLeft: SPACING.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.xs,
    ...SHADOWS.small,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  activeTabText: {
    color: COLORS.textOnPrimary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  tabContent: {
    paddingHorizontal: SPACING.lg,
  },
  sustainabilityContainer: {
    paddingHorizontal: SPACING.lg,
  },
  sustainabilityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  sustainabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sustainabilityTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  sustainabilityText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.sm,
  },
  alternativesSection: {
    paddingTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  alternativesContainer: {
    paddingLeft: SPACING.lg,
  },
  alternativeItem: {
    width: screenWidth * 0.8,
    marginRight: SPACING.md,
  },
  alternativeCard: {
    marginVertical: 0,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  primaryButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginLeft: SPACING.sm,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginLeft: SPACING.sm,
  },
  bottomSpacing: {
    height: SPACING.xl,
  },
});

export default ProductDetailsScreen;