import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Button } from "../src/components/ui/Button";
import { extractLockIdFromUrl } from "../src/lib/urlUtils";

export default function ScanScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const lockId = extractLockIdFromUrl(data);
    if (lockId) {
      router.replace(`/lock/${lockId}`);
    } else {
      setScanned(false);
    }
  };

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View
        className="flex-1 bg-slate-900 items-center justify-center px-8"
        style={{ paddingTop: insets.top }}
      >
        <MaterialCommunityIcons
          name="camera-off"
          size={64}
          color="#475569"
        />
        <Text className="text-slate-300 text-lg text-center mt-4 mb-6">
          נדרשת גישה למצלמה לסריקת קודי QR
        </Text>
        <Button title="אפשר גישה" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay on top of camera using absolute positioning */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View className="flex-1 items-center justify-center">
          <View className="w-64 h-64 border-2 border-white/50 rounded-3xl" />
          <Text className="text-white text-base mt-6 font-bold">
            {t("lock.scanQr")}
          </Text>
        </View>

        {/* Close button */}
        <TouchableOpacity
          className="absolute bg-black/50 w-10 h-10 rounded-full items-center justify-center"
          style={{ top: insets.top + 12, left: insets.left + 16 }}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="close" size={24} color="white" />
        </TouchableOpacity>

        {scanned && (
          <View className="absolute bottom-16 left-8 right-8">
            <Button
              title="סרוק שוב"
              variant="secondary"
              onPress={() => setScanned(false)}
            />
          </View>
        )}
      </View>
    </View>
  );
}
