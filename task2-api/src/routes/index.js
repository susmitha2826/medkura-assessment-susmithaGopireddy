const express = require("express");
const { body } = require("express-validator");
const { getDoctors, getDoctorById, getDoctorSlots } = require("../controllers/doctorsController");
const { createBooking, listBookings } = require("../controllers/bookingsController");

const router = express.Router();

// ─── Doctor Routes ────────────────────────────────────────
router.get("/doctors", getDoctors);
router.get("/doctors/:id", getDoctorById);
router.get("/doctors/:id/slots", getDoctorSlots);

// ─── Booking Routes ───────────────────────────────────────

// Validation rules for POST /bookings
const bookingValidation = [
  body("doctorId")
    .notEmpty().withMessage("doctorId is required.")
    .isString().withMessage("doctorId must be a string."),
  body("slotDatetime")
    .notEmpty().withMessage("slotDatetime is required.")
    .isISO8601().withMessage("slotDatetime must be a valid ISO 8601 datetime."),
  body("patientName")
    .notEmpty().withMessage("patientName is required.")
    .isLength({ min: 2, max: 100 }).withMessage("patientName must be between 2 and 100 characters."),
  body("patientPhone")
    .notEmpty().withMessage("patientPhone is required.")
    .matches(/^\+?[0-9\s\-]{7,15}$/).withMessage("patientPhone must be a valid phone number."),
];

router.post("/bookings", bookingValidation, createBooking);
router.get("/bookings", listBookings); // helper for testing

module.exports = router;
