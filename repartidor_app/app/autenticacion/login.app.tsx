import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { styles } from "./login.style";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    try {
      setIsSubmitting(true);
      // const apiBaseUrl = Constants.expoConfig?.extra?.API_URL || "http://localhost:3000";
      // const apiBaseUrl = "http://32.196.136.221:3000";
      // const res = await fetch(`${apiBaseUrl}/api/auth/repartidor`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     email,
      //     password,
      //   }),
      // });

      // const data = await res.json();
      // console.log(data);

      // // Guardar el ID del repartidor en AsyncStorage
      // if (data?.id || data?.repartidor?.id) {
      //   const idRepartidor = data.id || data.repartidor.id;
      //   await AsyncStorage.setItem("idRepartidor", String(idRepartidor));
      //   console.log("✅ ID del repartidor guardado:", idRepartidor);
      // }

      router.push("../pedidos/Pedidos.app");
    } catch (error) {
      console.log("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#1f6f5f", "#2fa084", "#6fcf97"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBadge}>
              <MaterialCommunityIcons name="cog-outline" size={42} color="#ffffff" />
              <Text style={styles.logoLetter}>I</Text>
            </View>
          </View>

          <Text style={styles.title}>Iniciar Sesión</Text>
          <Text style={styles.subtitle}>Ingresa tus datos para acceder al sistema</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Correo Electrónico*</Text>
            <TextInput
              placeholder="usuario@gmail.com"
              placeholderTextColor="#9aa8ba"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="username"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contraseña*</Text>
            <TextInput
              placeholder="Ingresa tu contraseña"
              placeholderTextColor="#9aa8ba"
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
            />
          </View>

          <Text style={styles.terms}>
            Al iniciar sesión aceptas nuestros <Text style={styles.link}>Términos de Servicio</Text> y{" "}
            <Text style={styles.link}>Política de Privacidad</Text>
          </Text>

          <Pressable style={styles.secondaryButton} onPress={() => console.log("Ayuda") }>
            <Text style={styles.secondaryButtonText}>Ayuda</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              isSubmitting && styles.primaryButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>{isSubmitting ? "Ingresando..." : "Ingresar"}</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Copyright ConEmpaques</Text>
          <Text style={styles.footerDivider}>|</Text>
          <Text style={styles.footerLink}>Política de Privacidad</Text>
        </View>
      </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

