import { ImageBackground, ScrollView, StyleSheet, View } from 'react-native';

export function ScreenLayout({ children }: { children: React.ReactNode }) {
  return (
    <ImageBackground
      source={require('@/assets/images/back.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="flex-1 items-center py-4 px-4">{children}</View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
