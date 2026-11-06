// The owner account only ever uses the website's dashboard (/admin); it has no couple profile in the app.
import { Linking, StyleSheet, View } from "react-native";
import { useGuard } from "~/lib/routing";
import { CONFIG } from "~/lib/config";
import { logout } from "~/data/actions";
import { Brand, Screen } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { Button } from "~/ui/Button";
import { usePageColors } from "~/theme/appearance";

export default function Owner() {
  useGuard(["/owner"]);
  const page = usePageColors();
  return (
    <Screen style={styles.screen}>
      <Brand small />
      <View style={styles.center}>
        <Text variant="title" center>Owner view</Text>
        <Text variant="body" color={page.inkMuted} center>This account is for the dashboard, which lives on the website.</Text>
      </View>
      <View style={styles.actions}>
        <Button label="Open dashboard" onPress={() => Linking.openURL(`${CONFIG.siteUrl}/admin`)} />
        <Button label="Sign out" kind="ghost" onPress={() => logout().catch(console.error)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 24, paddingTop: 16 },
  center: { flex: 1, justifyContent: "center", gap: 12 },
  actions: { gap: 8, paddingBottom: 24 },
});
