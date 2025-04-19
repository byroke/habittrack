// filepath: /home/pirat/my-expo-app/src/components/PresetHabitsModal.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  FlatList, 
  TextInput,
  SafeAreaView 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PresetHabit, PRESET_HABITS_BY_CATEGORY, ALL_PRESET_HABITS } from '../../utils/presetHabits';
import { useTheme } from '../context/ThemeContext';

interface PresetHabitsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPreset: (preset: PresetHabit) => void;
}

const PresetHabitsModal = ({ visible, onClose, onSelectPreset }: PresetHabitsModalProps) => {
  const { theme } = useTheme();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Categories including "All" at the beginning
  const categories = ['All', ...Object.keys(PRESET_HABITS_BY_CATEGORY)];
  
  // Filter presets based on active category and search query
  const getFilteredPresets = (): PresetHabit[] => {
    let presets = activeCategory === 'All' 
      ? ALL_PRESET_HABITS 
      : PRESET_HABITS_BY_CATEGORY[activeCategory as keyof typeof PRESET_HABITS_BY_CATEGORY];
    
    // Filter by search query if provided
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      return presets.filter(preset => 
        preset.title.toLowerCase().includes(query) || 
        preset.description?.toLowerCase().includes(query)
      );
    }
    
    return presets;
  };
  
  // Handle selecting a preset
  const handleSelectPreset = (preset: PresetHabit) => {
    onSelectPreset(preset);
    onClose();
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            {/* Header with close button */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]}>Preset Habits</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            {/* Search bar */}
            <View style={[styles.searchContainer, { backgroundColor: theme.colors.background }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.text} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Search presets..."
                placeholderTextColor={theme.colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={theme.colors.text} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Category tabs */}
            <FlatList
              horizontal
              data={categories}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryTab,
                    activeCategory === item && [
                      styles.activeTab,
                      { backgroundColor: theme.colors.primary + '30' }
                    ]
                  ]}
                  onPress={() => setActiveCategory(item)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: activeCategory === item ? theme.colors.primary : theme.colors.text }
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={item => item}
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesList}
            />
            
            {/* List of presets */}
            <FlatList
              data={getFilteredPresets()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.presetItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => handleSelectPreset(item)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                    <MaterialCommunityIcons name={item.icon} size={20} color="white" />
                  </View>
                  <View style={styles.presetInfo}>
                    <Text style={[styles.presetTitle, { color: theme.colors.text }]}>
                      {item.title}
                    </Text>
                    {item.description && (
                      <Text style={[styles.presetDescription, { color: theme.colors.muted }]} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                    <View style={styles.presetMeta}>
                      <View style={styles.frequencyContainer}>
                        <MaterialCommunityIcons name="calendar-range" size={14} color={theme.colors.muted} />
                        <Text style={[styles.frequencyText, { color: theme.colors.muted }]}>
                          {item.frequency.length === 7 
                            ? 'Every day' 
                            : item.frequency.join(', ')}
                        </Text>
                      </View>
                      {item.reminderEnabled && (
                        <View style={styles.reminderContainer}>
                          <MaterialCommunityIcons name="bell-outline" size={14} color={theme.colors.muted} />
                          <Text style={[styles.reminderText, { color: theme.colors.muted }]}>
                            {item.reminderTime}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.muted} />
                </TouchableOpacity>
              )}
              keyExtractor={(item, index) => `preset-${item.title}-${index}`}
              contentContainerStyle={styles.presetsList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
                    No matching presets found
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    padding: 0,
  },
  categoriesList: {
    flexGrow: 0,
    marginBottom: 16,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  activeTab: {
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  presetsList: {
    paddingBottom: 24,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  presetInfo: {
    flex: 1,
  },
  presetTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  presetDescription: {
    fontSize: 13,
    marginBottom: 6,
  },
  presetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  frequencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  frequencyText: {
    fontSize: 12,
    marginLeft: 4,
  },
  reminderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderText: {
    fontSize: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  }
});

export default PresetHabitsModal;
