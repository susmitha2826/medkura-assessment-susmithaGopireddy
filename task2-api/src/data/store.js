// ─── In-Memory Data Store ─────────────────────────────────
// Seeded with realistic Indian doctor data

const { addDays, formatISO } = require("./utils");

const doctors = [
  {
    id: "doc_001",
    name: "Dr. Priya Nair",
    specialty: "cardiology",
    city: "hyderabad",
    consultationFee: 1200,
    isVerified: true,
    averageRating: 4.8,
  },
  {
    id: "doc_002",
    name: "Dr. Rajesh Kumar",
    specialty: "cardiology",
    city: "hyderabad",
    consultationFee: 1500,
    isVerified: true,
    averageRating: 4.6,
  },
  {
    id: "doc_003",
    name: "Dr. Ananya Sharma",
    specialty: "orthopedics",
    city: "hyderabad",
    consultationFee: 1000,
    isVerified: true,
    averageRating: 4.9,
  },
  {
    id: "doc_004",
    name: "Dr. Suresh Reddy",
    specialty: "orthopedics",
    city: "bangalore",
    consultationFee: 1300,
    isVerified: false,
    averageRating: 4.2,
  },
  {
    id: "doc_005",
    name: "Dr. Meena Iyer",
    specialty: "neurology",
    city: "chennai",
    consultationFee: 1800,
    isVerified: true,
    averageRating: 4.7,
  },
  {
    id: "doc_006",
    name: "Dr. Vikram Patel",
    specialty: "oncology",
    city: "mumbai",
    consultationFee: 2000,
    isVerified: true,
    averageRating: 4.5,
  },
];

// Generate slots for next 7 days for each doctor
// 4 slots per day: 10:00, 11:00, 14:00, 16:00
function generateSlots(doctorId) {
  const slots = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const slotHours = [10, 11, 14, 16];

  for (let day = 0; day < 7; day++) {
    for (const hour of slotHours) {
      const dt = addDays(today, day);
      dt.setHours(hour, 0, 0, 0);
      slots.push({
        doctorId,
        datetime: formatISO(dt), // IST (+05:30)
        duration: hour === 14 ? 60 : 30, // afternoon slot is 60 min
        isBooked: false,
      });
    }
  }
  return slots;
}

// slots keyed by doctorId
const slots = {};
for (const doc of doctors) {
  slots[doc.id] = generateSlots(doc.id);
}

// bookings array
const bookings = [];

module.exports = { doctors, slots, bookings };
