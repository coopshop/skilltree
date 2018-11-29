// get an instance of mongoose and mongoose.Schema
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// set up a mongoose model and pass it using module.exports
module.exports = mongoose.model('Skill', new Schema({
    name: String,
    categoryName: String,
    skillIcon: String,
    description: String,
    pointDescription: [String],
    achievedPoint: Number,
    maxPoint: Number,
    parents: [String],
    children: [
        {
            name: String,
            minPoint: Number,
            recommended: Boolean
        }
    ],
    offers: [
        {
            username: String,
            contact: String,
            location: String,
            achievedPoint: Number
        }
    ]

}));
