import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { auth, db } from "../../firebaseConfig";
import { useFarm } from "../../context/FarmContext";

// =====================================
// Add Farm Modal
// =====================================

function FarmFormModal({ visible, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [land, setLand] = useState("");

  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setDistrict("");
    setLand("");
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Farm name required");

      return;
    }

    try {
      setSaving(true);

      const user = auth.currentUser;

      if (!user) {
        Alert.alert("Error", "Please login first");

        return;
      }

      const farmCollection = collection(db, "farms"); // রুট কালেকশন

      await addDoc(farmCollection, {
        farmer_id: user.uid, // ফরেন কি (FK)
        name: name.trim(),
        district: district.trim(),
        total_land_bigha: land ? Number(land) : 0,
        created_at: serverTimestamp(),
      });

      Alert.alert("Success", "Farm added");

      reset();

      onSaved();

      onClose();
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Add New Farm</Text>

          <TextInput
            placeholder="Farm Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <TextInput
            placeholder="District"
            value={district}
            onChangeText={setDistrict}
            style={styles.input}
          />

          <TextInput
            placeholder="Total Land (Bigha)"
            value={land}
            onChangeText={setLand}
            keyboardType="numeric"
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// =====================================
// Farm Card
// =====================================

function FarmCard({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.farmName}>{item.name}</Text>

      <Text>District: {item.district}</Text>

      <Text>Land: {item.total_land_bigha} Bigha</Text>
    </TouchableOpacity>
  );
}
// =====================================
// Main Screen
// =====================================

export default function FarmsScreen() {
  const router = useRouter();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const { selectedFarm, setSelectedFarm } = useFarm();

  const loadFarms = useCallback(async () => {
    try {
      setLoading(true);

      const user = auth.currentUser;

      if (!user) {
        return;
      }
      const farmsRef = collection(db, "farms");
      const q = query(
        farmsRef,
        where("farmer_id", "==", user.uid), // শুধুমাত্র নিজের খামার ফিল্টার
        orderBy("created_at", "desc"),
      );

      const snapshot = await getDocs(q);

      const list = snapshot.docs.map((doc) => ({
        id: doc.id,

        ...doc.data(),
      }));

      setFarms(list);
    } catch (error) {
      console.log(error);

      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFarms();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>My Farms</Text>

        <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={farms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FarmCard
              item={item}
              onPress={() => {
                console.log("Before:", selectedFarm);

  setSelectedFarm(item);

  console.log("Clicked:", item);
                router.push(`./(tabs)/home`);
              }}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No farm added yet</Text>
          }
        />
      )}

      <FarmFormModal
        visible={modal}
        onClose={() => setModal(false)}
        onSaved={loadFarms}
      />
    </View>
  );
}

// =====================================
// Styles
// =====================================

const styles = StyleSheet.create({
  container: {
    flex: 1,

    padding: 20,

    backgroundColor: "#fff",
  },

  header: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: 20,
  },

  heading: {
    fontSize: 25,

    fontWeight: "bold",
  },

  addBtn: {
    width: 45,

    height: 45,

    borderRadius: 25,

    justifyContent: "center",

    alignItems: "center",

    backgroundColor: "#2e7d32",
  },

  addText: {
    fontSize: 30,

    color: "#fff",
  },

  card: {
    padding: 18,

    borderRadius: 12,

    backgroundColor: "#f2f2f2",

    marginBottom: 12,
  },

  farmName: {
    fontSize: 18,

    fontWeight: "bold",

    marginBottom: 8,
  },

  empty: {
    textAlign: "center",

    marginTop: 50,

    fontSize: 16,
  },

  overlay: {
    flex: 1,

    backgroundColor: "rgba(0,0,0,0.5)",

    justifyContent: "center",

    padding: 20,
  },

  modal: {
    backgroundColor: "#fff",

    padding: 25,

    borderRadius: 15,
  },

  modalTitle: {
    fontSize: 22,

    fontWeight: "bold",

    marginBottom: 20,
  },

  input: {
    borderWidth: 1,

    borderColor: "#ccc",

    borderRadius: 8,

    padding: 12,

    marginBottom: 12,
  },

  saveBtn: {
    backgroundColor: "#2e7d32",

    padding: 15,

    borderRadius: 8,

    alignItems: "center",
  },

  saveText: {
    color: "#fff",

    fontWeight: "bold",
  },

  cancel: {
    textAlign: "center",

    marginTop: 15,

    color: "red",
  },
});
