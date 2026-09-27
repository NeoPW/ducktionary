import { Alert } from "react-native";

/** Promise-based yes/no dialog. Resolves true when the user confirms. */
export function askToConfirm({
  title,
  message,
  confirmText,
  destructive = false,
}: {
  title: string;
  message: string;
  confirmText: string;
  destructive?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}
