const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

exports.vaccineReminder = onSchedule(
  {
    schedule: "0 5 * * *", // প্রতিদিন সকাল ৮টা
    timeZone: "Asia/Dhaka",
  },
  async () => {
    const today = new Date().toISOString().split("T")[0];

    const vaccinesSnap = await db
      .collection("vaccines")
      .where("due_date", "==", today)
      .get();

    if (vaccinesSnap.empty) {
      console.log("No vaccine reminders today.");
      return;
    }

    const batch = db.batch();

    for (const vaccineDoc of vaccinesSnap.docs) {
      const vaccine = vaccineDoc.data();

      // Cow fetch
      const cowSnap = await db.collection("cows").doc(vaccine.cow_id).get();

      if (!cowSnap.exists) continue;

      const cow = cowSnap.data();

      const notificationRef = db.collection("farm_notifications").doc();

      batch.set(notificationRef, {
        farm_id: cow.farm_id,

        title: "💉 টিকা দেওয়ার সময় হয়েছে",

        body: `${cow.name} এর ${vaccine.vaccine_name} টিকা আজ দেওয়ার নির্ধারিত দিন।`,

        type: "vaccine",

        is_read: false,

        data: {
          cowId: vaccine.cow_id,
          vaccineId: vaccineDoc.id,
          vaccineName: vaccine.vaccine_name,
        },

        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    console.log("Vaccine reminders sent.");
  },
);
