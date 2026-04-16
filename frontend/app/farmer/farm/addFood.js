import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useFarm } from '../../../context/FarmContext';
// import FooterNavigation from '../FooterNavigation';

const AddFood = () => {
//   const { addCost } = useFarm();

  const [selectedGroup, setSelectedGroup] = useState('bachur');

  const [grass, setGrass] = useState('');
  const [bran, setBran] = useState('');
  const [feed, setFeed] = useState('');

  const [history, setHistory] = useState([]);

  // cost per kg
  const grassCost = 2;
  const branCost = 30;
  const feedCost = 40;

  // calculation
  const totalGrass = Number(grass) * grassCost || 0;
  const totalBran = Number(bran) * branCost || 0;
  const totalFeed = Number(feed) * feedCost || 0;

  const total = totalGrass + totalBran + totalFeed;

  // 📦 Load history
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await AsyncStorage.getItem('food_history');
      if (data) setHistory(JSON.parse(data));
    } catch (error) {
      console.log(error);
    }
  };

  // 💾 Save history
  useEffect(() => {
    AsyncStorage.setItem('food_history', JSON.stringify(history));
  }, [history]);

  // reset form on tab change
  useEffect(() => {
    setGrass('');
    setBran('');
    setFeed('');
  }, [selectedGroup]);

  // save
  const handleSave = () => {
    if (total === 0) return;

    addCost(total);

    const newItem = {
      id: Date.now(),
      group: selectedGroup,
      grass,
      bran,
      feed,
      total,
      date: new Date().toLocaleDateString('bn-BD'),
    };

    setHistory(prev => [newItem, ...prev]);

    setGrass('');
    setBran('');
    setFeed('');
  };

  const getTitle = () => {
    if (selectedGroup === 'bachur') return 'বাছুরের খাবার';
    if (selectedGroup === 'gavi') return 'গাভীর খাবার';
    return 'ষাঁড় গরুর খাবার';
  };

  const getGroupName = (group) => {
    if (group === 'bachur') return 'বাছুর';
    if (group === 'gavi') return 'গাভী';
    return 'ষাঁড়';
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="arrow-back" size={22} color="white" />
          <Text style={styles.headerTitle}>{getTitle()}</Text>
        </View>

        {/* 🔥 Tabs */}
        <View style={styles.tabs}>
          {[
            { key: 'bachur', label: 'বাছুর' },
            { key: 'gavi', label: 'গাভী' },
            { key: 'shar', label: 'ষাঁড়' },
          ].map(item => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.tab,
                selectedGroup === item.key && styles.activeTab,
              ]}
              onPress={() => setSelectedGroup(item.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedGroup === item.key && styles.activeText,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>ঘাস (কেজি)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={grass}
            onChangeText={setGrass}
            placeholder="0"
          />

          <Text style={styles.label}>ভুসি (কেজি)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={bran}
            onChangeText={setBran}
            placeholder="0"
          />

          <Text style={styles.label}>দানাদার খাবার (কেজি)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={feed}
            onChangeText={setFeed}
            placeholder="0"
          />
        </View>

        {/* Cost Box */}
        <View style={styles.costBox}>
          <Text style={styles.costTitle}>খরচের হিসাব</Text>

          <View style={styles.row}>
            <Text>ঘাস</Text>
            <Text>{totalGrass.toFixed(2)} টাকা</Text>
          </View>

          <View style={styles.row}>
            <Text>ভুসি</Text>
            <Text>{totalBran.toFixed(2)} টাকা</Text>
          </View>

          <View style={styles.row}>
            <Text>দানাদার</Text>
            <Text>{totalFeed.toFixed(2)} টাকা</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalText}>মোট খরচ</Text>
            <Text style={styles.totalText}>{total.toFixed(2)} টাকা</Text>
          </View>
        </View>

        {/* Button */}
        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>সংরক্ষণ করুন</Text>
        </TouchableOpacity>

        {/* History */}
        <View style={styles.historyBox}>
          <Text style={styles.costTitle}>খাবারের ইতিহাস</Text>

          {history.map(item => (
            <View key={item.id} style={styles.historyItem}>
              <Text style={styles.historyText}>
                {getGroupName(item.group)} - {item.total} টাকা
              </Text>
              <Text style={styles.historySub}>{item.date}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ✅ Footer */}
      {/* <FooterNavigation /> */}
    </View>
  );
};

export default AddFood;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingBottom: 70, // ✅ footer fix
  },

  header: {
    backgroundColor: '#2e7d32',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },

  headerTitle: {
    color: 'white',
    fontSize: 16,
    marginLeft: 10,
    fontWeight: 'bold',
  },

  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    paddingHorizontal: 10,
  },

  tab: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
  },

  activeTab: {
    backgroundColor: '#2e7d32',
  },

  tabText: {
    color: '#333',
    fontSize: 14,
  },

  activeText: {
    color: 'white',
    fontWeight: 'bold',
  },

  form: {
    paddingHorizontal: 16,
  },

  label: {
    marginTop: 10,
    marginBottom: 5,
  },

  input: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },

  costBox: {
    backgroundColor: '#e8f5e9',
    margin: 16,
    padding: 15,
    borderRadius: 12,
  },

  costTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  totalText: {
    fontWeight: 'bold',
    color: '#2e7d32',
  },

  button: {
    backgroundColor: '#2e7d32',
    margin: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },

  historyBox: {
    margin: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
  },

  historyItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },

  historyText: {
    fontWeight: 'bold',
  },

  historySub: {
    color: '#666',
    fontSize: 12,
  },
});
