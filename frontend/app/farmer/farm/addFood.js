import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../../firebaseConfig';

const AddFood = () => {
  const router = useRouter();
  const [cows, setCows] = useState([]);
  const [selectedCowId, setSelectedCowId] = useState('');
  const [grass, setGrass] = useState('');
  const [bran, setBran] = useState('');
  const [feed, setFeed] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const grassCost = 2;
  const branCost = 30;
  const feedCost = 40;

  const totalGrass = Number(grass) * grassCost || 0;
  const totalBran = Number(bran) * branCost || 0;
  const totalFeed = Number(feed) * feedCost || 0;
  const total = totalGrass + totalBran + totalFeed;

  const selectedCow = cows.find((cow) => cow.id === selectedCowId) || null;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('ত্রুটি', 'অনুগ্রহ করে আগে লগইন করুন।');
        setCows([]);
        setHistory([]);
        return;
      }

      const userSnap = await getDocs(
        query(collection(db, 'users'), where('firebase_uid', '==', currentUser.uid)),
      );
      const userDoc = userSnap.docs[0];
      const userId = userDoc?.id || currentUser.uid;

      const farmsSnap = await getDocs(
        query(collection(db, 'farms'), where('farmer_id', '==', userId)),
      );
      const farmIds = farmsSnap.docs.map((doc) => doc.id);

      const cowSnapshots = await Promise.all(
        farmIds.map((farmId) =>
          getDocs(query(collection(db, 'cows'), where('farm_id', '==', farmId))),
        ),
      );

      const cowsList = cowSnapshots.flatMap((snapshot) =>
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          age_months: Number(doc.data().age_months ?? doc.data().ageMonths) || 0,
          weight_kg: Number(doc.data().weight_kg ?? doc.data().weightKg) || 0,
        })),
      );

      setCows(cowsList);
      if (!selectedCowId && cowsList.length > 0) {
        setSelectedCowId(cowsList[0].id);
      }

      if (cowsList.length === 0) {
        setHistory([]);
        return;
      }

      const historyCowId = selectedCowId || cowsList[0].id;
      const historySnap = await getDocs(
        query(collection(db, 'costs'), where('cow_id', '==', historyCowId), where('type', '==', 'feed')),
      );

      const loadedHistory = historySnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => String(b.cost_date || '').localeCompare(String(a.cost_date || '')));

      setHistory(loadedHistory);
    } catch (error) {
      console.log(error);
      Alert.alert('ত্রুটি', 'খাবারের তথ্য লোড করা যায়নি।');
    } finally {
      setLoading(false);
    }
  }, [selectedCowId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setGrass('');
    setBran('');
    setFeed('');
    if (selectedCowId) {
      loadData();
    }
  }, [selectedCowId]);

  const handleSave = async () => {
    if (!selectedCowId) return Alert.alert('ত্রুটি', 'একটি গরু নির্বাচন করুন।');
    if (total === 0) return Alert.alert('ত্রুটি', 'খাবারের পরিমাণ দিন।');

    try {
      setSaving(true);
      await addDoc(collection(db, 'costs'), {
        cow_id: selectedCowId,
        type: 'feed',
        amount: total,
        cost_date: new Date().toISOString().split('T')[0],
        note: `ঘাস ${grass || 0}kg, ভুসি ${bran || 0}kg, দানাদার ${feed || 0}kg`,
      });

      Alert.alert('✅ সফল', 'খাবারের খরচ সংরক্ষণ হয়েছে।');
      setGrass('');
      setBran('');
      setFeed('');
      loadData();
    } catch (error) {
      console.log(error);
      Alert.alert('ত্রুটি', 'খাবারের খরচ যোগ করা যায়নি।');
    } finally {
      setSaving(false);
    }
  };

  const getTitle = () => 'একক গরুর খাবার';

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getTitle()}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>গরু নির্বাচন করুন *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cowRow}>
            {cows.map((cow) => {
              const selected = selectedCowId === cow.id;
              return (
                <TouchableOpacity
                  key={cow.id}
                  style={[styles.cowChip, selected && styles.cowChipActive]}
                  onPress={() => setSelectedCowId(cow.id)}
                >
                  <Text style={styles.cowEmoji}>{cow.gender === 'female' ? '🐄' : '🐂'}</Text>
                  <Text style={[styles.cowName, selected && styles.cowNameActive]}>
                    {cow.name || cow.breed}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {cows.length === 0 && <Text style={styles.emptyText}>আগে গরু যোগ করুন</Text>}
          </ScrollView>

          {selectedCow && (
            <View style={styles.selectedCowBox}>
              <Text style={styles.selectedCowTitle}>{selectedCow.name || selectedCow.breed}</Text>
              <Text style={styles.selectedCowSub}>
                {selectedCow.breed} • {selectedCow.age_months} মাস • {selectedCow.weight_kg} কেজি
              </Text>
            </View>
          )}

          <Text style={styles.label}>ঘাস (কেজি)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={grass} onChangeText={setGrass} placeholder="0" />

          <Text style={styles.label}>ভুসি (কেজি)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={bran} onChangeText={setBran} placeholder="0" />

          <Text style={styles.label}>দানাদার খাবার (কেজি)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={feed} onChangeText={setFeed} placeholder="0" />
        </View>

        <View style={styles.costBox}>
          <Text style={styles.costTitle}>খরচের হিসাব</Text>
          <View style={styles.row}><Text>ঘাস</Text><Text>{totalGrass.toFixed(2)} টাকা</Text></View>
          <View style={styles.row}><Text>ভুসি</Text><Text>{totalBran.toFixed(2)} টাকা</Text></View>
          <View style={styles.row}><Text>দানাদার</Text><Text>{totalFeed.toFixed(2)} টাকা</Text></View>
          <View style={styles.totalRow}><Text style={styles.totalText}>মোট খরচ</Text><Text style={styles.totalText}>{total.toFixed(2)} টাকা</Text></View>
          <Text style={styles.note}>এই খরচ শুধু নির্বাচিত একক গরুর জন্য সেভ হবে।</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>সংরক্ষণ করুন</Text>}
        </TouchableOpacity>

        <View style={styles.historyBox}>
          <Text style={styles.costTitle}>এই গরুর খাবারের ইতিহাস</Text>
          {history.length === 0 ? (
            <Text style={styles.historySub}>এখনো কোনো খাবারের খরচ নেই।</Text>
          ) : history.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <Text style={styles.historyText}>{item.note || 'খাবার'} - {Number(item.amount || 0).toFixed(2)} টাকা</Text>
              <Text style={styles.historySub}>{item.cost_date}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default AddFood;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingBottom: 70,
  },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    backgroundColor: '#2e7d32',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    gap: 10,
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

  cowRow: {
    marginBottom: 10,
  },

  cowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
    marginRight: 8,
  },

  cowChipActive: {
    backgroundColor: '#2e7d32',
  },

  cowEmoji: {
    marginRight: 6,
  },

  cowName: {
    color: '#333',
    fontWeight: '600',
  },

  cowNameActive: {
    color: '#fff',
  },

  selectedCowBox: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },

  selectedCowTitle: {
    fontWeight: 'bold',
    color: '#1b5e20',
  },

  selectedCowSub: {
    color: '#2e7d32',
    marginTop: 2,
    fontSize: 12,
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

  note: {
    marginTop: 8,
    color: '#2e7d32',
    fontSize: 12,
  },
});
