const { validationResult } = require("express-validator");
const { doctors, slots, bookings } = require("../data/store");
const { generateBookingRef } = require("../utils");

// POST /bookings
function createBooking(req, res) {
  // Handle validation errors from middleware
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Invalid request body.",
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { doctorId, slotDatetime, patientName, patientPhone } = req.body;

  // Check doctor exists
  const doctor = doctors.find((d) => d.id === doctorId);
  if (!doctor) {
    return res.status(404).json({
      error: "DOCTOR_NOT_FOUND",
      message: `No doctor found with id '${doctorId}'.`,
    });
  }

  // Find the slot
  const doctorSlots = slots[doctorId] || [];
  const slot = doctorSlots.find((s) => s.datetime === slotDatetime);

  if (!slot) {
    return res.status(404).json({
      error: "SLOT_NOT_FOUND",
      message: `No slot found at '${slotDatetime}' for doctor '${doctorId}'.`,
    });
  }

  // Check for double booking (409 Conflict)
  if (slot.isBooked) {
    return res.status(409).json({
      error: "SLOT_ALREADY_BOOKED",
      message: "This slot has already been booked. Please choose another time.",
    });
  }

  // Mark slot as booked
  slot.isBooked = true;

  // Create booking record
  const booking = {
    bookingRef: generateBookingRef(),
    doctorId,
    doctorName: doctor.name,
    specialty: doctor.specialty,
    slotDatetime,
    duration: slot.duration,
    patientName,
    patientPhone,
    createdAt: new Date().toISOString(),
    status: "confirmed",
  };

  bookings.push(booking);

  return res.status(201).json({
    message: "Booking confirmed.",
    booking,
  });
}

// GET /bookings — list all (useful for testing)
function listBookings(req, res) {
  return res.json({ count: bookings.length, bookings });
}

module.exports = { createBooking, listBookings };
