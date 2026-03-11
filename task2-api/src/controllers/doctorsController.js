const { doctors, slots } = require("../data/store");

// GET /doctors
// Query params: ?specialty=cardiology&city=hyderabad
function getDoctors(req, res) {
  const { specialty, city } = req.query;

  let result = [...doctors];

  if (specialty) {
    result = result.filter(
      (d) => d.specialty.toLowerCase() === specialty.toLowerCase()
    );
  }

  if (city) {
    result = result.filter(
      (d) => d.city.toLowerCase() === city.toLowerCase()
    );
  }

  return res.json({
    count: result.length,
    doctors: result,
  });
}

// GET /doctors/:id
function getDoctorById(req, res) {
  const doctor = doctors.find((d) => d.id === req.params.id);

  if (!doctor) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: `Doctor with id '${req.params.id}' not found.`,
    });
  }

  return res.json(doctor);
}

// GET /doctors/:id/slots
function getDoctorSlots(req, res) {
  const doctor = doctors.find((d) => d.id === req.params.id);

  if (!doctor) {
    return res.status(404).json({
      error: "NOT_FOUND",
      message: `Doctor with id '${req.params.id}' not found.`,
    });
  }

  const doctorSlots = slots[doctor.id] || [];

  return res.json({
    doctorId: doctor.id,
    doctorName: doctor.name,
    slots: doctorSlots.map(({ doctorId: _id, ...rest }) => rest), // strip internal doctorId
  });
}

module.exports = { getDoctors, getDoctorById, getDoctorSlots };
