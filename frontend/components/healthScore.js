/**
 * গরুর হেলথ স্কোর ক্যালকুলেট করার ফাংশন
 * @param {Object} data - গরুর স্বাস্থ্যের ডাটা
 * @returns {number} - ৬০ থেকে ১০০ এর মধ্যে হেলথ স্কোর
 */
export function calculateCowHealthScore(data) {
  let score = 100; // বেস স্কোর (Perfect Health)
  const today = new Date();

  // দিন হিসাব করার হেল্পার ফাংশন
  const getDaysLate = (dueDateStr) => {
    if (!dueDateStr) return 0;
    const dueDate = new Date(dueDateStr);
    const diffTime = today - dueDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)); // মিলিসেকেন্ড থেকে দিনে রূপান্তর
  };

  // ==========================================
  // ১. Vaccine Penalty (সর্বোচ্চ পেনাল্টি: -15)
  // ==========================================
  let vaccinePenalty = 0;
  if (data.vaccines && data.vaccines.length > 0) {
    data.vaccines.forEach((v) => {
      // যদি ভ্যাকসিন পেন্ডিং থাকে এবং আজকের দিনের চেয়ে ডিউ ডেট পার হয়ে যায়
      if (v.status === "pending") {
        const daysLate = getDaysLate(v.due_date);
        if (daysLate > 30) {
          vaccinePenalty = Math.max(vaccinePenalty, 15);
        } else if (daysLate >= 15) {
          vaccinePenalty = Math.max(vaccinePenalty, 10);
        }else if (daysLate >= 8) {
          vaccinePenalty = Math.max(vaccinePenalty, 6);
        } else if (daysLate >= 1) {
          vaccinePenalty = Math.max(vaccinePenalty, 3);
        }
      }
    });
  }

  // ==========================================
  // ২. Medicine Penalty (সর্বোচ্চ পেনাল্টি: -10)
  // ==========================================
  let medicinePenalty = 0;
  if (data.medicines && data.medicines.length > 0) {
    data.medicines.forEach((m) => {
      // যদি প্রিভেন্টিভ ওষুধ দেওয়া বাকি থাকে এবং ডিউ ডেট পার হয়ে যায়
      if (m.type === "preventive" && m.status === "pending") {
        const daysLate = getDaysLate(m.due_date);
        if (daysLate > 30) {v.status === "pending"
          medicinePenalty = Math.max(medicinePenalty, 10);
        } else if (daysLate >= 8) {
          medicinePenalty = Math.max(medicinePenalty, 5);
        } else if (daysLate >= 1) {
          medicinePenalty = Math.max(medicinePenalty, 2);
        }
      }
    });
  }

  // ==========================================
  // ৩. Disease History Penalty (সর্বোচ্চ পেনাল্টি: -10)
  // ==========================================
  let diseasePenalty = 0;
  if (data.diseases && data.diseases.length > 0) {
    data.diseases.forEach((d) => {
      if (d.status === "active") {
        diseasePenalty = Math.max(diseasePenalty, 10);
      } else if (d.status === "recovered") {
        diseasePenalty = Math.max(diseasePenalty, 5);
      }
    });
  }

  // ==========================================
  // ৪. Weight Penalty (সর্বোচ্চ পেনাল্টি: -5)
  // ==========================================
  let weightPenalty = 0;
  const expected = Number(data.expectedWeight) || 0;
  const actual = Number(data.actualWeight) || 0;

  if (expected > 0 && actual < expected) {
    const diffPercent = ((expected - actual) / expected) * 100;
    if (diffPercent > 20) {
      weightPenalty = 5;
    } else if (diffPercent >= 10) {
      weightPenalty = 2;
    }
  }

  // ==========================================
  // ফাইনাল স্কোর হিসাব (সর্বনিম্ন ৬০ এর নিচে নামবে না)
  // ==========================================
  const totalPenalty = vaccinePenalty + medicinePenalty + diseasePenalty + weightPenalty;
  score = score - totalPenalty;

  return Math.max(60, score);
}
