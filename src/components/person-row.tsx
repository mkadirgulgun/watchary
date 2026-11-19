import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth-store";
import { PublicProfile } from "@/lib/community";
import { setFollow, useIsFollowing } from "@/lib/social";

/** Kişi listelerindeki satır: avatar, ad, kullanıcı adı ve takip düğmesi. */
export function PersonRow({ person, onPress }: { person: PublicProfile; onPress: () => void }) {
  const me = useAuth((s) => s.session?.user.id);
  const following = useIsFollowing(person.id);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    await setFollow(person.id, !following);
    setBusy(false);
  };

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Avatar name={person.name} uri={person.avatarUrl} size={44} />
      <View style={{ flex: 1 }}>
        <AppText variant="title" numberOfLines={1}>
          {person.name}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          @{person.handle}
        </AppText>
      </View>
      {person.id !== me && (
        <Button
          size="sm"
          variant={following ? "secondary" : "primary"}
          label={following ? "Takiptesin" : "Takip Et"}
          onPress={toggle}
          disabled={busy}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
});
