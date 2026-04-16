import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { BorderRadius, Colors, FontSize, Spacing } from "../constants/theme";

const { width: SW, height: SH } = Dimensions.get("window");

// ── Slide data ────────────────────────────────────────────────────────────
const SLIDES = [
  {
    key: "welcome",
    gradient: ["#0D3B12", "#1B5E20", "#2E7D32"],
    emoji: "🐄",
    title: "খামার বন্ধুতে\nস্বাগতম!",
    sub: "আপনার গরুর খামার পরিচালনার\nসবচেয়ে বিশ্বস্ত সঙ্গী",
    features: [
      { icon: "📋", text: "গরুর তথ্য সহজে পরিচালনা করুন" },
      { icon: "💰", text: "খরচ ও মুনাফার হিসাব রাখুন" },
      { icon: "🏥", text: "স্বাস্থ্য ও টিকার রেকর্ড সংরক্ষণ" },
    ],
  },
  {
    key: "marketplace",
    gradient: ["#01579B", "#0277BD", "#0288D1"],
    emoji: "🤝",
    title: "সেরা দামে\nগরু কিনুন-বেচুন",
    sub: "সারা বাংলাদেশের বিশ্বস্ত\nকৃষকদের সাথে সরাসরি যোগাযোগ",
    features: [
      { icon: "🗺️", text: "কাছের গরু খুঁজুন লোকেশন দিয়ে" },
      { icon: "⭐", text: "Health Score দেখে নিশ্চিন্তে কিনুন" },
      { icon: "💬", text: "সরাসরি বিক্রেতার সাথে কথা বলুন" },
    ],
  },
  {
    key: "start",
    gradient: ["#1A237E", "#283593", "#303F9F"],
    emoji: "🚀",
    title: "এখনই শুরু করুন!",
    sub: "বিনামূল্যে অ্যাকাউন্ট তৈরি করুন\nএবং খামার পরিচালনা শুরু করুন",
    features: [
      { icon: "✅", text: "সম্পূর্ণ বিনামূল্যে ব্যবহার করুন" },
      { icon: "🔒", text: "আপনার তথ্য সম্পূর্ণ নিরাপদ" },
      { icon: "📱", text: "যেকোনো সময়, যেকোনো জায়গা থেকে" },
    ],
  },
];

// ── Animated feature item ─────────────────────────────────────────────────
function FeatureItem({ icon, text, index }) {
  const translateX = useSharedValue(-40);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withDelay(
      300 + index * 120,
      withSpring(0, { damping: 16, stiffness: 120 }),
    );
    opacity.value = withDelay(
      300 + index * 120,
      withTiming(1, { duration: 400 }),
    );
  }, [index]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.featureRow, animStyle]}>
      <View style={styles.featureIcon}>
        <Text style={styles.featureEmoji}>{icon}</Text>
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </Animated.View>
  );
}

// ── Animated emoji ────────────────────────────────────────────────────────
function AnimatedEmoji({ emoji }) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(-15);
  const float = useSharedValue(0);

  useEffect(() => {
    // Entrance
    scale.value = withSpring(1, { damping: 12, stiffness: 100 });
    opacity.value = withTiming(1, { duration: 400 });
    rotate.value = withSpring(0, { damping: 10 });

    // Floating loop
    float.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(-12, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, [emoji]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
      { translateY: float.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.emojiWrap, animStyle]}>
      <Text style={styles.bigEmoji}>{emoji}</Text>
    </Animated.View>
  );
}

// ── Progress dots ─────────────────────────────────────────────────────────
function Dots({ total, active }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dotBase,
            i === active ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ── Single slide ──────────────────────────────────────────────────────────
function Slide({ slide, entering, exiting }) {
  const titleY = useSharedValue(30);
  const titleOp = useSharedValue(0);

  useEffect(() => {
    titleY.value = withDelay(200, withSpring(0, { damping: 14 }));
    titleOp.value = withDelay(200, withTiming(1, { duration: 500 }));
  }, [slide.key]);

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleY.value }],
    opacity: titleOp.value,
  }));

  return (
    <Animated.View style={styles.slide} entering={entering} exiting={exiting}>
      <LinearGradient
        colors={slide.gradient}
        style={styles.slideGrad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative circles */}
        <View style={styles.deco1} />
        <View style={styles.deco2} />
        <View style={styles.deco3} />

        {/* Emoji */}
        <AnimatedEmoji key={slide.key} emoji={slide.emoji} />

        {/* Title & sub */}
        <Animated.View style={[styles.textBlock, titleStyle]}>
          <Text style={styles.slideTitle}>{slide.title}</Text>
          <Text style={styles.slideSub}>{slide.sub}</Text>
        </Animated.View>

        {/* Features */}
        <View style={styles.featuresWrap}>
          {slide.features.map((f, i) => (
            <FeatureItem key={i} icon={f.icon} text={f.text} index={i} />
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function SplashScreen() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(1); // 1 = forward, -1 = back

  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const pressIn = () => {
    btnScale.value = withTiming(0.95, { duration: 100 });
  };
  const pressOut = () => {
    btnScale.value = withSpring(1, { damping: 10 });
  };

  const goNext = () => {
    if (current < SLIDES.length - 1) {
      setDir(1);
      setCurrent((c) => c + 1);
    } else {
      router.replace("/");
    }
  };

  const goBack = () => {
    if (current > 0) {
      setDir(-1);
      setCurrent((c) => c - 1);
    }
  };

  const skip = () => router.replace("/");

  const isLast = current === SLIDES.length - 1;
  const slide = SLIDES[current];

  const entering = dir > 0 ? SlideInRight : FadeIn.duration(350);
  const exiting = dir > 0 ? SlideOutLeft : FadeOut.duration(250);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Main slide (keyed so it remounts on change) */}
      <Slide
        key={current}
        slide={slide}
        entering={entering}
        exiting={exiting}
      />

      {/* Bottom overlay */}
      <View style={styles.bottomOverlay}>
        {/* Dots */}
        <Dots total={SLIDES.length} active={current} />

        {/* Buttons */}
        <View style={styles.btnRow}>
          {current > 0 ? (
            <TouchableOpacity style={styles.backBtn} onPress={goBack}>
              <Text style={styles.backBtnText}>← পেছনে</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.skipBtn} onPress={skip}>
              <Text style={styles.skipText}>এড়িয়ে যান</Text>
            </TouchableOpacity>
          )}

          <Animated.View style={btnStyle}>
            <TouchableOpacity
              style={[styles.nextBtn, isLast && styles.nextBtnLast]}
              onPress={goNext}
              onPressIn={pressIn}
              onPressOut={pressOut}
              activeOpacity={1}
            >
              <LinearGradient
                colors={
                  isLast
                    ? ["#fff", "#f0f0f0"]
                    : ["rgba(255,255,255,0.25)", "rgba(255,255,255,0.15)"]
                }
                style={styles.nextBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text
                  style={[styles.nextBtnText, isLast && styles.nextBtnTextLast]}
                >
                  {isLast ? "🚀 শুরু করুন" : "পরবর্তী →"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Login link */}
        {isLast && (
          <Animated.View entering={FadeIn.delay(400)}>
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.replace("/")}
            >
              <Text style={styles.loginLinkText}>
                ইতিমধ্যে অ্যাকাউন্ট আছে?{" "}
                <Text style={styles.loginLinkBold}>লগইন করুন</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primaryDark },

  slide: { ...StyleSheet.absoluteFillObject },
  slideGrad: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: 60,
  },

  // Decorative circles
  deco1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.04)",
    top: -80,
    right: -80,
  },
  deco2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: 100,
    left: -60,
  },
  deco3: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.03)",
    top: 120,
    left: -20,
  },

  // Emoji
  emojiWrap: { marginBottom: Spacing.xl },
  bigEmoji: { fontSize: 90 },

  // Text block
  textBlock: { alignItems: "center", marginBottom: Spacing.xl },
  slideTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    lineHeight: 40,
    letterSpacing: 0.5,
  },
  slideSub: {
    fontSize: FontSize.md,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    marginTop: Spacing.md,
    lineHeight: 24,
  },

  // Features
  featuresWrap: { width: "100%", gap: Spacing.sm, marginBottom: Spacing.xxxl },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureEmoji: { fontSize: 18 },
  featureText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },

  // Bottom overlay
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 44,
    gap: Spacing.lg,
  },

  // Dots
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dotBase: { height: 6, borderRadius: 3 },
  dotActive: { width: 24, backgroundColor: "#fff" },
  dotInactive: { width: 8, backgroundColor: "rgba(255,255,255,0.35)" },

  // Buttons
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skipBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  skipText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: FontSize.sm,
    fontWeight: "500",
  },
  backBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  backBtnText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: FontSize.sm,
    fontWeight: "600",
  },

  nextBtn: { borderRadius: BorderRadius.full, overflow: "hidden" },
  nextBtnLast: { borderRadius: BorderRadius.xl },
  nextBtnGrad: { paddingHorizontal: 28, paddingVertical: 14 },
  nextBtnText: { color: "#fff", fontWeight: "800", fontSize: FontSize.md },
  nextBtnTextLast: { color: Colors.primary },

  // Login link
  loginLink: { alignItems: "center" },
  loginLinkText: { color: "rgba(255,255,255,0.6)", fontSize: FontSize.sm },
  loginLinkBold: { color: "#fff", fontWeight: "700" },
});
