const mongoose = require("mongoose");

const seasonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    trailer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video"
    },
    price: {
      ngn: {
        type: Number,
        default: 0,
      },
      usd: {
        type: Number,
        default: 0,
      },
      cad:{
        type:Number,
        default:0
      },
      eur:{
        type:Number,
        default:0
      },
      gbp:{
        type:Number,
        default:0
      }
    },
    free: {
      type: Boolean,
      default: false,
    },
    expirationSpan: {
      type: Number,
    },
    validViews: {
      type: Number,
    },
    image: {
      type: String,
      required: true,
    },
    banner: {
      type: String,
      required: true,
    },
    episodes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Episodes",
      },
    ],
    series: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series",
      required: true,
    },
    acquired: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      default: "Seasons",
    },
  },
  {
    timestamps: true, //important
  }
);

module.exports = mongoose.model("Seasons", seasonSchema);
