import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Button from "./../components/Button";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>খামার বন্ধু</Text>

      <Text style={styles.subtitle}>
        গরুর খামার ব্যবস্থাপনা ও ক্রয়-বিক্রয়ের স্মার্ট সমাধান
      </Text>

      <Button
        title="খামারি হিসেবে শুরু করুন →"
        onPress={() => router.push("/auth/login?role=farmer")}
        icon={null}
        style={{}}
        textStyle={{}}
      />
      

      <Button
        title="ক্রেতা হিসেবে শুরু করুন →"
        variant="secondary"
        onPress={() => router.push("/auth/login?role=buyer")}
        icon={null}
        style={{}}
        textStyle={{}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 25,
    backgroundColor: "#e8efe8",
  },

  title: {
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    color: "#0a5c2b",
    marginBottom: 20,
  },

  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
    color: "#333",
  },
});
