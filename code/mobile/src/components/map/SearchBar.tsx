import axios from '@/services/axiosService';
import { Search } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
  query: string;
  onChangeQuery: (text: string) => void;
  onSearch: (results: any[]) => void;
  onShowModal: (show: boolean) => void;
}

const SearchBar: React.FC<Props> = ({ query, onChangeQuery, onSearch, onShowModal }) => {
  const handleSearch = async () => {
    const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
    onSearch(res.data || []);
    onShowModal(true);
  };

  return (
    <View style={styles.container}>
      <TextInput style={styles.input} value={query} onChangeText={onChangeQuery} placeholder='Search address...' onSubmitEditing={handleSearch} />
      <TouchableOpacity style={styles.btn} onPress={handleSearch}>
        <Text>
          <Search size={20} color={'grey'} />
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  input: { flex: 1, padding: 10 },
  btn: { padding: 10 },
});

export default SearchBar;
