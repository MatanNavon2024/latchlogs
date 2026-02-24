import { View, Text, TouchableOpacity, Modal } from "react-native";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface ActionSheetProps {
  visible: boolean;
  lockName: string;
  onLock: () => void;
  onUnlock: () => void;
  onClose: () => void;
}

export function ActionSheet({
  visible,
  lockName,
  onLock,
  onUnlock,
  onClose,
}: ActionSheetProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 bg-black/50 justify-end"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1}>
          <View className="bg-slate-800 rounded-t-3xl px-6 pb-10 pt-4">
            {/* Handle */}
            <View className="w-10 h-1 bg-slate-600 rounded-full self-center mb-4" />

            <Text className="text-white text-xl font-bold text-center mb-6">
              {lockName}
            </Text>

            <View className="gap-3">
              <TouchableOpacity
                className="bg-locked py-5 rounded-2xl items-center flex-row justify-center gap-3"
                onPress={onLock}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="lock"
                  size={24}
                  color="white"
                />
                <Text className="text-white text-xl font-bold">
                  {t("lock.markLocked")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-unlocked py-5 rounded-2xl items-center flex-row justify-center gap-3"
                onPress={onUnlock}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="lock-open"
                  size={24}
                  color="white"
                />
                <Text className="text-white text-xl font-bold">
                  {t("lock.markUnlocked")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="py-4 rounded-xl items-center"
                onPress={onClose}
              >
                <Text className="text-slate-400 text-base font-bold">
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
