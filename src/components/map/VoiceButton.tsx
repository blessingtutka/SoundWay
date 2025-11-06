import { Mic } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  isListening: boolean;
  onPress: () => void;
}

const VoiceButton: React.FC<Props> = ({ isListening, onPress }) => (
  <TouchableOpacity style={[styles.btn, isListening && styles.active]} onPress={onPress}>
    <Text style={styles.text}>
      <Mic size={28} color={'white'} />
    </Text>
    {isListening && <View style={styles.indicator} />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    backgroundColor: '#FDB327',
    padding: 15,
    borderRadius: 50,
    zIndex: 99,
  },
  active: { backgroundColor: '#1E3A8A' },
  text: { fontSize: 24, color: '#fff' },
  indicator: {
    width: 10,
    height: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    position: 'absolute',
    top: 10,
    right: 10,
  },
});

export default VoiceButton;
