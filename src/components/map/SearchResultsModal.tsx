import React from 'react';
import { Button, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  visible: boolean;
  results: any[];
  onSelect: (res: any) => void;
  onClose: () => void;
}

const SearchResultsModal: React.FC<Props> = ({ visible, results, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType='slide'>
    <View style={styles.container}>
      <View style={styles.modal}>
        <Text style={styles.title}>Search Results</Text>
        <ScrollView>
          {results.map((r, i) => (
            <TouchableOpacity
              key={i}
              onPress={() =>
                onSelect({
                  latitude: parseFloat(r.lat),
                  longitude: parseFloat(r.lon),
                  title: r.display_name,
                })
              }
            >
              <Text style={styles.result}>{r.display_name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Button title='Close' onPress={onClose} color='#FF5252' />
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modal: { margin: 20, backgroundColor: '#fff', borderRadius: 10, padding: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  result: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
});

export default SearchResultsModal;
