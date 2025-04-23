const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  link: {
    type: String,
    required: true,
    unique: true
},
password: {
    type: String,
    default: null
},
isPasswordSet: {
    type: Boolean,
    default: false
},
    participants: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        joinedAt: Date,
        leftAt: Date
    }],
    startTime: { type: Date, default: Date.now },
    endTime: Date,
    duration: Number
}, { timestamps: true });

module.exports = mongoose.model('Meeting', meetingSchema);