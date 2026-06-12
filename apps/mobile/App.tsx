import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface ClipItem {
  id: string;
  content: string;
  type: string;
  timestamp: string;
}

export default function App() {
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load clipboard history from server
    loadClips();
  }, []);

  const loadClips = async () => {
    // TODO: Implement API call to load clips
    // For now, use mock data
    setClips([
      { id: '1', content: 'Hello, world!', type: 'text', timestamp: new Date().toISOString() },
      { id: '2', content: 'https://example.com', type: 'link', timestamp: new Date().toISOString() },
    ]);
  };

  const filteredClips = clips.filter(clip =>
    clip.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderClip = ({ item }: { item: ClipItem }) => (
    <TouchableOpacity style={styles.clipItem} onPress={() => copyToClipboard(item.content)}>
      <Text style={styles.clipContent} numberOfLines={2}>
        {item.content}
      </Text>
      <Text style={styles.clipMeta}>
        {item.type} • {timeAgo(item.timestamp)}
      </Text>
    </TouchableOpacity>
  );

  const copyToClipboard = async (content: string) => {
    // TODO: Implement clipboard copy
    console.log('Copy:', content);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.title}>📋 CopyCloud</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search clips..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <FlatList
        data={filteredClips}
        renderItem={renderClip}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const timeAgo = (timestamp: string): string => {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    padding: 16,
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  searchContainer: {
    padding: 12,
    backgroundColor: '#16213e',
  },
  searchInput: {
    padding: 10,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  list: {
    padding: 8,
  },
  clipItem: {
    padding: 12,
    marginVertical: 4,
    backgroundColor: '#16213e',
    borderRadius: 8,
  },
  clipContent: {
    fontSize: 14,
    color: '#eee',
  },
  clipMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
});