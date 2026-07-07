// services/notificationService.js

import {
  addDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebaseConfig";

const COLLECTION_BY_AUDIENCE = {
  farm: "farm_notifications",
  buyer: "buyer_notifications",
};

const FILTER_FIELD_BY_AUDIENCE = {
  farm: "farm_id",
  buyer: "user_id",
};

/* ===========================================================
   Create Notification
=========================================================== */

export async function createNotification({
  audience,
  ownerId,
  type,
  title,
  body,
  data = {},
}) {
  const collectionName = COLLECTION_BY_AUDIENCE[audience];
  const filterField = FILTER_FIELD_BY_AUDIENCE[audience];

  if (!collectionName)
    throw new Error(`Unknown audience: ${audience}`);

  if (!ownerId)
    throw new Error("ownerId is required.");

  return await addDoc(collection(db, collectionName), {
    [filterField]: ownerId,

    type,
    title,
    body,
    data,

    is_read: false,

    created_at: serverTimestamp(),
  });
}

/* ===========================================================
   Subscribe
=========================================================== */

export function subscribeToNotifications(
  audience,
  ownerId,
  onChange,
  onError
) {
  const collectionName = COLLECTION_BY_AUDIENCE[audience];
  const filterField = FILTER_FIELD_BY_AUDIENCE[audience];

  const q = query(
    collection(db, collectionName),
    where(filterField, "==", ownerId),
    orderBy("created_at", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      onChange(items);
    },
    (err) => {
      console.error(err);
      onError?.(err);
    }
  );
}

/* ===========================================================
   Mark One Read
=========================================================== */

export async function markAsRead(audience, notificationId) {
  const collectionName = COLLECTION_BY_AUDIENCE[audience];

  await updateDoc(doc(db, collectionName, notificationId), {
    is_read: true,
  });
}

/* ===========================================================
   Mark All Read
=========================================================== */

export async function markAllAsRead(
  audience,
  notifications
) {
  const collectionName = COLLECTION_BY_AUDIENCE[audience];

  const unread = notifications.filter(
    (n) => !n.is_read
  );

  if (!unread.length) return;

  const batch = writeBatch(db);

  unread.forEach((n) => {
    batch.update(
      doc(db, collectionName, n.id),
      {
        is_read: true,
      }
    );
  });

  await batch.commit();
}

/* ===========================================================
   Delete Notification
=========================================================== */

export async function deleteNotification(
  audience,
  notificationId
) {
  const collectionName = COLLECTION_BY_AUDIENCE[audience];

  await deleteDoc(
    doc(db, collectionName, notificationId)
  );
}

/* ===========================================================
   Unread Count (Realtime)
=========================================================== */

export function subscribeUnreadCount(
  audience,
  ownerId,
  callback
) {
  const collectionName = COLLECTION_BY_AUDIENCE[audience];
  const filterField = FILTER_FIELD_BY_AUDIENCE[audience];

  const q = query(
    collection(db, collectionName),
    where(filterField, "==", ownerId),
    where("is_read", "==", false)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}